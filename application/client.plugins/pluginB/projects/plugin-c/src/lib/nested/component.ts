import { Component } from '@angular/core';

@Component({
  selector: 'lib-plugin-c-com',
  templateUrl: './template.html',
  styleUrls: ['./styles.less']
})

export class PluginCNestedComponent {

    public _items: string[] = ['fsdfsdfsd', 'fdsdfsdfsd'];

    constructor() {
        for (let i = 50; i >= 0; i -= 1) {
            this._items.push((new Date()).getTime().toString());
        }
        // console.log(this._items);
    }

}