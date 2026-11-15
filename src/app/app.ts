import { Component, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { IonApp } from '@ionic/angular/standalone';
import { environment } from '../environments/environment';
import { DatabaseService } from './core/data/database.service';

@Component({
  imports: [IonApp],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly database = inject(DatabaseService);
  protected readonly isCheckingDatabase = signal(false);
  protected readonly databaseStatus = signal('NON VÉRIFIÉE');
  protected readonly databaseMessage = signal(
    'Le test vérifie une écriture puis une lecture SQLite.',
  );

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void ScreenOrientation.lock({ orientation: 'portrait' }).catch((error: unknown) => {
        console.warn('Le verrouillage portrait n’a pas pu être appliqué.', error);
      });
    }
  }

  protected hasJamendoClientId(): boolean {
    return environment.jamendoClientId.trim().length > 0;
  }

  protected async verifyDatabase(): Promise<void> {
    this.isCheckingDatabase.set(true);
    this.databaseStatus.set('EN COURS');
    this.databaseMessage.set('Ouverture de la base et vérification lecture/écriture…');

    try {
      const passed = await this.database.verifyReadWrite();
      this.databaseStatus.set(passed ? 'PRÊTE' : 'ÉCHEC');
      this.databaseMessage.set(
        passed
          ? 'Lecture et écriture SQLite vérifiées sur cet appareil.'
          : 'La vérification SQLite a échoué.',
      );
    } catch {
      this.databaseStatus.set('INDISPONIBLE');
      this.databaseMessage.set(
        'SQLite n’a pas pu démarrer. Consultez la console de développement.',
      );
    } finally {
      this.isCheckingDatabase.set(false);
    }
  }
}
