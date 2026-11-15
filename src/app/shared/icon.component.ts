import { Component, Input } from '@angular/core';

export type HearIconName =
  | 'arrow_back'
  | 'keyboard_arrow_down'
  | 'favorite'
  | 'shuffle'
  | 'skip_previous'
  | 'skip_next'
  | 'play_arrow'
  | 'pause'
  | 'repeat'
  | 'check'
  | 'check_circle'
  | 'error'
  | 'short_text'
  | 'queue_music'
  | 'graphic_eq'
  | 'library_music'
  | 'album'
  | 'search'
  | 'close'
  | 'replay_10'
  | 'fullscreen'
  | 'menu';

@Component({
  selector: 'app-hear-icon',
  standalone: true,
  template:
    '<svg class="hear-icon" aria-hidden="true" focusable="false"><use [attr.href]="symbolHref"></use></svg>',
  styles: [
    ':host{display:inline-flex;width:1.5rem;height:1.5rem;align-items:center;justify-content:center}',
    '.hear-icon{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:square;stroke-linejoin:miter}',
  ],
})
export class HearIconComponent {
  @Input({ required: true }) name!: HearIconName;

  protected get symbolHref(): string {
    return `#icon-${this.name}`;
  }
}
