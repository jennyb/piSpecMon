import { Component } from '@angular/core';
import { DataService } from './data.service';
import { StateService } from './state.service';
import { StatusService } from './status.service';

@Component({
  selector: 'psm-process',
  template: `<psm-widget title="Processes">
                 <!--FIXME clearly some generalisation can occur here-->
                 <div *ngIf="rds && (rds.timestamp || rds.error)" [ngClass]="{ status: true, error: rds.error != undefined }">
                   <h2>{{label('rds')}} <ng-container *ngIf="rds.timestamp">at {{rds.timestamp | date}}</ng-container></h2>
                   <span *ngIf="rds.sweep">Scan {{rds.sweep.sweep_n + 1}} started at {{rds.sweep.timestamp | date}}</span>
                   <span *ngIf="rds.freq_n != undefined && values != undefined">Receiving on {{rds.freq_n | freq:values.rds}}</span>
                   <span *ngIf="rds.strength != undefined">Strength: {{rds.strength}}</span>
                   <span *ngIf="rds.name">Station name: {{rds.name}}</span>
                   <span *ngIf="rds.text"><i>{{rds.text}}</i></span>
                   <span *ngIf="rds.error">{{rds.error}}</span>
                 </div>
                 <div *ngIf="hamlib && (hamlib.timestamp || hamlib.error)" [ngClass]="{ status: true, error: hamlib.error != undefined }">
                   <h2>{{label('hamlib')}} <ng-container *ngIf="hamlib.timestamp">at {{hamlib.timestamp | date}}</ng-container></h2>
                   <div *ngIf="hamlib.sweep">
                     <span>Scan {{hamlib.sweep.sweep_n + 1}} started at {{hamlib.sweep.timestamp | date}}</span>
                     <span *ngFor="let peak of hamlib.sweep.peaks">Peak {{peak.strength}}dB at {{peak.freq_n | freq:values.hamlib}}</span>
                     <span *ngIf="hamlib.sweep.previous">{{hamlib.sweep.previous.strength}}dB at {{hamlib.sweep.previous.freq_n | freq:values.hamlib}}</span>
                     <span *ngIf="hamlib.sweep.current">Reading strength at {{hamlib.sweep.current.freq_n | freq:values.hamlib}}...</span>
                     <span *ngIf="hamlib.sweep.record">Recording audio sample at {{hamlib.sweep.record.freq_n | freq:values.hamlib}}...</span>
                   </div>
                   <span *ngIf="hamlib.error">{{hamlib.error}}</span>
                 </div>
                 <div *ngIf="ams && (ams.timestamp || ams.error)" [ngClass]="{ status: true, error: ams.error != undefined }">
                   <h2>{{label('ams')}} <ng-container *ngIf="ams.timestamp">at {{ams.timestamp | date}}</ng-container></h2>
                   <div *ngIf="ams.sweep">
                     <span>Scan {{ams.sweep.sweep_n + 1}} started at {{ams.sweep.timestamp | date}}</span>
                     <span *ngFor="let peak of ams.sweep.peaks">Peak {{peak.strength}}dB at {{peak.freq_n | freq:values.ams}}</span>
                   </div>
                   <span *ngIf="ams.error">{{ams.error}}</span>
                 </div>
                 <div *ngIf="sdr && (sdr.timestamp || sdr.error)" [ngClass]="{ status: true, error: sdr.error != undefined }">
                   <h2>{{label('sdr')}} <ng-container *ngIf="sdr.timestamp">at {{sdr.timestamp | date}}</ng-container></h2>
                   <div *ngIf="sdr.sweep">
                     <span>Scan {{sdr.sweep.sweep_n + 1}} started at {{sdr.sweep.timestamp | date}}</span>
                     <span>Current range {{sdr.sweep.freq_0}} - {{sdr.sweep.freq_1}} MHz</span>
                     <span>Max strength {{sdr.sweep.max}}</span>
                   </div>
                   <span *ngIf="sdr.error">{{sdr.error}}</span>
                 </div>
                 <div class="form-group">
                   <div *ngFor="let worker of workers">
                     <input [disabled]="running || ! workerAvailable(worker)" type="checkbox" class="toggle" [(ngModel)]="worker.enabled" [name]="worker.value"/>
                     <label [attr.for]="worker.value">{{worker.label}}</label>
                   </div>
                   <div [hidden]="validWorkers" class="alert alert-danger">
                     At least one worker must be selected to start a job
                   </div>
                   <label for="description">Description</label>
                   <input [disabled]="running" type="text" class="form-control" [(ngModel)]="description" name="description"/>
                 </div>
                 <button (click)="onStart()" class="btn btn-default" [disabled]="! showStart">Start</button>
                 <button (click)="onStop()" class="btn btn-default" [disabled]="! showStop">Stop</button>
             </psm-widget>`,
  styles: ["button { margin-bottom: 10px }"]
})
export class ProcessComponent {
  private status: any = {};

  private description: string;
  private workers: any[] = [];

  constructor(private dataService: DataService,
              private stateService: StateService,
              statusService: StatusService) {
    statusService.subscribe(status => {
      this.status = status;
      for (let worker of this.workers) {
        if (! this.workerAvailable(worker)) worker.enabled = false;
      }
    });
  }

  ngOnInit() {
    this.workers = this.stateService.getWorkers();
  }

  // return the config values of the currently running job (if any)
  private get values(): any {
    return this.stateService.runningConfig != undefined ? this.stateService.runningConfig.values : undefined;
  }

  private workerAvailable(worker: any): boolean {
    return this.status[worker.value] != undefined && this.status[worker.value].error == undefined;
  }

  private label(value: string): string {
    let worker = this.workers.find(w => w.value == value);
    return worker != undefined ? worker.label : '[unknown worker]';
  }

  //FIXME erk
  get rds(): any {
    return this.status['rds'];
  }
  get hamlib(): any {
    return this.status['hamlib'];
  }
  get ams(): any {
    return this.status['ams'];
  }
  get sdr(): any {
    return this.status['sdr'];
  }

  get running(): boolean {
    return this.stateService.runningConfig != undefined;
  }

  get validWorkers(): boolean {
    return this.workers.filter(w => w.enabled).length > 0;
  }

  get showStart(): boolean {
    if (! this.validWorkers) return false;
    return ! this.running && this.stateService.isPristine;
  }

  get showStop(): boolean {
    return this.running;
  }

  onStart() {
//    this.standby = true;
    let workers = this.workers.filter(w => w.enabled).map(w => w.value);
    this.dataService.start(workers, this.description)
                    .subscribe();
  }

  onStop() {
//    this.standby = true;
    this.dataService.stop()
                    .subscribe();
  }
}
