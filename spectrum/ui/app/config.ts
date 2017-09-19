import { Data } from './data';

export class Config {
  public id: string;
  public values: any;
  public timestamp: number; // config creation timestamp
  public first: number; // timestamp of first data storage
  public latest: number; // timestamp of latest data storage
  public counts: any; // map from worker key to iteration count
  public errors: any[];

  public data: Data;
}
