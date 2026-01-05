import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { TerminalCommandRuleComponent } from './terminal-command-rule.component';
import { TerminalCommandRuleService } from '../../shared/client/v1/terminal-command-rule.service';

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    TerminalCommandRuleComponent
  ],
  providers: [
    TerminalCommandRuleService
  ]
})
export class TerminalCommandRuleModule {
}

