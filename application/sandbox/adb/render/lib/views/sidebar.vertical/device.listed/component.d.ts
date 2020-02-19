import { OnDestroy, ChangeDetectorRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { IDeviceInfo, IDeviceState } from '../../../common/interface.deviceinfo';
export declare class SidebarVerticalDeviceInfoComponent implements AfterViewInit, OnDestroy, OnChanges {
    private _cdRef;
    device: IDeviceInfo;
    state: IDeviceState;
    _ng_more: Array<{
        name: string;
        value: string;
    }>;
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
    private _updateSize;
    private _forceUpdate;
}
