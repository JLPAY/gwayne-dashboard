import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../shared/auth/auth.service';
import { CacheService } from '../../shared/auth/cache.service';
import { LoginTokenKey } from '../../shared/shared.const';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { StorageService } from '../../shared/client/v1/storage.service';

@Component({
  selector: 'wayne-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit, OnDestroy {
  currentLang: string;

  constructor(private router: Router,
              private route: ActivatedRoute,
              public cacheService: CacheService,
              public translate: TranslateService,
              private storage: StorageService,
              public authService: AuthService) {
  }

  ngOnDestroy(): void {
  }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.currentLang = event.lang;
    });
  }

  getTitle() {
    const imagePrefix = this.authService.config['system.title'];
    return imagePrefix ? imagePrefix : 'Wayne';
  }

  goBack() {
    this.router.navigateByUrl('/admin/reportform/overview');
  }

  showLang(lang: string): string {
    switch (lang) {
      case 'en':
        return 'English';
      case 'zh-Hans':
        return '中文简体';
      default:
        return '';
    }
  }

  changeLang(lang: string) {
    this.translate.use(lang);
    this.storage.save('lang', lang);
  }

  logout() {
    localStorage.removeItem(LoginTokenKey);
    this.router.navigateByUrl('/sign-in');
  }

}
