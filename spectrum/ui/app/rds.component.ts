import { Component, Input, ViewChild } from '@angular/core';
import { DataService } from './data.service';
import { WidgetComponent } from './widget.component';

@Component({
  selector: 'psm-rds',
  templateUrl: 'templates/rds.html',
  directives: [ WidgetComponent ]
})
export class RdsComponent {
  rds: any = { };

  @ViewChild(WidgetComponent) widgetComponent;
  @ViewChild('form') form;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.onReset();
  }

  //FIXME this is a repeat from other charts... can it go on Chart in chart.ts?
  timestamp: number;
  @Input('timestamp') set _timestamp(timestamp: number) {
    this.timestamp = timestamp;
    this.onReset();
  }

  onReset() {
    this.widgetComponent.busy(this.dataService.getRds())
                        .subscribe(rds => this.rds = rds);
    if (this.form) this.widgetComponent.pristine(this.form);
  }

  onSubmit() {
    this.widgetComponent.busy(this.dataService.setRds(this.rds))
                        .subscribe();
    this.widgetComponent.pristine(this.form);
  }

  get loading() {
    return this.widgetComponent.loading;
  }
}