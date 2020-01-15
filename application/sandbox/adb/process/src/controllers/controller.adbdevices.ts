import Logger from '../env/env.logger';
import { EventEmitter } from 'events';

export interface IDeviceOptions {

}

export interface IOptions {
    name: string;
}

export interface IIOState {
    read: number;
    written: number;
}

