import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'api', 'database', 'museum.db');
const db = new Database(dbPath);

console.log('=== 데이터 정합성 확인 ===');

try {
  // 1. 전체 유물 데이터 확인
  console.log('\n1. 전체 유물 데이터:');
  const allArtifacts = db.prepare(`
    SELECT id, name, number, project, preservation_status, created_at 
    FROM artifacts 
    ORDER BY created_at DESC
  `).all();
  
  allArtifacts.forEach((artifact, index) => {
    console.log(`${index + 1}. ID: ${artifact.id}, 이름: ${artifact.name}, 프로젝트: ${artifact.project || '없음'}, 상태: ${artifact.preservation_status}, 생성일: ${artifact.created_at}`);
  });
  
  // 2. 프로젝트별 유물 수 확인
  console.log('\n2. 프로젝트별 유물 수:');
  const projectStats = db.prepare(`
    SELECT project, COUNT(*) as count 
    FROM artifacts 
    WHERE project IS NOT NULL AND project != ''
    GROUP BY project 
    ORDER BY count DESC
  `).all();
  
  projectStats.forEach(stat => {
    console.log(`- ${stat.project}: ${stat.count}개`);
  });
  
  // 3. 프로젝트가 없는 유물 확인
  console.log('\n3. 프로젝트가 없는 유물:');
  const noProjectArtifacts = db.prepare(`
    SELECT id, name, number, created_at 
    FROM artifacts 
    WHERE project IS NULL OR project = ''
    ORDER BY created_at DESC
  `).all();
  
  if (noProjectArtifacts.length === 0) {
    console.log('프로젝트가 없는 유물이 없습니다.');
  } else {
    noProjectArtifacts.forEach(artifact => {
      console.log(`- ID: ${artifact.id}, 이름: ${artifact.name}, 생성일: ${artifact.created_at}`);
    });
  }
  
  // 4. 최근 5개 유물 확인 (Dashboard용)
  console.log('\n4. 최근 5개 유물 (Dashboard):');
  const recentArtifacts = db.prepare(`
    SELECT id, name, number, project, preservation_status, created_at 
    FROM artifacts 
    ORDER BY created_at DESC 
    LIMIT 5
  `).all();
  
  recentArtifacts.forEach((artifact, index) => {
    console.log(`${index + 1}. ID: ${artifact.id}, 이름: ${artifact.name}, 프로젝트: ${artifact.project || '없음'}, 생성일: ${artifact.created_at}`);
  });
  
  // 5. 고유 프로젝트 목록 확인
  console.log('\n5. 고유 프로젝트 목록:');
  const uniqueProjects = db.prepare(`
    SELECT DISTINCT project 
    FROM artifacts 
    WHERE project IS NOT NULL AND project != ''
    ORDER BY project ASC
  `).all();
  
  uniqueProjects.forEach((project, index) => {
    console.log(`${index + 1}. ${project.project}`);
  });
  
  // 6. 데이터 요약
  console.log('\n6. 데이터 요약:');
  console.log(`- 전체 유물 수: ${allArtifacts.length}`);
  console.log(`- 프로젝트가 할당된 유물: ${allArtifacts.length - noProjectArtifacts.length}`);
  console.log(`- 프로젝트가 없는 유물: ${noProjectArtifacts.length}`);
  console.log(`- 고유 프로젝트 수: ${uniqueProjects.length}`);
  
} catch (error) {
  console.error('데이터베이스 조회 오류:', error);
} finally {
  db.close();
}