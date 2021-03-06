import { Component } from '@angular/core';
import { WidgetBase } from './widget.base';

@Component({
  selector: 'psm-ident',
  template:
    `<psm-widget key="ident" title="Identification">
       <div class="form-group">
         <label for="name">Unit name</label>
         <input disabled="true" type="text" class="form-control" [(ngModel)]="values.name" name="name">
       </div>
       <div class="form-group">
         <label for="description">Description / location</label>
         <input psmInput type="text" required class="form-control" [(ngModel)]="values.description" name="description" #description="ngModel">
       </div>
       <div [hidden]="description.valid || description.pristine" class="alert alert-danger">
         Description is a required parameter
       </div>
       <div class="form-group">
         <label for="version">Version</label>
         <input disabled="true" type="text" class="form-control" [(ngModel)]="values.version" name="version">
       </div>
     </psm-widget>`
})
export class IdentComponent extends WidgetBase {
}
