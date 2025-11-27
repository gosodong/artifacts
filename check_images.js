import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'api', 'database', 'museum.db');
const db = new Database(dbPath);

console.log('=== 데이터베이스 이미지 확인 ===');

try {
  // artifacts 테이블의 이미지 데이터 확인
  const artifacts = db.prepare('SELECT id, name, images FROM artifacts WHERE images IS NOT NULL').all();
  
  console.log('전체 artifacts 수:', artifacts.length);
  
  artifacts.forEach(artifact => {
    console.log(`\nArtifact ID: ${artifact.id}`);
    console.log(`Name: ${artifact.name}`);
    console.log(`Images: ${artifact.images}`);
    
    try {
      const images = JSON.parse(artifact.images);
      console.log(`Parsed images (${images.length}개):`, images);
    } catch (e) {
      console.log('이미지 파싱 오류:', e.message);
    }
  });
  
  // 실제 이미지 경로 확인
  console.log('\n=== 실제 이미지 파일 확인 ===');
  const uploadsDir = path.join(__dirname, 'uploads', 'artifacts');
  
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    console.log('uploads/artifacts 디렉토리 파일들:', files);
    
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`${file}: ${stats.size} bytes, 수정일: ${stats.mtime}`);
    });
  } else {
    console.log('uploads/artifacts 디렉토리가 존재하지 않습니다.');
  }
  
} catch (error) {
  console.error('데이터베이스 조회 오류:', error);
} finally {
  db.close();
}