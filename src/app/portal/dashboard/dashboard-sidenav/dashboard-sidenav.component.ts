import { Component } from '@angular/core';
import { AuthService } from '../../../shared/auth/auth.service';
import { Router } from '@angular/router';
import { CacheService } from '../../../shared/auth/cache.service';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from '../../../shared/client/v1/storage.service';
import { SideNavCollapse } from '../../../shared/base/side-nav/side-nav-collapse';

@Component({
  selector: 'wayne-dashboard-sidenav',
  templateUrl: './dashboard-sidenav.component.html',
  styleUrls: ['./dashboard-sidenav.component.scss']
})

export class DashboardSidenavComponent extends SideNavCollapse {

  constructor(
    public authService: AuthService,
    public cacheService: CacheService,
    public translate: TranslateService,
    private router: Router,
    public storage: StorageService
  ) {
    super(storage);
  }

  getNamespaceRoute(path: string): string {
    const namespace = this.cacheService.namespace;
    if (namespace && namespace.id) {
      return `/portal/namespace/${namespace.id}${path}`;
    }
    // Default to namespace 0 if no namespace is selected
    return `/portal/namespace/0${path}`;
  }

  get hasNamespace(): boolean {
    return this.cacheService.namespace != null;
  }

}

