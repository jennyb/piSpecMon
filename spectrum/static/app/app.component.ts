import { Component, ViewChild } from '@angular/core';
import { DetailsComponent } from './details.component';
import { UsersComponent } from './users.component';
import { StatsComponent } from './stats.component';
import { RigComponent } from './rig.component';
import { ConfigComponent } from './config.component';
import { SweepComponent } from './sweep.component';
import { ErrorComponent } from './error.component';
import { WorkerComponent } from './worker.component';
import { ChartsComponent } from './charts.component';
import { DataService } from './data.service';
import { ErrorService } from './error.service';
import { User } from './user';
import { HTTP_PROVIDERS } from '@angular/http';

// Add the RxJS Observable operators we need in this app
import './rxjs-operators';

@Component({
  selector: 'psm-app',
  templateUrl: 'templates/app.html',
  directives: [ ErrorComponent, DetailsComponent, UsersComponent, StatsComponent, RigComponent, ConfigComponent, SweepComponent, WorkerComponent, ChartsComponent ],
  providers: [ DataService, ErrorService, HTTP_PROVIDERS ]
})
export class AppComponent {
  @ViewChild(DetailsComponent) detailsComponent;

  roleIn(roles: string[]): boolean {
    if (! this.user) return false;
    return roles.indexOf(this.user.role) != -1;
  }

  get user(): User {
    return this.detailsComponent.user;
  }
}
