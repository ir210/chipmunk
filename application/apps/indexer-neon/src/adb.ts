// Copyright (c) 2019 ESR Labs. All rights reserved.
//
// NOTICE:  All information contained herein is, and remains
// the property of ESR Labs and its suppliers, if any.
// The intellectual and technical concepts contained herein are
// proprietary to ESR Labs and its suppliers and may be covered
// by German and Foreign Patents, patents in process, and are protected
// by trade secret or copyright law.
// Dissemination of this information or reproduction of this material
// is strictly forbidden unless prior written permission is obtained
// from ESR Labs.
import { log } from "./logging";
import { AsyncResult, ITicks, INeonTransferChunk, INeonNotification, IChunk } from "./progress";
import { NativeEventEmitter, RustAdbIndexerChannel, EventEmitter } from "./emitter";
import { TimeUnit } from "./units";
import { CancelablePromise } from "./promise";
import { callbackify } from "util";

export interface AdbFilterConf {
    min_log_level?: String;
    tags?: Array<String>;
    message_patterns?: Array<String>;
}

export interface IIndexAdbParams {
    adbDevice: String;
    filterConfig?: AdbFilterConf;
    tag: String;
    out: String;
    chunk_size?: number;
    append: boolean;
    stdout: boolean;
    statusUpdates: boolean;
}

export interface IIndexAdbOptions {
}

export interface IIndexAdbOptionsChecked {
}


export type TIndexAdbAsyncEvents = 'chunk' | 'progress' | 'notification';
export type TIndexAdbAsyncEventChunk = (event: IChunk) => void;
export type TIndexAdbAsyncEventProgress = (event: ITicks) => void;
export type TIndexAdbAsyncEventNotification = (event: INeonNotification) => void;
export type TIndexAdbAsyncEventObject = TIndexAdbAsyncEventChunk | TIndexAdbAsyncEventProgress | TIndexAdbAsyncEventNotification;

export function indexAdbAsync(
    params: IIndexAdbParams,
    options?: IIndexAdbOptions,
): CancelablePromise<void, void, TIndexAdbAsyncEvents, TIndexAdbAsyncEventObject> {
    return new CancelablePromise<void, void, TIndexAdbAsyncEvents, TIndexAdbAsyncEventObject>((resolve, reject, cancel, refCancelCB, self) => {
        try {
            const opt = getDefaultIndexAdbProcessingOptions(options);

            refCancelCB(() => {
                log(`Get command "break" operation. Starting breaking.`);
                EventEmitter.requestShutdown();
            });

            const channel = new RustAdbIndexerChannel(
                params.adbDevice,
                params.tag,
                params.out,
                params.append,
                params.chunk_size,
                params.filterConfig,
            );

            const emitter = new NativeEventEmitter(channel);
            let chunks = 0;

            emitter.on(NativeEventEmitter.EVENTS.GotItem, (c: INeonTransferChunk) => {
                self.emit('chunk', {
                    byteStart: c.b[0],
                    bytesEnd: c.b[1],
                    rowStart: c.r[0],
                    rowsEnd: c.r[1],
                });
            });

            emitter.on(NativeEventEmitter.EVENTS.Progress, (ticks: ITicks) => {
                self.emit('progress', ticks);
            });

            emitter.on(NativeEventEmitter.EVENTS.Stopped, () => {
                log("we got a stopped event after " + chunks + " chunks");
                emitter.shutdownAcknowledged(() => {
                    log("shutdown completed");
                    cancel();
                });
            });

            emitter.on(NativeEventEmitter.EVENTS.Notification, (notification: INeonNotification) => {
                self.emit("notification", notification);
            });

            emitter.on(NativeEventEmitter.EVENTS.Finished, () => {
                log("we got a finished event " + chunks + " chunks");
                emitter.shutdownAcknowledged(() => {
                    log("shutdown completed");
                    resolve();
                });
            });

            self.finally(() => {
                log("processing adb indexing is finished");
            });
        } catch (err) {
            if (!(err instanceof Error)) {
                log("operation is stopped. Error isn't valid:");
                log(err);
                err = new Error("operation is stopped. Error isn't valid.");
            } else {
                log(`operation is stopped due error: ${err.message}`);
            }

            reject(err);
        }
    });
}

function getDefaultIndexAdbProcessingOptions(options: IIndexAdbOptions | undefined): IIndexAdbOptionsChecked {
    if (typeof options !== 'object' || options === null) {
        options = {};
    }

    return options as IIndexAdbOptionsChecked;
}
