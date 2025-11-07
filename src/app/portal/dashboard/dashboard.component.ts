import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth/auth.service';

@Component({
  selector: 'wayne-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentTime: Date = new Date();

  constructor(
    private router: Router,
    public authService: AuthService
  ) {
  }

  ngOnInit() {
    this.currentTime = new Date();
  }

  navigateToDeployment() {
    this.router.navigate(['portal/kubernetes/deployment']);
  }

  navigateToKubernetesPod() {
    this.router.navigate(['portal/kubernetes/pod']);
  }

}

