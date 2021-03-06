import { Component, Input } from '@angular/core';
import { MessageService } from './message.service';
import { StateService } from './state.service';
import { Chart } from './chart';

@Component({
  selector: 'psm-sample-table',
  template: `<psm-widget [hidden]="isHidden" title="{{label}} - Audio Samples" class="chart" (show)="onShow($event)">
               <div *ngIf="data != undefined" class="chart-form">
                 <div class="form-group">
                   <label for="idx">Frequency</label>
                   <select class="form-control" [(ngModel)]="freq_n" name="idx">
                     <option *ngFor="let freq_n of freqs" [value]="freq_n">{{freq_n | freq:values}}</option>
                   </select>
                 </div>
               </div>
               <table *ngIf="data != undefined && data.samples[freq_n] && data.samples[freq_n].length > 0">
                 <tr>
                   <th>Timestamp (end)</th>
                   <th>Sample</th>
                   <th>File details</th>
                 </tr>
                 <ng-container *ngFor="let sample of data.samples[freq_n].slice().reverse()">
                   <tr *ngIf="sample != undefined">
                     <td>{{sample.timestamp | date}}</td>
                     <td>
                       <audio controls src="{{sample.path}}" preload="none"></audio>
                     </td>
                     <td>{{sample.filetype}} {{sample.filesize | bytes}}</td>
                   </tr>
                 </ng-container>
               </table>
               <div *ngIf="data != undefined && (! data.samples[freq_n] || data.samples[freq_n].length == 0)">
                 No audio samples recorded at selected frequency
               </div>
             </psm-widget>`
})
export class SampleTableComponent extends Chart {
  freqs: number[];
  freq_n: number;

  constructor(messageService: MessageService, stateService: StateService) { super(messageService, stateService, null, 'audio') }

  plot() {
    this.freqs = [];
    for (let freq_n in this.data.samples) {
      if (! Number.isNaN(+freq_n)) this.freqs.push(+freq_n); //FIXME NaN check because we added a length property!
    }
    if (this.freq_n == undefined && this.freqs.length > 0) this.freq_n = this.freqs[0];
  }

  get isHidden(): boolean {
    return this.data == undefined || this.values.audio.enabled == false || this.data.samples.length == 0;
  }
}
