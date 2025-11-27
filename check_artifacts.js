import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'api', 'database', 'museum.db');
const db = new Database(dbPath);

console.log('=== 전체 유물 데이터 확인 ===');

try {
  // 전체 유물 수
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM artifacts').get();
  console.log('전체 유물 수:', totalCount.count);
  
  // 최근 5개 유물
  const recentArtifacts = db.prepare(`
    SELECT id, name, number, images, project, preservation_status, created_at 
    FROM artifacts 
    ORDER BY created_at DESC 
    LIMIT 5
  `).all();
  
  console.log('\n최근 5개 유물:');
  recentArtifacts.forEach((artifact, index) => {
    console.log(`\n${index + 1}. ID: ${artifact.id}`);
    console.log(`   이름: ${artifact.name}`);
    console.log(`   번호: ${artifact.number}`);
    console.log(`   이미지: ${artifact.images}`);
    console.log(`   프로젝트: ${artifact.project}`);
    console.log(`   상태: ${artifact.preservation_status}`);
    console.log(`   생성일: ${artifact.created_at}`);
    
    try {
      const images = JSON.parse(artifact.images);
      console.log(`   이미지 수: ${images.length}`);
      console.log(`   이미지 경로: ${images.join(', ')}`);
    } catch (e) {
      console.log(`   이미지 파싱 오류: ${e.message}`);
    }
  });
  
  // 프로젝트별 유물 수
  const projectStats = db.prepare(`
    SELECT project, COUNT(*) as count 
    FROM artifacts 
    WHERE project IS NOT NULL AND project != ''
    GROUP BY project 
    ORDER BY count DESC
  `).all();
  
  console.log('\n프로젝트별 유물 수:');
  projectStats.forEach(stat => {
    console.log(`- ${stat.project}: ${stat.count}개`);
  });
  
  // 상태별 유물 수
  const statusStats = db.prepare(`
    SELECT preservation_status, COUNT(*) as count 
    FROM artifacts 
    GROUP BY preservation_status
  `).all();
  
  console.log('\n상태별 유물 수:');
  statusStats.forEach(stat => {
    console.log(`- ${stat.preservation_status}: ${stat.count}개`);
  });
  
  console.log('\n상태별 유물 수:');
  statusStats.forEach(stat => {
    console.log(`- ${stat.preservation_status}: ${stat.count}개`);
  });
  
} catch (error) {
  console.error('데이터베이스 조회 오류:', error);
} finally {
  db.close();
}