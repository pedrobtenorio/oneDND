import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Summon } from '../models/summon.models';

@Component({
  selector: 'app-summon-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summon-card.component.html',
  styleUrl: './summon-card.component.css',
})
export class SummonCardComponent {
  @Input() summon!: Summon;

  get hasSaves(): boolean {
    return [this.summon.str, this.summon.dex, this.summon.con,
            this.summon.int, this.summon.wis, this.summon.cha]
      .some(a => a.save !== undefined);
  }
}
