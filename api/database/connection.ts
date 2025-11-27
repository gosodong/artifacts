import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'museum.db');
const db = new Database(dbPath, { verbose: console.log });

db.pragma('foreign_keys = ON');

function ensureArtifactsSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      excavation_site TEXT,
      era TEXT,
      storage_location TEXT,
      processor TEXT,
      preservation_date TEXT,
      preservation_status TEXT,
      description TEXT,
      category TEXT,
      project TEXT,
      images TEXT,
      treatment_location TEXT,
      treatment_team TEXT,
      preservation_date_from TEXT,
      preservation_date_to TEXT,
      preservation_group TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const cols = db.prepare(`PRAGMA table_info(artifacts)`).all() as Array<{ name: string }>;
  const have = new Set(cols.map(c => c.name));
  const add = (name: string, type: string) => {
    if (!have.has(name)) db.exec(`ALTER TABLE artifacts ADD COLUMN ${name} ${type}`);
  };
  add('excavation_site','TEXT');
  add('era','TEXT');
  add('storage_location','TEXT');
  add('processor','TEXT');
  add('preservation_date','TEXT');
  add('preservation_status','TEXT');
  add('description','TEXT');
  add('category','TEXT');
  add('project','TEXT');
  add('images','TEXT');
  add('treatment_location','TEXT');
  add('treatment_team','TEXT');
  add('preservation_date_from','TEXT');
  add('preservation_date_to','TEXT');
  add('preservation_group','TEXT');
  add('created_at','DATETIME DEFAULT CURRENT_TIMESTAMP');
  add('updated_at','DATETIME DEFAULT CURRENT_TIMESTAMP');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artifacts_number ON artifacts(number);
    CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project);
    CREATE INDEX IF NOT EXISTS idx_artifacts_category ON artifacts(category);
    CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(preservation_status);
    CREATE INDEX IF NOT EXISTS idx_artifacts_created ON artifacts(created_at);
  `);
}

function ensureImagesSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      is_primary INTEGER DEFAULT 0,
      annotation_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_images_artifact_id ON images(artifact_id)`);
}

function ensureNotesSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      canvas_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notes_artifact_id ON notes(artifact_id)`);
}

export function initializeDatabase() {
  ensureArtifactsSchema();
  ensureImagesSchema();
  ensureNotesSchema();
}

export default db;
