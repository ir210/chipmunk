import { OnDestroy, ChangeDetectorRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { IDeviceInfo, IDeviceState } from '../../../common/interface.deviceinfo';
import { IOptions } from '../../../common/interface.options';
export declare class SidebarVerticalDeviceConnectedComponent implements AfterViewInit, OnDestroy, OnChanges {
    private _cdRef;
    device: IDeviceInfo;
    options: IOptions;
    state: IDeviceState;
    onDisconnect: () => void;
    _ng_read: string;
    private _subscriptions;
    private _destroyed;
    private _more;
    constructor(_cdRef: ChangeDetectorRef);
    ngOnDestroy(): void;
    ngAfterViewInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    _ng_isMoreOpened(): boolean;
    _ng_onMore(event: MouseEvent): void;
    _ng_onDisconnect(): void;
    private _updateSize;
    private _forceUpdate;
}
