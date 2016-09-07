import { Component, Input, ViewChild } from '@angular/core';
import { DataService } from './data.service';
import { WidgetComponent } from './widget.component';
import { Config } from './config';
import { dt_format } from './d3_import';
import { DEFAULTS, HZ_LABELS } from './constants';

declare var $;

@Component({
  selector: 'psm-scan',
  templateUrl: 'templates/scan.html',
  directives: [ WidgetComponent ]
})
export class ScanComponent {
  @Input() modes: any[] = [ ];

  input: any;

  units: any[] = [ ];
  config: any;
  worker: any = { };
  monkey: any = { };

  // true when waiting for (real) status after startup or start/stop buttons pressed
  standby: boolean = true;

  @ViewChild(WidgetComponent) widgetComponent;
  @ViewChild('form') form;

  constructor(private dataService: DataService) { }

  @Input('status') set _status(status: any) {
    if (status == undefined) return;
    this.standby = false;
    this.worker = status.worker;
    this.monkey = status.monkey;
    if (this.worker.config_id) {
      // monitor is running
    }
  }

  @Input('config') set _config(config: Config) {
    if (this.worker.config_id) return;
    this.input = config;
    if (this.input == undefined) {
      this.widgetComponent.pristine(this.form, false);
      return;
    }
    this.config = $.extend(true, { }, this.input);
    this.widgetComponent.pristine(this.form);
  }

  ngOnInit() {
    for (let value in HZ_LABELS) {
      this.units.push({ value: value, label: HZ_LABELS[value] });
    }
    this.config = $.extend(true, { }, DEFAULTS);
    this.widgetComponent.pristine(this.form);
  }

  onReset() {
    if (this.input == undefined) this.input = DEFAULTS;
    this._config = this.input;
  }

  onStart() {
    this.standby = true;
    this.widgetComponent.busy(this.dataService.startMonitor(this.config))
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

  validNumber(input): boolean {
    return (input.valid && $.isNumeric(input.model)) || input.pristine;
  }

  validRange(): boolean {
    return +(this.config.freqs.range[0]) + +(this.config.freqs.range[2]) <= +(this.config.freqs.range[1]);
  }

  //FIXME a common function?
  time(t: number): string {
    if (! t) return undefined;
    return dt_format(new Date(t));
  }

  //FIXME this is quite a common function...
  freq(freq_n: number): string {
    let f = +this.config.freqs.range[0] + this.config.freqs.range[2] * freq_n;
    return `${f.toFixed(-Math.log10(this.config.freqs.range[2]))}${HZ_LABELS[this.config.freqs.exp]}`;
  }
}
