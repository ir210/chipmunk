import {Component, OnInit, ComponentFactoryResolver, ViewContainerRef, ChangeDetectorRef, ViewChild, EventEmitter, OnDestroy } from '@angular/core';

import { ViewControllerPattern                  } from '../controller.pattern';

import { events as Events                       } from '../../core/modules/controller.events';
import { configuration as Configuration         } from '../../core/modules/controller.config';

import { ViewInterface                          } from '../../core/interfaces/interface.view';

import { ViewClass                              } from '../../core/services/class.view';

import { localSettings, KEYs                    } from '../../core/modules/controller.localsettings';

import { Marker                                 } from './marker/interface.marker';
import { popupController                        } from '../../core/components/common/popup/controller';
import { MarkersEditDialog                      } from '../../core/components/common/dialogs/markers.edit/component';

const SETTINGS = {
    LIST_KEY    : 'LIST_KEY'
};

@Component({
    selector        : 'view-controller-markers',
    templateUrl     : './template.html'
})

export class ViewControllerMarkers extends ViewControllerPattern implements ViewInterface, OnInit, OnDestroy {

    public viewParams       : ViewClass             = null;
    public markers          : Array<Marker>         = [];

    ngOnInit(){
        this.viewParams !== null && super.setGUID(this.viewParams.GUID);
    }

    ngOnDestroy(){
        [   Configuration.sets.EVENTS_VIEWS.MARKS_VIEW_ADD,
            Configuration.sets.SYSTEM_EVENTS.MARKERS_GET_ALL,
            Configuration.sets.SYSTEM_EVENTS.MARKERS_CHANGED].forEach((handle: string)=>{
            Events.unbind(handle, this['on' + handle]);
        });
    }

    forceUpdate(){
        this.changeDetectorRef.detectChanges();
    }

    constructor(
        private componentFactoryResolver    : ComponentFactoryResolver,
        private viewContainerRef            : ViewContainerRef,
        private changeDetectorRef           : ChangeDetectorRef
    ){
        super();
        this.componentFactoryResolver   = componentFactoryResolver;
        this.viewContainerRef           = viewContainerRef;
        this.changeDetectorRef          = changeDetectorRef;
        [   Configuration.sets.EVENTS_VIEWS.MARKS_VIEW_ADD,
            Configuration.sets.SYSTEM_EVENTS.MARKERS_GET_ALL,
            Configuration.sets.SYSTEM_EVENTS.MARKERS_CHANGED].forEach((handle: string)=>{
            this['on' + handle] = this['on' + handle].bind(this);
            Events.bind(handle, this['on' + handle]);
        });
        this.loadMarkers();
        this.onMarkerChanges();
    }

    initMarker(marker : Marker){
        return {
            value           : marker.value,
            backgroundColor : marker.backgroundColor,
            foregroundColor : marker.foregroundColor,
            active          : marker.active,
            lineIsTarget    : marker.lineIsTarget !== void 0 ? marker.lineIsTarget : false,
            isRegExp        : marker.isRegExp !== void 0 ? marker.isRegExp : false,
            onChangeColor   : this.onMarkerColorChange.bind(this, marker.value),
            onRemove        : this.onMarkerRemove.bind(this, marker.value),
            onChangeState   : this.onMarkerChangeState.bind(this, marker.value),
            onChange        : this.onMarkerChange.bind(this, marker.value)
        }
    }

    onMarkerColorChange(hook: string, foregroundColor: string, backgroundColor: string){
        let index = this.getMarkerIndexByHook(hook);
        if (~index){
            this.markers[index].backgroundColor = backgroundColor;
            this.markers[index].foregroundColor = foregroundColor;
            this.onMarkerChanges();
            this.forceUpdate();
        }
    }

    onMarkerRemove(hook: string){
        let index = this.getMarkerIndexByHook(hook);
        if (~index){
            this.markers.splice(index, 1);
            this.onMarkerChanges();
            this.forceUpdate();
        }
    }

    onMarkerChangeState(hook: string, state: boolean){
        let index = this.getMarkerIndexByHook(hook);
        if (~index){
            this.markers[index].active = state;
            this.onMarkerChanges();
            this.forceUpdate();
        }
    }

    onMarkerChange(hook: string, updated: string, foregroundColor: string, backgroundColor: string, lineIsTarget: boolean, isRegExp: boolean){
        let index = this.getMarkerIndexByHook(hook);
        if (~index){
            if (!~this.getMarkerIndexByHook(updated)){
                this.markers[index] = this.initMarker({
                    value           : updated,
                    foregroundColor : foregroundColor,
                    backgroundColor : backgroundColor,
                    active          : this.markers[index].active,
                    lineIsTarget    : lineIsTarget,
                    isRegExp        : isRegExp
                });
            } else {
                this.markers[this.getMarkerIndexByHook(updated)].foregroundColor    = foregroundColor;
                this.markers[this.getMarkerIndexByHook(updated)].backgroundColor    = backgroundColor;
                this.markers[this.getMarkerIndexByHook(updated)].lineIsTarget       = lineIsTarget;
                this.markers[this.getMarkerIndexByHook(updated)].isRegExp           = isRegExp;
            }
            this.onMarkerChanges();
            this.forceUpdate();
        }
    }

    getMarkerIndexByHook(hook: string){
        let result = -1;
        this.markers.forEach((marker, index)=>{
            marker.value === hook && (result = index);
        });
        return result;
    }

    getActiveMarkers(){
        return this.markers
            .filter((marker)=>{
                return marker.active;
            })
            .map((marker)=>{
                return {
                    value           : marker.value,
                    foregroundColor : marker.foregroundColor,
                    backgroundColor : marker.backgroundColor,
                    lineIsTarget    : marker.lineIsTarget,
                    isRegExp        : marker.isRegExp,
                }
            });
    }

    onMARKS_VIEW_ADD(GUID: string | symbol){
        if (this.viewParams.GUID === GUID){
            let popup = Symbol();
            popupController.open({
                content : {
                    factory     : null,
                    component   : MarkersEditDialog,
                    params      : {
                        callback    : function(marker: Object){
                            if (!~this.getMarkerIndexByHook(marker['hook'])){
                                this.markers.push(this.initMarker({
                                    foregroundColor : marker['foregroundColor'],
                                    backgroundColor : marker['backgroundColor'],
                                    value           : marker['hook'],
                                    active          : true,
                                    lineIsTarget    : marker['lineIsTarget'],
                                    isRegExp        : marker['isRegExp']

                                }));
                            } else {
                                this.markers[this.getMarkerIndexByHook(marker['hook'])].foregroundColor = marker['foregroundColor'];
                                this.markers[this.getMarkerIndexByHook(marker['hook'])].backgroundColor = marker['backgroundColor'];
                                this.markers[this.getMarkerIndexByHook(marker['hook'])].lineIsTarget    = marker['lineIsTarget'];
                                this.markers[this.getMarkerIndexByHook(marker['hook'])].isRegExp        = marker['isRegExp'];
                            }
                            this.onMarkerChanges();
                            this.forceUpdate();
                            popupController.close(popup);
                        }.bind(this)
                    }
                },
                title   : _('Add marker'),
                settings: {
                    move            : true,
                    resize          : true,
                    width           : '40rem',
                    height          : '31rem',
                    close           : true,
                    addCloseHandle  : true,
                    css             : ''
                },
                buttons         : [],
                titlebuttons    : [],
                GUID            : popup
            });
        }
    }

    onMARKERS_GET_ALL(callback: Function){
        typeof callback === 'function' && callback(this.getActiveMarkers());
    }

    onMARKERS_CHANGED(markers: Array<Marker>){
        this.markers = markers.map((marker: Marker)=>{
            return this.initMarker(marker);
        });
        this.forceUpdate();
    }

    onMarkerChanges(){
        this.saveMarkers();
        Events.trigger(Configuration.sets.SYSTEM_EVENTS.MARKERS_UPDATED, this.getActiveMarkers());
    }

    loadMarkers(){
        let settings = localSettings.get();
        if (settings !== null && settings[KEYs.view_markers] !== void 0 && settings[KEYs.view_markers] !== null && settings[KEYs.view_markers][SETTINGS.LIST_KEY] instanceof Array){
            this.markers = settings[KEYs.view_markers][SETTINGS.LIST_KEY].map((marker : any)=>{
                return this.initMarker(marker);
            });
        }
    }

    saveMarkers(){
        localSettings.set({
            [KEYs.view_markers] : {
                [SETTINGS.LIST_KEY] : this.markers.map((marker)=>{
                    return {
                        value           : marker.value,
                        backgroundColor : marker.backgroundColor,
                        foregroundColor : marker.foregroundColor,
                        active          : marker.active,
                        lineIsTarget    : marker.lineIsTarget !== void 0 ? marker.lineIsTarget : false,
                        isRegExp        : marker.isRegExp !== void 0 ? marker.isRegExp : false,
                    };
                })
            }
        });
    }

    /*
    *                 backgroundColor : this.backgroundColor,
      : this.
    * */

}