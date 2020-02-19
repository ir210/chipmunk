import * as Toolkit from 'chipmunk.client.toolkit';
import { IOptions } from '../common/interface.options';
import { Observable } from 'rxjs';
import { IDeviceState, IDeviceSession } from '../common/interface.deviceinfo';
import { ENotificationType } from 'chipmunk.client.toolkit';
export declare class Service extends Toolkit.APluginService {
    state: {
        [device: string]: IDeviceState;
    };
    savedSession: {
        [session: string]: IDeviceSession;
    };
    sessionConnected: {
        [session: string]: {
            [device: string]: IDeviceState;
        };
    };
    recentDevices: string[];
    private api;
    private session;
    private sessions;
    private _subscriptions;
    private _logger;
    private _openQueue;
    private _messageQueue;
    private _subjects;
    constructor();
    private _onAPIReady;
    private _onSessionOpen;
    private _onSessionClose;
    private _onSessionChange;
    getObservable(): {
        event: Observable<any>;
    };
    incomeMessage(): void;
    private _saveLoad;
    private emptyQueue;
    connect(options: IOptions): Promise<void>;
    disconnect(device: string): Promise<any>;
    requestDevices(): Promise<any>;
    startSpy(options: IOptions[]): Promise<any>;
    stopSpy(options: IOptions[]): Promise<any>;
    sendMessage(message: string, device: string): Promise<any>;
    popupButton(action: (boolean: any) => void): void;
    closePopup(popup: string): void;
    notify(caption: string, message: string, type: ENotificationType): void;
}
declare const _default: Service;
export default _default;
