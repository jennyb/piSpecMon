import { Component, Input, ViewChild } from '@angular/core';
import { WidgetComponent } from './widget.component';
import { FREQUENCY_CHART_OPTIONS, HZ_LABELS } from './constants';
import { _d3 as d3, dt_format } from './d3_import';

@Component({
  selector: 'psm-frequency',
  directives: [ WidgetComponent ],
  template: `<psm-widget [hidden]="isHidden()" title="Level / Frequency" class="chart">
               <form class="form-inline" role="form">
                 <span *ngIf="sweep == 'latest'">{{timestamp}}</span>
                 <div class="form-group">
                   <select class="form-control" [(ngModel)]="sweep" (ngModelChange)="ngOnChanges()" name="sweep">
                     <option default value="latest">Latest sweep</option>
                     <option value="avg">Average</option>
                     <option value="max">Maximum</option>
                     <option value="min">Minimum</option>
                   </select>
                 </div>
               </form>
               <svg #chart
                 viewBox="0 0 ${FREQUENCY_CHART_OPTIONS.width} ${FREQUENCY_CHART_OPTIONS.height}"
                 preserveAspectRatio="xMidYMid meet">
               </svg>
             </psm-widget>`
})
export class FrequencyComponent {
  sweep: string = 'latest';
  timestamp: number;

  svg: any;
  line: any;
  x: any;
  y: any;
  xAxis: any;
  yAxis: any;
  height: number;
  width: number;

  @Input() freqs: any;
  @Input() data: any;

  @ViewChild('chart') chart;

  constructor() { }

  ngOnInit() {
    let margin = FREQUENCY_CHART_OPTIONS.margin;
    this.width = FREQUENCY_CHART_OPTIONS.width - margin.left - margin.right,
    this.height = FREQUENCY_CHART_OPTIONS.height - margin.top - margin.bottom;

    this.x = d3.scale.linear().range([0, this.width]);
    this.y = d3.scale.linear().range([this.height, 0]);

    this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
    this.yAxis = d3.svg.axis().scale(this.y).orient("left");

    this.line = d3.svg.line().interpolate("monotone")
                  .y(d => this.y(d.v))
                  .defined(d => d.v != null);

    this.svg = d3.select(this.chart.nativeElement)
                 .append("g")
                 .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  }

  isHidden() {
    return this.data.agg == undefined || this.freqs.freqs || this.data.agg[this.sweep].length == 0;
  }

  ngOnChanges() {
    if (! this.svg) return; // ngOnChanges() happens before ngOnInit()!
    this.svg.selectAll("*").remove();

    if (this.isHidden()) return;

    this.timestamp = dt_format(new Date(this.data.levels[this.data.levels.length - 1].fields.timestamp[0]));
    let agg = this.data.agg[this.sweep];

    this.x.domain([this.freqs.range[0], this.freqs.range[1]]);
    if (FREQUENCY_CHART_OPTIONS.y_axis) {
      this.y.domain([FREQUENCY_CHART_OPTIONS.y_axis[0], FREQUENCY_CHART_OPTIONS.y_axis[1]]);
      this.yAxis.tickValues(d3.range(FREQUENCY_CHART_OPTIONS.y_axis[0], FREQUENCY_CHART_OPTIONS.y_axis[1] + FREQUENCY_CHART_OPTIONS.y_axis[2], FREQUENCY_CHART_OPTIONS.y_axis[2]));
    } else {
      this.y.domain(d3.extent(agg, d => d.v));
    }

    this.line.x((d, i) => this.x(+this.freqs.range[0] + i * this.freqs.range[2]));

    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")
        .call(this.xAxis)
        .append("text")
        .attr("transform", "translate(" + this.width + ",0)")
        .attr("x", 40)
        .attr("y", 6)
        .style("text-anchor", "end")
        .text(HZ_LABELS[this.freqs.exp]);

    this.svg.append("g")
        .attr("class", "y axis")
        .call(this.yAxis)
        .append("text")
        .attr("x", -10)
        .attr("y", -10)
        .text("dB");

    this.svg.append("path")
        .datum(agg)
        .attr("class", "line")
        .attr("d", this.line);
  }
}
