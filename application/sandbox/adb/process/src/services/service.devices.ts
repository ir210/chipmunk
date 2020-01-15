import adb, {Client} from 'adbkit';
import Logger from '../env/env.logger';
import PluginIPCService from 'chipmunk.plugin.ipc';
import { IPCMessages } from 'chipmunk.plugin.ipc';
import { ERenderEvents } from '../consts/events';
import { IIOState, IOptions } from '../controllers/controller.adbdevices';

export interface IListeners {
    onData: (chunk: Buffer) => void;
    onError: (error: Error) => void;
    onDisconnect: () => void;
}

export interface IDeviceInfo {
    name: string;
}

export interface IDeviceState {
    ioState: IIOState,
    connections: number;
}

class ServiceDevices {
    private _adbClient: Client;
    private _listeners: Map<string, Map<string, IListeners>> = new Map();
    private _logger: Logger = new Logger('AdbDeviceManager');
    private _token: string | undefined;
    private _connectedDevicesState: {
        timer: any,
        attempts: number,
        state: { [key: string]: IDeviceState }
    } = {
            timer: -1,
            attempts: 0,
            state: {}
        };

    constructor() {
        this._adbClient = adb.createClient({});
    }

    public destroy(): Promise<void> {
        return new Promise((resolve) => {
            this._listeners.clear();
            // TODO: Close whatever we use to initiate logcat reads.
        });
    }

    public refDevice(sesion: string, options: IOptions, listeners: IListeners): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof options !== 'object' || options === null) {
                return reject(new Error(this._logger.error(`Fail to get device handler because options is not an object`)));
            }
            if (typeof options.name !== 'string' || options.name.trim() === '') {
                return reject(new Error(this._logger.error(`Fail to get device handler because "path" is incorrect: ${options.name}`)));
            }
        });
    }

    public unrefDevice(session: string, device: string): Promise<void> {
        return this._unrefDeviceListeners(session, device);
    }

    public write(device: string, chunk: Buffer | string): Promise<void> {
        return new Promise((resolve, reject) => {
            // TODO: Implement!
        });
    }

    public getList(): Promise<IDeviceInfo[]> {
        return new Promise((resolve, reject) => {
            this._adbClient.listDevices().then((devices) => {
                resolve(devices.map((d) => {
                    return { name: d.id };
                }));
            }).catch((error: Error | null | undefined) => {
                if (error) {
                    reject(new Error(this._logger.error(`Failed to get list of devices due to error: ${error.message}`)));
                } else {
                    reject(new Error(this._logger.error(`Failed to get list of devices due to an unknown error.`)));
                }
            });
        });
    }

    public create(device: string) {
        // TODO: Implement!
    }

    public setToken(token: string) {
        this._token = token;
    }

    private _close(device: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // TODO: Implement!
            return resolve();
        })
    }

    private _refDeviceListeners(session: string, device: string, listeners: IListeners): Promise<void> {
        return new Promise((resolve) => {
            let stored: Map<string, IListeners> | undefined = this._listeners.get(device);

            if (stored === undefined) {
                stored = new Map();
            }

            stored.set(session, listeners);
            this._listeners.set(device, stored);
            this._updateConnectedDevicesState();
            resolve();
        })
    }

    private _unrefDeviceListeners(session: string, device: string): Promise<void> {
        return new Promise((resolve) => {
            let stored: Map<string, IListeners> | undefined = this._listeners.get(device);
            if (stored === undefined) {
                return resolve();
            }
            stored.delete(session);
            if (stored.size === 0) {
                this._listeners.delete(device);
                return this._close(device).then(() => {
                    this._updateConnectedDevicesState();
                    resolve();
                });
            }

            this._listeners.set(device, stored);
            this._updateConnectedDevicesState();
            resolve();
        });
    }

    private _unrefDeviceAllListeners(device: string): Promise<void> {
        return new Promise((resolve) => {
            let stored: Map<string, IListeners> | undefined = this._listeners.get(device);
            this._listeners.delete(device);
            this._close(device).then(() => {
                this._updateConnectedDevicesState();
                if (stored !== undefined) {
                    Array.from(stored.keys()).forEach((session: string) => {
                    });
                }
                resolve();
            });
        })
    }

    private _onData(device: string, chunk: Buffer) {
        const listeners: Map<string, IListeners> | undefined = this._listeners.get(device);
        if (listeners === undefined) {
            return;
        }

        listeners.forEach((listeners: IListeners) => {
            listeners.onData(chunk);
        });
        this._updateConnectedDevicesState();
    }

    private _onError(device: string, error: Error) {
        const listeners: Map<string, IListeners> | undefined = this._listeners.get(device);
        if (listeners === undefined) {
            return;
        }

        listeners.forEach((listeners: IListeners) => {
            listeners.onError(error);
        });
        this._unrefDeviceAllListeners(device);
    }

    private _onDisconnect(device: string) {
        const listeners: Map<string, IListeners> | undefined = this._listeners.get(device);
        if (listeners === undefined) {
            return;
        }

        listeners.forEach((listeners: IListeners) => {
            listeners.onDisconnect();
        });

        this._unrefDeviceAllListeners(device);
    }

    private _getConnectionsCount(device: string) {
        const listeners: Map<string, IListeners> | undefined = this._listeners.get(device);
        if (listeners === undefined) {
            return 0;
        }

        return listeners.size;
    }

    private _updateConnectedDevicesState() {
        clearTimeout(this._connectedDevicesState.timer);
        this._connectedDevicesState.state = {};
        Object.keys(this._listeners).forEach((device) => {
            this._connectedDevicesState.state[device] = {
                connections: this._getConnectionsCount(device),
                ioState: { read: 0, written: 0 }, // TODO: Where do we put this IIOState instances?
            }
        });

        if (Object.keys(this._connectedDevicesState.state).length === 0) {
            return;
        }

        if (this._connectedDevicesState.attempts < 10) {
            this._connectedDevicesState.attempts += 1;
            this._connectedDevicesState.timer = setTimeout(() => {
                this._sendConnectedDevicesState();
            }, 250);
        } else {
            this._sendConnectedDevicesState();
        }
    }

    private _sendConnectedDevicesState() {
        if (typeof this._token !== 'string') {
            return;
        }

        this._connectedDevicesState.attempts = 0;
        PluginIPCService.sendToPluginHost('*', {
            event: ERenderEvents.state,
            streamId: '*',
            token: this._token,
            state: this._connectedDevicesState.state,
        });
    }
}

export default new ServiceDevices();