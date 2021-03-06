import Logger from '../tools/env.logger';
import { dialog, SaveDialogReturnValue } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IService } from '../interfaces/interface.service';
import ServiceElectron, { IPCMessages, Subscription } from './service.electron';
import ServiceStorage, { IStorageScheme } from '../services/service.storage';

const MAX_NUMBER_OF_RECENT_FILES = 100;

/**
 * @class ServiceFilters
 * @description Just keep information about filters
 */

class ServiceFilters implements IService {

    private _logger: Logger = new Logger('ServiceFilters');
    private _subscriptions: { [key: string ]: Subscription | undefined } = { };

    /**
     * Initialization function
     * @returns Promise<void>
     */
    public init(): Promise<void> {
        return new Promise((resolve, reject) => {
            ServiceElectron.IPC.subscribe(IPCMessages.FiltersLoadRequest, this._ipc_onFiltersLoadRequest.bind(this)).then((subscription: Subscription) => {
                this._subscriptions.FiltersLoadRequest = subscription;
            }).catch((error: Error) => {
                this._logger.warn(`Fail to subscribe to render event "FiltersLoadRequest" due error: ${error.message}. This is not blocked error, loading will be continued.`);
            });
            ServiceElectron.IPC.subscribe(IPCMessages.FiltersSaveRequest, this._ipc_onFiltersSaveRequest.bind(this)).then((subscription: Subscription) => {
                this._subscriptions.FiltersSaveRequest = subscription;
            }).catch((error: Error) => {
                this._logger.warn(`Fail to subscribe to render event "FiltersSaveRequest" due error: ${error.message}. This is not blocked error, loading will be continued.`);
            });
            ServiceElectron.IPC.subscribe(IPCMessages.FiltersFilesRecentRequest, this._ipc_onFiltersRecentRequested.bind(this)).then((subscription: Subscription) => {
                this._subscriptions.FiltersFilesRecentRequest = subscription;
            }).catch((error: Error) => {
                this._logger.warn(`Fail to subscribe to render event "FiltersFilesRecentRequest" due error: ${error.message}. This is not blocked error, loading will be continued.`);
            });
            ServiceElectron.IPC.subscribe(IPCMessages.FiltersFilesRecentResetRequest, this._ipc_onFiltersFilesRecentResetRequested.bind(this)).then((subscription: Subscription) => {
                this._subscriptions.FiltersFilesRecentResetRequest = subscription;
            }).catch((error: Error) => {
                this._logger.warn(`Fail to subscribe to render event "FiltersFilesRecentResetRequest" due error: ${error.message}. This is not blocked error, loading will be continued.`);
            });
            resolve();
        });
    }

    public destroy(): Promise<void> {
        return new Promise((resolve) => {
            resolve();
        });
    }

    public getName(): string {
        return 'ServiceFilters';
    }

    private _ipc_onFiltersLoadRequest(message: IPCMessages.TMessage, response: (message: IPCMessages.TMessage) => Promise<void>) {
        const request: IPCMessages.FiltersLoadRequest = message as IPCMessages.FiltersLoadRequest;
        if (request.file === undefined) {
            dialog.showOpenDialog({
                properties: ['openFile', 'showHiddenFiles'],
                filters: [{ name: 'Text Files', extensions: ['txt']}],
            }, (files: string[] | undefined) => {
                if (!(files instanceof Array) || files.length !== 1) {
                    return;
                }
                const file: string = files[0];
                this._loadFile(file).then((filters: IPCMessages.IFilter[]) => {
                    this._saveAsRecentFile(file, filters.length);
                    response(new IPCMessages.FiltersLoadResponse({
                        filters: filters,
                        file: file,
                    }));
                }).catch((error: Error) => {
                    return response(new IPCMessages.FiltersLoadResponse({
                        filters: [],
                        file: file,
                        error: this._logger.warn(`Fail to open file "${file}" due error: ${error.message}`),
                    }));
                });
            });
        } else {
            this._loadFile(request.file).then((filters: IPCMessages.IFilter[]) => {
                this._saveAsRecentFile(request.file as string, filters.length);
                response(new IPCMessages.FiltersLoadResponse({
                    filters: filters,
                    file: request.file as string,
                }));
            }).catch((error: Error) => {
                return response(new IPCMessages.FiltersLoadResponse({
                    filters: [],
                    file: request.file as string,
                    error: this._logger.warn(`Fail to open file "${request.file}" due error: ${error.message}`),
                }));
            });
        }
    }

    private _ipc_onFiltersSaveRequest(message: IPCMessages.TMessage, response: (message: IPCMessages.TMessage) => Promise<void>) {
        const request: IPCMessages.FiltersSaveRequest = message as IPCMessages.FiltersSaveRequest;
        const content: string = JSON.stringify(request.filters);
        if (typeof request.file === 'string') {
            if (!fs.existsSync(request.file)) {
                request.file = undefined;
            }
        }
        if (typeof request.file === 'string') {
            this._saveFile(request.file, content).then(() => {
                this._saveAsRecentFile(request.file as string, request.filters.length);
                response(new IPCMessages.FiltersSaveResponse({
                    filename: request.file as string,
                }));
            }).catch((error: Error) => {
                this._logger.warn(`Error during saving filters into file "${request.file}": ${error.message}`);
                response(new IPCMessages.FiltersSaveResponse({
                    filename: request.file as string,
                    error: error.message,
                }));
            });
        } else {
            dialog.showSaveDialog({
                title: 'Saving filters',
                filters: [{ name: 'Text Files', extensions: ['txt']}],
            }).then((results: SaveDialogReturnValue) => {
                this._saveFile(results.filePath, content).then(() => {
                    this._saveAsRecentFile(results.filePath as string, request.filters.length);
                    response(new IPCMessages.FiltersSaveResponse({
                        filename: path.basename(results.filePath as string),
                    }));
                }).catch((error: Error) => {
                    this._logger.warn(`Error during saving filters into file "${results.filePath}": ${error.message}`);
                    response(new IPCMessages.FiltersSaveResponse({
                        filename: path.basename(results.filePath as string),
                        error: error.message,
                    }));
                });
            });
        }
    }

    private _ipc_onFiltersRecentRequested(message: IPCMessages.TMessage, response: (message: IPCMessages.TMessage) => Promise<void>) {
        this._validateRecentFiles().then((files: IStorageScheme.IRecentFilterFile[]) => {
            response(new IPCMessages.FiltersFilesRecentResponse({
                files: files,
            }));
        });
    }

    private _ipc_onFiltersFilesRecentResetRequested(message: IPCMessages.TMessage, response: (message: IPCMessages.TMessage) => Promise<void>) {
        ServiceStorage.get().set({
            recentFiltersFiles: [],
        });
        response(new IPCMessages.FiltersFilesRecentResetResponse({ }));
    }

    private _loadFile(file: string): Promise<IPCMessages.IFilter[]> {
        return new Promise((resolve, reject) => {
            fs.stat(file, (error: NodeJS.ErrnoException | null, stats: fs.Stats) => {
                if (error) {
                    return reject(error);
                }
                fs.readFile(file, (readingError: NodeJS.ErrnoException | null, data: Buffer | string) => {
                    if (readingError) {
                        return reject(readingError);
                    }
                    data = data.toString();
                    try {
                        const filters = JSON.parse(data);
                        if (!(filters instanceof Array)) {
                            return reject(new Error(`Fail to parse file "${file}" because content isn't an Array.`));
                        }
                        resolve(filters);
                    } catch (e) {
                        return reject(new Error(`Fail to parse file "${file}" due error: ${e.message}`));
                    }
                });
            });
        });
    }

    private _saveFile(filename: string | undefined, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (filename === undefined) {
                return reject(new Error(`Not valid name of file`));
            }
            fs.writeFile(filename, content, (error: NodeJS.ErrnoException | null) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    private _saveAsRecentFile(file: string, filters: number) {
        const stored: IStorageScheme.IStorage = ServiceStorage.get().get();
        const files: IStorageScheme.IRecentFilterFile[] = stored.recentFiltersFiles.filter((fileInfo: IStorageScheme.IRecentFilterFile) => {
            return fileInfo.file !== file;
        });
        if (files.length > MAX_NUMBER_OF_RECENT_FILES) {
            files.splice(files.length - 1, 1);
        }
        files.unshift({
            file: file,
            filename: path.basename(file),
            folder: path.dirname(file),
            timestamp: Date.now(),
            filters: filters,
        });
        ServiceStorage.get().set({
            recentFiltersFiles: files,
        });
        ServiceElectron.updateMenu();
    }

    private _validateRecentFiles(): Promise<IStorageScheme.IRecentFilterFile[]> {
        return new Promise((resolve) => {
            const stored: IStorageScheme.IStorage = ServiceStorage.get().get();
            const files: IStorageScheme.IRecentFilterFile[] = [];
            Promise.all(stored.recentFiltersFiles.map((file: IStorageScheme.IRecentFilterFile) => {
                return new Promise((resolveFile) => {
                    fs.access(file.file, fs.constants.F_OK, (err) => {
                        if (err) {
                            return resolveFile();
                        }
                        files.push(file);
                        resolveFile();
                    });
                });
            })).then(() => {
                if (files.length === stored.recentFiltersFiles.length) {
                    return resolve(files);
                }
                ServiceStorage.get().set({
                    recentFiltersFiles: files,
                });
                ServiceElectron.updateMenu();
                resolve(files);
            });
        });
    }

}

export default (new ServiceFilters());
