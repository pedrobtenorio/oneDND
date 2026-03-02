import { Component } from '@angular/core';

import { QuickGuideComponent } from './quick-guide/quick-guide.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QuickGuideComponent],
  template: '<app-quick-guide />',
})
export class App {}
