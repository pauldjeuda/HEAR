import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  async tick(): Promise<void> {
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  async limit(): Promise<void> {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }
}
