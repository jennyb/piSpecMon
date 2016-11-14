import { Component, Input, ViewChild } from '@angular/core';
import { DataService } from './data.service';
import { WidgetComponent } from './widget.component';
import { Config } from './config';
import { User } from './user';
import { DatePipe } from './date.pipe';
import { FreqPipe } from './freq.pipe';
import { HZ_LABELS } from './constants';

declare var $;

@Component({
  selector: 'psm-scan',
  templateUrl: 'templates/scan.html',
  directives: [ WidgetComponent ],
  pipes: [ DatePipe, FreqPipe ]
})
export class ScanComponent {
  defaults: any;
  input: any;
  config: any;

  worker: any = { };
  monkey: any = { };

  units: any[] = [ ];

  // true when waiting for (real) status after startup or start/stop buttons pressed
  standby: boolean = true;

  allowRange: boolean = true;
  allowFreqs: boolean = false;

  @ViewChild(WidgetComponent) widgetComponent;
  @ViewChild('form') form;

  @Input() modes: any[] = [ ];
  @Input() user: User;

  @Input('status') set _status(status: any) {
    if (status == undefined) return;
    if (this.defaults != undefined) this.standby = false;
    this.worker = status.worker;
    this.monkey = status.monkey;
  }

  @Input('config') set _config(config: Config) {
    if (! this.defaults || this.worker.config_id) return;
    this.input = config;
    if (this.input == undefined) {
      this.widgetComponent.pristine(this.form, false);
      return;
    }
    this.config = $.extend(true, {}, this.defaults, this.input);
    this.allowRange = this.input.freqs.range != undefined;
    this.allowFreqs = this.input.freqs.freqs != undefined && this.input.freqs.freqs[0].f;
    this.widgetComponent.pristine(this.form);
  }

  constructor(private dataService: DataService) { }

  ngOnInit() {
    for (let value in HZ_LABELS) {
      this.units.push({ value: value, label: HZ_LABELS[value] });
    }
    if (this.user.roleIn(['admin', 'freq'])) {
      this.widgetComponent.busy(this.dataService.getScan())
                          .subscribe(defaults => {
                            this.defaults = defaults;
                            this.config = $.extend(true, { }, this.defaults);
                            this.widgetComponent.pristine(this.form);
                          });
    } else {
      this.standby = false;
    }
  }

  onReset() {
    if (this.input == undefined) this.input = this.defaults;
    this._config = this.input;
  }

  onStart() {
    this.standby = true;
    let config = $.extend(true, { }, this.config);
    if (! this.allowRange) {
      delete config.freqs.range;
    }
    if (! this.allowFreqs) {
      delete config.freqs.freqs;
    }
    this.widgetComponent.busy(this.dataService.startMonitor(config))
                        .subscribe();
  }

  onStop() {
    this.standby = true;
    this.widgetComponent.busy(this.dataService.stopMonitor())
                        .subscribe();
  }

  get loading() {
    return this.widgetComponent.loading;
  }

  numeric(v): boolean {
    return $.isNumeric(v);
  }

  validNumber(input): boolean {
    return (input.valid && $.isNumeric(input.model)) || input.pristine;
  }

  validRange(): boolean {
    return +(this.config.freqs.range[0]) + +(this.config.freqs.range[2]) <= +(this.config.freqs.range[1]);
  }

  validFreqs(): boolean {
    for (let freq of this.config.freqs.freqs) {
      if (! this.numeric(freq.f)) return false;
    }
    return true;
  }

  validScan(): boolean {
    return this.form.form.valid && ((this.validRange && this.validRange()) || (this.validFreqs && this.validFreqs()));
  }

  get running(): boolean {
    return this.worker.timestamp || this.monkey.timestamp;
  }

  onInsert(n: number) {
    let fs = this.config.freqs.freqs;
    fs.splice(n + 1, 0, { f: "", exp: fs[n].exp });
  }

  onDelete(n: number) {
    this.config.freqs.freqs.splice(n, 1);
  }
}