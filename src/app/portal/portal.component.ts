import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { defaultRoutingUrl } from '../shared/shared.const';
import { CacheService } from '../shared/auth/cache.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'wayne-portal',
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss']
})
export class PortalComponent implements OnInit {
  currentUrl: string = '';

  constructor(private router: Router,
              public cacheService: CacheService) {
    // 监听路由变化
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.url;
    });
  }

  ngOnInit() {
    this.currentUrl = this.router.url;
    if (this.router.url === '/portal') {
      this.router.navigate(['portal/dashboard']);
    }
  }

  getSidenavType(): string {
    if (this.currentUrl.startsWith('/portal/dashboard') || 
        this.currentUrl.startsWith('/portal/kubernetes/pod') ||
        this.currentUrl.startsWith('/portal/kubernetes/deployment') ||
        this.currentUrl.startsWith('/portal/kubernetes/ingress') ||
        this.currentUrl.startsWith('/portal/kubernetes/configmap') ||
        this.currentUrl.startsWith('/portal/kubernetes/job') ||
        this.currentUrl.startsWith('/portal/kubernetes/cronjob') ||
        this.currentUrl.startsWith('/portal/kubernetes/service') ||
        this.currentUrl.startsWith('/portal/kubernetes/hpa') ||
        this.currentUrl.startsWith('/portal/kubernetes/secret') ||
        this.currentUrl.startsWith('/portal/kubernetes/statefulset') ||
        this.currentUrl.startsWith('/portal/kubernetes/daemonset') ||
        this.currentUrl.startsWith('/portal/kubernetes/namespace') ||
        this.currentUrl.startsWith('/portal/kubernetes/node')) {
      return 'dashboard';
    } else if (this.currentUrl.startsWith('/portal/namespace/') && this.currentUrl.includes('/app/')) {
      return 'app';
    } else if (this.currentUrl.startsWith('/portal/namespace/')) {
      return 'namespace';
    }
    return 'dashboard'; // 默认使用 dashboard 侧边栏
  }

}
