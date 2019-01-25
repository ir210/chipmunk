import { IComponentDesc } from '../../support/dynamic/component';

export enum ETabsListDirection {
    top = 'top',
    left = 'left',
    right = 'right',
    bottom = 'bottom'
}

export interface IInjections {
    bar?: IComponentDesc;
}

export class TabsOptions {

    public direction: ETabsListDirection = ETabsListDirection.top;
    public minimized: boolean = false;
    public injections: IInjections | undefined;

    constructor(options?: {
        direction?: ETabsListDirection,
        minimized?: boolean,
        injections?: IInjections
    }) {
        options = options ? options : {};
        if (options.direction !== void 0) { this.direction = options.direction; }
        if (options.minimized !== void 0) { this.minimized = options.minimized; }
        if (options.injections !== void 0) { this.injections = options.injections; }
    }

}
