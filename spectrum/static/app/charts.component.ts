import { Component, Input, ViewChild } from '@angular/core';
import { SweepComponent } from './sweep.component';
import { RangeComponent } from './range.component';
import { FrequencyComponent } from './frequency.component';
import { LevelComponent } from './level.component';
import { WaterfallComponent } from './waterfall.component';
import { RdsTableComponent } from './rds-table.component';
import { DataService } from './data.service';
import { Config } from './config';
import { MAX_N, CHART_HEIGHT } from './constants';

@Component({
  selector: 'psm-charts',
  templateUrl: 'templates/charts.html',
  directives: [ RangeComponent, FrequencyComponent, LevelComponent, WaterfallComponent, RdsTableComponent ]
})
export class ChartsComponent {
  data: any = { };
  avg_time: number;
  audio: any = { };
  rdsNames: any = { };
  rdsText: any = { };

  config: Config;

  @Input() status: any;

  @Input('config') set _config(config: Config) {
    this.config = config;
    this.data = { };
    this.rdsNames = { };
    this.rdsText = { };
  }

  constructor(private dataService: DataService) { }

  show(range: number[]) {
    if (! range) {
      this.data = { };
      this.audio = { };
    } else {
      this.dataService.getSpectrumData(this.config.config_id, range)
                      .subscribe(data => this.mapData(data));
      this.dataService.getAudioData(this.config.config_id, range)
                      .subscribe(audio => this.mapAudio(audio));
      this.dataService.getRdsNameData(this.config.config_id, range)
                      .subscribe(data => this.mapRdsNames(data));
      this.dataService.getRdsTextData(this.config.config_id, range)
                      .subscribe(data => this.mapRdsText(data));
    }
  }

  private fillArray(v?: any, size?: number) {
    if (size == null) size = MAX_N;
    let a = [];
    for (let n = 0; n < size; ++n) {
      a.push(v);
    }
    return a;
  }

  mapAudio(audio: any[]) {
    // want this.audio to be a lookup like this.audio[{sweep_n}_{freq_n}] = Object
    this.audio = { length: audio.length };
    for (let a of audio) {
      this.audio[`${a.fields.sweep_n[0]}_${a.fields.freq_n[0]}`] = {
        config_id: a.fields.config_id[0],
        sweep_n: a.fields.sweep_n[0],
        freq_n: a.fields.freq_n[0],
        timestamp: a.fields.timestamp[0]
      };
    }
  }

  mapRdsNames(docs: any[]) {
    this.rdsNames = { };
    for (let doc of docs) {
      this.rdsNames[doc.fields.idx] = doc.fields.name;
    }
  }

  mapRdsText(docs: any[]) {
    this.rdsText = { };
    for (let doc of docs) {
      let idx = doc.fields.idx;
      if (this.rdsText[idx] == undefined) this.rdsText[idx] = [];
      this.rdsText[idx].push({ 'timestamp': +doc.fields.timestamp, 'text': doc.fields.text });
    }
  }

  mapData(data) {
    var interval = data.length / CHART_HEIGHT;

    this.data = {
                  levels: [],
                  agg: { latest: [], min: [], max: [], avg: [] },
                  freq_idxs: { 'min': this.fillArray(), 'max': this.fillArray(), 'avg': this.fillArray() }
                };
    delete this.avg_time;

    /* also compute sweep time */
    let total_time = 0.0; //FIXME can this move inside the next scope?

    if (data.length > 0) {
      for (let freq_idx in data[data.length - 1].fields.level) {
        // take into account failed readings (level -128)
        let level = data[data.length - 1].fields.level[freq_idx];
        this.data.agg['latest'][freq_idx] = { idx: freq_idx, v: level != -128 ? level : null };
      }
      let level_idx = 0, count = null;
      for (let sweep_idx in data) {
        let length = data[sweep_idx].fields.level.length;
        total_time += data[sweep_idx].fields.totaltime[0];

        if (! this.data.levels[level_idx]) {
          this.data.levels[level_idx] = {
            fields: {
              level: this.fillArray(0, length),
              timestamp: data[sweep_idx].fields.timestamp[0],
              sweep_n: data[sweep_idx].fields.n[0]
            }
          };
          count = this.fillArray(0, data[sweep_idx].fields.level.length);
        }

        for (let freq_idx in data[sweep_idx].fields.level) {
          let level = data[sweep_idx].fields.level[freq_idx];
          if (level == -128) {
            // failed reading, remove from data
            data[sweep_idx].fields.level[freq_idx] = null;
            continue;
          }
          if (this.data.agg['min'][freq_idx] == null || level < this.data.agg['min'][freq_idx].v) {
            this.data.agg['min'][freq_idx] = { idx: freq_idx, v: level };
          }
          if (this.data.agg['max'][freq_idx] == null || level > this.data.agg['max'][freq_idx].v) {
            this.data.agg['max'][freq_idx] = { idx: freq_idx, v: level };
          }
          if (this.data.agg['avg'][freq_idx] == null) {
            this.data.agg['avg'][freq_idx] = { idx: freq_idx, v: 0 };
          }
          this.data.agg['avg'][freq_idx].v += level / data.length;

          this.data.levels[level_idx].fields.level[freq_idx] += level;
          ++count[freq_idx];
        }

        if (+sweep_idx >= (level_idx + 1) * interval - 1 || +sweep_idx == length - 1) {
          for (let freq_idx in data[sweep_idx].fields.level) {
            if (count[freq_idx] > 0) {
              this.data.levels[level_idx].fields.level[freq_idx] /= count[freq_idx];
            } else {
              this.data.levels[level_idx].fields.level[freq_idx] = -128; // no reading
            }
          }

          ++level_idx;
          count = null;
        }
      }

      this.avg_time = total_time / (1000 * data.length);

      /* find top N by avg, min and max */
      for (let x in this.data.freq_idxs) {
        // see if it beats any, if so swap and keep looking down the list... drop off end and gets kicked out
        for (let _idx in this.data.agg[x]) {
          let idx = +_idx;

          let v = this.data.agg[x][idx].v;

          if (idx > 0 && idx + 1 < this.data.agg[x].length) {
            if (this.data.agg[x][idx - 1].v >= v || v < this.data.agg[x][idx + 1].v) {
              continue;
            }
          }

          let i: number = idx; //FIXME needed??
          // try slotting in our value
          for (let n: number = 0; n < MAX_N; ++n) {
            let slot_idx = this.data.freq_idxs[x][n];
            // if we find an empty slot, just use it and quit
            if (slot_idx == null) {
              this.data.freq_idxs[x][n] = i;
              break;
            }
            let slot_v = this.data.agg[x][slot_idx].v;
            // otherwise, compare with each slot, swapping if we beat it
            if ((x == 'min' && v < slot_v) || (x != 'min' && v > slot_v)) {
              let tmp = i;
              i = slot_idx;
              this.data.freq_idxs[x][n] = tmp;
              v = slot_v;
            }
          }
        }
      }
    }
  }
}
