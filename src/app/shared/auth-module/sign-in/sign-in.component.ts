import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AuthoriseService } from '../../client/v1/auth.service';
import { AuthService } from '../../auth/auth.service';
import { ActivatedRoute } from '@angular/router';
import { LoginTokenKey } from '../../shared.const';
import * as particlesJS from 'particlesjs/dist/particles';

@Component({
  selector: 'sign-in',
  templateUrl: 'sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent implements OnInit {
  version = require('../../../../../package.json').version;
  errMsg: string;
  username: string;
  password: string;
  isSubmitOnGoing: boolean;
  ngForm: NgForm;
  @ViewChild('ngForm', { static: true })
  currentForm: NgForm;

  constructor(private authoriseService: AuthoriseService,
              private route: ActivatedRoute,
              public authService: AuthService) {
  }

  ngOnInit(): void {
    particlesJS.init({
      selector: '.background',
      color: ['#DA0463', '#404B69', '#DBEDF3'],
      connectParticles: true
    });

    const sid = this.route.snapshot.queryParams['sid'];
    const ref = this.route.snapshot.queryParams['ref'] ? this.route.snapshot.queryParams['ref'] : '/portal/dashboard';
    if (sid) {
      localStorage.setItem(LoginTokenKey, sid);
      window.location.replace(ref);
    }
    if (this.authService.currentUser) {
      window.location.replace(ref);
    }
  }

  public get isValid(): boolean {
    return this.currentForm &&
      this.currentForm.valid &&
      !this.isSubmitOnGoing;
  }

  onSubmit() {
    if (this.isSubmitOnGoing) {
      return;
    }
    this.isSubmitOnGoing = true;
    let type = 'db';
    if (this.authService.config && this.authService.config.ldapLogin) {
      type = 'ldap';
    }
    this.authoriseService.Login(this.username, this.password, type).subscribe(
      resp => {
        const ref = this.route.snapshot.queryParams['ref'] ? this.route.snapshot.queryParams['ref'] : '/portal/dashboard';
        const data = resp.data;
        localStorage.setItem(LoginTokenKey, data.token);
        window.location.replace(ref);
      },
      error => {
        this.isSubmitOnGoing = false;
        this.errMsg = error.error;
      }
    );

  }

  oauth2Login() {
    const currentUrl = document.location.origin;
    const ref = this.route.snapshot.queryParams['ref'] ? this.route.snapshot.queryParams['ref'] : '/portal/dashboard';
    // 从配置中获取 OAuth2 服务名称，如果没有则使用默认值 "oauth2"
    const oauth2Name = (this.authService.config && this.authService.config['oauth2Name']) || 'oauth2';
    // 使用 OAuth2 配置中的 RedirectURL 作为后端地址
    const backendUrl = (this.authService.config && this.authService.config['oauth2RedirectURL']) 
      || (window as any).CONFIG && (window as any).CONFIG.URL
      || currentUrl;
    // 构建 next 参数，包含完整的回调 URL，并进行 URL 编码
    const nextUrl = `${currentUrl}/sign-in?ref=${encodeURIComponent(ref)}`;
    // 跳转到后端 OAuth2 登录端点（使用 OAuth2 RedirectURL 作为后端地址）
    const loginUrl = `${backendUrl}/login/oauth2/${oauth2Name}?next=${encodeURIComponent(nextUrl)}`;
    console.log('OAuth2 login URL:', loginUrl);
    window.location.href = loginUrl;
  }

  getOAuth2Title() {
    const oauth2Title = this.authService.config['system.oauth2-title'];
    return oauth2Title ? oauth2Title : 'OAuth 2.0 Login';
  }

  getTitle() {
    const imagePrefix = this.authService.config['system.title'];
    return imagePrefix ? imagePrefix : 'Wayne';
  }

}
