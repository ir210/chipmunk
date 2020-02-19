import { ChangeDetectorRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { IDeviceInfo, IDeviceState } from '../../common/interface.deviceinfo';
import { IOptions } from '../../common/interface.options';
import { Observable } from 'rxjs';
interface IConnected {
    device: IDeviceInfo;
    options: IOptions;
    state: IDeviceState;
}
export declare class SidebarVerticalDeviceDialogComponent implements OnInit, OnDestroy, AfterViewInit {
    private _cdRef;
    _onConnect: () => void;
    _requestDeviceList: () => IDeviceInfo[];
    _getSelected: (IDeviceInfo: any) => void;
    _options: IOptions[];
    _ng_canBeConnected: () => boolean;
    _ng_connected: IConnected[];
    _ng_onOptions: () => void;
    _ng_onDeviceSelect: (device: IDeviceInfo) => void;
    private _interval;
    private _timeout;
    private _subscriptions;
    private _destroyed;
    private _subjects;
    _ng_devices: IDeviceInfo[];
    _ng_selected: IDeviceInfo | undefined;
    _ng_busy: boolean;
    _ng_error: string | undefined;
    _ng_spyState: {
        [key: string]: number;
    };
    constructor(_cdRef: ChangeDetectorRef);
    ngOnInit(): void;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    onTick(): {
        tick: Observable<boolean>;
    };
    private _next;
    private _onSpyState;
    private _forceUpdate;
    _ng_onConnect(device?: IDeviceInfo): void;
    _ng_isDeviceSelected(device: IDeviceInfo): boolean;
    _ng_getState(device: IDeviceInfo): IDeviceState;
}
export {};
