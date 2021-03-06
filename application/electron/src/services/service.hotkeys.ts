import Logger from '../tools/env.logger';
import Subscription from '../tools/subscription';
import Subject from '../tools/subject';
import ServiceElectron, { IPCMessages } from './service.electron';
import ServiceStreams from './service.streams';
import { IService } from '../interfaces/interface.service';
import { app, globalShortcut } from 'electron';

const CHotkeyMap = {
    [IPCMessages.EHotkeyActionRef.newTab]:                  { darwin: ['Cmd+T'],            other: ['Ctrl+T'] },
    [IPCMessages.EHotkeyActionRef.closeTab]:                { darwin: ['Cmd+W'],            other: ['Ctrl+w'] },
    [IPCMessages.EHotkeyActionRef.openTextFile]:            { darwin: ['Cmd+O'],            other: ['Ctrl+O'] },
    [IPCMessages.EHotkeyActionRef.openDltFile]:             { darwin: ['Cmd+D'],            other: ['Ctrl+D'] },
    [IPCMessages.EHotkeyActionRef.focusSearchInput]:        { darwin: ['Cmd+F', '/'],       other: ['Ctrl+F', '/'] },
    [IPCMessages.EHotkeyActionRef.openSearchFiltersTab]:    { darwin: ['Shift+Cmd+F'],      other: ['Shift+Ctrl+F'] },
    [IPCMessages.EHotkeyActionRef.selectNextRow]:           { darwin: ['Cmd+j', 'j'],       other: ['Ctrl+j', 'j'] },
    [IPCMessages.EHotkeyActionRef.selectPrevRow]:           { darwin: ['Cmd+k', 'k'],       other: ['Ctrl+k', 'k'] },
    [IPCMessages.EHotkeyActionRef.focusMainView]:           { darwin: ['Cmd+1'],            other: ['Ctrl+1'] },
    [IPCMessages.EHotkeyActionRef.focusSearchView]:         { darwin: ['Cmd+2'],            other: ['Ctrl+2'] },
    [IPCMessages.EHotkeyActionRef.sidebarToggle]:           { darwin: ['Cmd+B'],            other: ['Ctrl+B'] },
    [IPCMessages.EHotkeyActionRef.toolbarToggle]:           { darwin: ['Cmd+J'],            other: ['Ctrl+J'] },
    [IPCMessages.EHotkeyActionRef.showHotkeysMapDialog]:    {                               other: ['?'] },
};

const CInputRelatedHotkeys = [
    'j',
    'k',
    'J',
    'K',
    '/',
    '?',
];

export interface IServiceSubjects {
    openTextFile: Subject<void>;
    openDltFile: Subject<void>;
}

/**
 * @class ServiceHotkeys
 * @description Listens hotkeys
 */

class ServiceHotkeys implements IService {

    private _logger: Logger = new Logger('ServiceHotkeys');
    private _subscriptions: { [key: string ]: Subscription | undefined } = { };
    private _locked: boolean = false;
    private _subjects: IServiceSubjects = {
        openTextFile: new Subject('openTextFile'),
        openDltFile: new Subject('openDltFile'),
    };

    /**
     * Initialization function
     * @returns Promise<void>
     */
    public init(): Promise<void> {
        return new Promise((resolve) => {
            Promise.all([
                ServiceElectron.IPC.subscribe(IPCMessages.HotkeyResume, this._onHotkeyResume.bind(this)).then((subscription: Subscription) => {
                    this._subscriptions.onHotkeyResume = subscription;
                }),
                ServiceElectron.IPC.subscribe(IPCMessages.HotkeyPause, this._onHotkeyPause.bind(this, false)).then((subscription: Subscription) => {
                    this._subscriptions.onHotkeyPause = subscription;
                }),
                ServiceElectron.IPC.subscribe(IPCMessages.HotkeyInputOut, this._onHotkeyResume.bind(this)).then((subscription: Subscription) => {
                    this._subscriptions.onHotkeyInputOut = subscription;
                }),
                ServiceElectron.IPC.subscribe(IPCMessages.HotkeyInputIn, this._onHotkeyPause.bind(this, true)).then((subscription: Subscription) => {
                    this._subscriptions.onHotkeyInputIn = subscription;
                }),
            ]).then(() => {
                app.on('browser-window-blur', this._unbind.bind(this, false));
                app.on('browser-window-focus', this._bind.bind(this));
                this._bind();
                resolve();
            });
        });
    }

    public destroy(): Promise<void> {
        return new Promise((resolve) => {
            Object.keys(this._subscriptions).forEach((key: string) => {
                (this._subscriptions as any)[key].destroy();
            });
            resolve();
        });
    }

    public getName(): string {
        return 'ServiceHotkeys';
    }

    public getSubject(): IServiceSubjects {
        return this._subjects;
    }

    private _bind() {
        this._locked = false;
        Object.keys(CHotkeyMap).forEach((action: string) => {
            const all: any = (CHotkeyMap as any)[action];
            const keys: string[] = all[process.platform] !== undefined ? all[process.platform] : all.other;
            keys.forEach((shortcut: string) => {
                if (globalShortcut.isRegistered(shortcut)) {
                    return;
                }
                if (!globalShortcut.register(shortcut, this._send.bind(this, action, shortcut))) {
                    this._logger.warn(`Fail to register key "${shortcut}" for action "${action}" as shortcut.`);
                }
            });
        });
    }

    private _unbind(input: boolean = false) {
        if (!input) {
            globalShortcut.unregisterAll();
            this._locked = true;
        } else {
            CInputRelatedHotkeys.forEach((shortcut: string) => {
                globalShortcut.unregister(shortcut);
            });
        }
    }

    private _onHotkeyResume() {
        if (this._locked) {
            return;
        }
        this._bind();
    }

    private _onHotkeyPause(input: boolean = false) {
        this._unbind(input);
    }

    private _send(action: string, shortcut: string) {
        if ((this._subjects as any)[action] !== undefined) {
            (this._subjects as any)[action].emit();
        }
        ServiceElectron.IPC.send(new IPCMessages.HotkeyCall({
            session: ServiceStreams.getActiveStreamId(),
            unixtime: Date.now(),
            action: action,
            shortcut: shortcut,
        })).catch((error: Error) => {
            this._logger.error(error.message);
        });
    }

}

export default (new ServiceHotkeys());
