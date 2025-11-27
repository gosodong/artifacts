import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'api', 'database', 'museum.db');
const db = new Database(dbPath);

console.log('=== 데이터 불일치 문제 분석 ===');

try {
  // 1. Dashboard용 최근 5개 유물 (API/stats에서 사용하는 쿼리)
  console.log('\n1. Dashboard용 최근 5개 유물:');
  const dashboardArtifacts = db.prepare(`
    SELECT id, name, project, created_at 
    FROM artifacts 
    ORDER BY created_at DESC 
    LIMIT 5
  `).all();
  
  dashboardArtifacts.forEach((artifact, index) => {
    console.log(`${index + 1}. ID: ${artifact.id}, 이름: ${artifact.name}, 프로젝트: ${artifact.project || '없음'}, 생성일: ${artifact.created_at}`);
  });
  
  // 2. Projects 페이지용 프로젝트 목록 (API/projects에서 사용하는 쿼리)
  console.log('\n2. Projects 페이지용 프로젝트 목록:');
  const projects = db.prepare(`
    SELECT DISTINCT project 
    FROM artifacts 
    WHERE project IS NOT NULL AND project != ''
    ORDER BY project ASC
  `).all();
  
  projects.forEach((project, index) => {
    console.log(`${index + 1}. ${project.project}`);
  });
  
  // 3. 각 프로젝트별 유물 수
  console.log('\n3. 각 프로젝트별 유물 수:');
  const projectCounts = db.prepare(`
    SELECT project, COUNT(*) as count 
    FROM artifacts 
    WHERE project IS NOT NULL AND project != ''
    GROUP BY project 
    ORDER BY count DESC
  `).all();
  
  projectCounts.forEach(stat => {
    console.log(`- ${stat.project}: ${stat.count}개`);
  });
  
  // 4. 문제 분석
  console.log('\n4. 문제 분석:');
  console.log(`- Dashboard에 표시되는 유물 수: ${dashboardArtifacts.length}`);
  console.log(`- 전체 프로젝트 수: ${projects.length}`);
  console.log(`- 프로젝트가 있는 유물 수: ${projectCounts.reduce((sum, p) => sum + p.count, 0)}`);
  
  // 5. 최근 유물들의 프로젝트 확인
  console.log('\n5. 최근 유물들의 프로젝트 할당 상태:');
  dashboardArtifacts.forEach(artifact => {
    const hasProject = artifact.project && artifact.project !== '';
    console.log(`- ID ${artifact.id} (${artifact.name}): ${hasProject ? `프로젝트 있음 (${artifact.project})` : '프로젝트 없음'}`);
  });
  
} catch (error) {
  console.error('데이터베이스 조회 오류:', error);
} finally {
  db.close();
}