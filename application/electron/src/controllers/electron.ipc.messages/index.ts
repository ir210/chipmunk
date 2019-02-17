import { HostState, EHostState, IHostState } from './host.state';
export { HostState, EHostState, IHostState };

import { HostStateHistory } from './host.state.history';
export { HostStateHistory };

import { IRenderMountPlugin, RenderMountPlugin } from './render.plugin.mount';
export { IRenderMountPlugin, RenderMountPlugin };

import { IRenderState, RenderState, ERenderState } from './render.state';
export { IRenderState, RenderState, ERenderState };

import { IPluginMessage, PluginMessage } from './plugin.message';
export { IPluginMessage, PluginMessage };

// Common type for expected message implementation
export type TMessage =  HostState |
                        HostStateHistory |
                        RenderMountPlugin |
                        RenderState |
                        PluginMessage;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
* Mapping of host/render events
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  */
export const Map = {

    [HostState.signature            ]: HostState,
    [HostStateHistory.signature     ]: HostStateHistory,
    [RenderMountPlugin.signature    ]: RenderMountPlugin,
    [RenderState.signature          ]: RenderState,
    [PluginMessage.signature        ]: PluginMessage,

};