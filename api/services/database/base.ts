import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import path from "path";

import { config } from "../../config";

export abstract class BaseDatabaseService {
  protected db: Database;

  constructor() {
    const databaseDir = path.dirname(config.DATABASE_URL);
    mkdirSync(databaseDir, { recursive: true });

    this.db = new Database(config.DATABASE_URL, { create: true });
  }

  protected initializeDatabase(): void {
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.run("PRAGMA foreign_keys = ON");
    this.db.run("PRAGMA busy_timeout = 5000");
  }

  close(): void {
    this.db.close();
  }
}
