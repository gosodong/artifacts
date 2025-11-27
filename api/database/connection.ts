import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터베이스 파일 경로
const dbPath = path.join(__dirname, '../database/museum.db');

// 데이터베이스 연결
const db = new Database(dbPath, { verbose: console.log });

// 테이블 생성 함수
const createTables = () => {
  // 유물 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      number TEXT UNIQUE NOT NULL,
      excavation_site TEXT,
      era TEXT,
      storage_location TEXT,
      processor TEXT,
      preservation_date TEXT,
      preservation_status TEXT CHECK(preservation_status IN ('pending', 'processing', 'completed')) DEFAULT 'pending',
      description TEXT,
      category TEXT,
      project TEXT,
      images TEXT, -- JSON array of image paths
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 이미지 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      is_primary BOOLEAN DEFAULT FALSE,
      annotation_data TEXT, -- JSON data for annotations
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
    )
  `);

  // 프로젝트 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      start_date DATE,
      end_date DATE,
      status TEXT CHECK(status IN ('active', 'completed', 'paused')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 보존 처리 기록 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS preservation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER,
      action_type TEXT NOT NULL, -- 'cleaning', 'restoration', 'documentation', etc.
      description TEXT,
      performed_by TEXT,
      performed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      before_images TEXT, -- JSON array of image paths
      after_images TEXT, -- JSON array of image paths
      status_before TEXT,
      status_after TEXT,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables created successfully');
};

// 인덱스 생성
const createIndexes = () => {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artifacts_number ON artifacts(number);
    CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(preservation_status);
    CREATE INDEX IF NOT EXISTS idx_artifacts_category ON artifacts(category);
    CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project);
    CREATE INDEX IF NOT EXISTS idx_images_artifact_id ON images(artifact_id);
    CREATE INDEX IF NOT EXISTS idx_preservation_logs_artifact_id ON preservation_logs(artifact_id);
  `);
  
  console.log('Database indexes created successfully');
};

// 데이터베이스 초기화
export const initializeDatabase = () => {
  try {
    createTables();
    createIndexes();
    
    // 기본 데이터 삽입 (개발용)
    const artifactCount = db.prepare('SELECT COUNT(*) as count FROM artifacts').get() as { count: number };
    
    if (artifactCount.count === 0) {
      console.log('Inserting sample data...');
      
      const insertArtifact = db.prepare(`
        INSERT INTO artifacts (
          name, number, excavation_site, era, storage_location, processor, 
          preservation_date, preservation_status, description, category, project, images
        ) VALUES (
          @name, @number, @excavation_site, @era, @storage_location, @processor,
          @preservation_date, @preservation_status, @description, @category, @project, @images
        )
      `);

      const sampleArtifacts = [
        {
          name: '청동 거울',
          number: 'ART-001',
          excavation_site: '경주 황남대원군',
          era: '삼국시대',
          storage_location: '창고 A-1',
          processor: '김철수',
          preservation_date: '2024-01-15',
          preservation_status: 'completed',
          description: '삼국시대 청동 거울로, 뒷면에 용무늬가 새겨져 있습니다.',
          category: '청동기',
          project: '황남대원군 발굴',
          images: JSON.stringify(['/uploads/artifacts/image-1764084493732-288298044.jpg'])
        },
        {
          name: '도자기 항아리',
          number: 'ART-002',
          excavation_site: '공주 송산리',
          era: '조선시대',
          storage_location: '창고 B-2',
          processor: '이영희',
          preservation_date: '2024-02-20',
          preservation_status: 'processing',
          description: '조선시대 백자 항아리로, 입술 부분이 약간 손상되었습니다.',
          category: '도자기',
          project: '송산리 유적 정비',
          images: JSON.stringify(['/uploads/artifacts/image-1764085148485-715260746.jpg'])
        },
        {
          name: '고려 청자',
          number: 'ART-003',
          excavation_site: '강진 대구면',
          era: '고려시대',
          storage_location: '창고 C-3',
          processor: '박문화',
          preservation_date: '',
          preservation_status: 'pending',
          description: '고려시대 대표적인 청자로, 형태가 아름답습니다.',
          category: '도자기',
          project: '강진 요지 발굴',
          images: JSON.stringify([])
        }
      ];

      sampleArtifacts.forEach(artifact => {
        insertArtifact.run(artifact);
      });

      console.log('Sample data inserted successfully');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export default db;