import { Component, Input, OnChanges } from '@angular/core';
import { buildDescriptionParts, LinkItem, LinkPart } from '../utils/linkify';

@Component({
  selector: 'app-formatted-text', standalone: true,
  template: `@for (part of parts; track $index) {@if (part.bold) {<strong>{{ part.text }}</strong>} @else if (part.italic) {<em>{{ part.text }}</em>} @else {<span>{{ part.text }}</span>}}`,
  styles: [':host { white-space: pre-line; }'],
})
export class FormattedTextComponent implements OnChanges {
  @Input() text = '';
  parts: LinkPart<LinkItem>[] = [];
  ngOnChanges(): void { this.parts = buildDescriptionParts(this.text, []); }
}
