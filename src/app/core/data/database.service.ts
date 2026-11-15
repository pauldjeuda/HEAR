import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { DATABASE_MIGRATIONS } from './migrations/v1';

const DATABASE_NAME = 'hear';
const SQLITE_MODE = 'no-encryption';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private connectionPromise?: Promise<SQLiteDBConnection>;

  async verifyReadWrite(): Promise<boolean> {
    const database = await this.open();
    const probeValue = `check-${Date.now()}`;

    await database.execute('CREATE TEMP TABLE IF NOT EXISTS hear_s0_probe (value TEXT NOT NULL)');
    await database.execute('DELETE FROM hear_s0_probe');
    await database.run('INSERT INTO hear_s0_probe (value) VALUES (?)', [probeValue]);

    try {
      const result = await database.query('SELECT value FROM hear_s0_probe LIMIT 1');
      const row = result.values?.[0];
      return row?.['value'] === probeValue;
    } finally {
      await database.execute('DROP TABLE IF EXISTS hear_s0_probe');
    }
  }

  private open(): Promise<SQLiteDBConnection> {
    this.connectionPromise ??= this.openDatabase().catch((error: unknown) => {
      this.connectionPromise = undefined;
      throw error;
    });
    return this.connectionPromise;
  }

  private async openDatabase(): Promise<SQLiteDBConnection> {
    if (!Capacitor.isNativePlatform()) {
      const { defineCustomElements } = await import('jeep-sqlite/loader');
      await defineCustomElements(window);
      if (!document.querySelector('jeep-sqlite')) {
        const sqliteElement = document.createElement('jeep-sqlite');
        sqliteElement.setAttribute('wasmPath', 'assets');
        document.body.appendChild(sqliteElement);
      }
      await customElements.whenDefined('jeep-sqlite');
      await this.sqlite.initWebStore();
    }

    await this.sqlite.addUpgradeStatement(DATABASE_NAME, DATABASE_MIGRATIONS);
    const existing = await this.sqlite.isConnection(DATABASE_NAME, false);
    const database = existing.result
      ? await this.sqlite.retrieveConnection(DATABASE_NAME, false)
      : await this.sqlite.createConnection(DATABASE_NAME, false, SQLITE_MODE, 1, false);

    await database.open();
    await database.execute('PRAGMA foreign_keys = ON');
    return database;
  }
}
