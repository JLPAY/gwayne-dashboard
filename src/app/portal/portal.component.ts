import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'wayne-portal',
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss']
})
export class PortalComponent implements OnInit {

  constructor(private router: Router) {
  }

  ngOnInit() {
    if (this.router.url === '/portal') {
      this.router.navigate(['/portal/dashboard']);
    }
  }

}
