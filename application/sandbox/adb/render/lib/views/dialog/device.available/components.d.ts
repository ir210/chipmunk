import { OnDestroy, ChangeDetectorRef, AfterViewInit, QueryList, ElementRef } from '@angular/core';
import { IDeviceInfo, IDeviceState } from '../../../common/interface.deviceinfo';
import { IOptions } from '../../../common/interface.options';
import { Observable } from 'rxjs';
interface IConnected {
    device: IDeviceInfo;
    options: IOptions;
    state: IDeviceState;
}
export declare class DialogAvailableDeviceComponent implements OnDestroy, AfterViewInit {
    private _cdRef;
    device: IDeviceInfo;
    ticker: {
        tick: Observable<boolean>;
    };
    connected: IConnected[];
    spyState: {
        [key: string]: number;
    };
    canvases: QueryList<ElementRef>;
    private _subscriptions;
    private _canvas;
    private _ctx;
    private _step;
    private _animation;
    private _read;
    private _chart;
    private _spark;
    private _destroyed;
    constructor(_cdRef: ChangeDetectorRef);
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    private _forceUpdate;
    private _formatLoad;
    _ng_isConnected(device: IDeviceInfo): boolean;
    _ng_read(device: IDeviceInfo): string;
    private _color;
    private _colorize;
    private _createChart;
    private _update;
}
export {};
