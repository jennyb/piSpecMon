export class User {
  static ROLES = [ { role: "admin", label: "Administrator" },
                   { role: "freq", label: "Frequency Setter" },
                   { role: "data", label: "Data Viewer" } ];

  //FIXME create a 'data' property that stores role, name, etc so that we don't need to jump through the _... hoops
  role: string = User.ROLES[2].role;
  name: string;
  real: string;
  email: string;
  tel: string;
  _superior: User; // the prior logged in administrator, if any

  constructor(raw?: any) {
    if (raw) {
      this.role = raw.role;
      this.name = raw.name;
      this.real = raw.real;
      this.email = raw.email;
      this.tel = raw.tel;
      this._superior = raw.superior ? new User(raw.superior) : undefined;
    }
  }

  data(): any {
    let data: any = {};
    for (let k in this) {
      if (k[0] != '_') {
        data[k] = this[k];
      }
    }
    return data;
  }

  get _roleLabel(): string {
    for (let r of User.ROLES) {
      if (r.role == this.role) {
        return r.label;
      }
    }
    return this.role;
  }

  roleIn(roles: string[]): boolean {
    return roles.indexOf(this.role) != -1;
  }
}
