import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../database/connection.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

type DbArtifactRow = {
  id: number;
  name: string;
  number: string;
  excavation_site?: string;
  era?: string;
  storage_location?: string;
  processor?: string;
  preservation_date?: string;
  preservation_status: 'pending' | 'processing' | 'completed';
  description?: string;
  category?: string;
  project?: string;
  images?: string;
  created_at: string;
  updated_at: string;
  preservation_group?: string;
};

type NoteRow = {
  id: number;
  artifact_id: number;
  title: string;
  canvas_data?: string;
  created_at: string | null;
  updated_at: string | null;
};

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/artifacts');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error(`이미지 파일만 업로드 가능합니다. 받은 파일: ${file.originalname} (${file.mimetype})`));
    }
  }
});

// 모든 유물 조회
router.get('/artifacts', (req, res) => {
  try {
    const { search, status, category, project } = req.query;
    let query = 'SELECT * FROM artifacts WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR number LIKE ? OR excavation_site LIKE ? OR era LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (status && status !== 'all') {
      query += ' AND preservation_status = ?';
      params.push(String(status));
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(String(category));
    }

    if (project && project !== 'all') {
      query += ' AND project = ?';
      params.push(String(project));
    }

    query += ' ORDER BY created_at DESC';

    const artifacts = db.prepare(query).all(...params);
    
    // Parse JSON fields
    const parsedArtifacts = artifacts.map((artifact) => ({
      ...artifact,
      id: String(artifact.id),
      images: artifact.images ? JSON.parse(artifact.images) : [],
      preservation_group: artifact.preservation_group ? JSON.parse(artifact.preservation_group) : null,
      created_at: new Date(artifact.created_at).toISOString(),
      updated_at: new Date(artifact.updated_at).toISOString(),
      preservation_date: artifact.preservation_date || null
    }));

    res.json({
      success: true,
      data: { artifacts: parsedArtifacts },
      count: parsedArtifacts.length
    });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artifacts'
    });
  }
});

// 특정 유물 조회
router.get('/artifacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);
    
    if (!artifact) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    // Parse JSON fields
    const parsedArtifact = {
      ...artifact,
      id: String(artifact.id),
      images: artifact.images ? JSON.parse(artifact.images) : [],
      preservation_group: artifact.preservation_group ? JSON.parse(artifact.preservation_group) : null,
      created_at: new Date(artifact.created_at).toISOString(),
      updated_at: new Date(artifact.updated_at).toISOString(),
      preservation_date: artifact.preservation_date || null
    };

    res.json({
      success: true,
      data: parsedArtifact
    });
  } catch (error) {
    console.error('Error fetching artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artifact'
    });
  }
});

// 유물 등록
router.post('/artifacts', (req, res) => {
  try {
    const {
      name,
      number,
      excavation_site,
      era,
      storage_location,
      processor,
      preservation_date,
      preservation_status,
      description,
      category,
      project,
      images,
      treatment_location,
      treatment_team,
      preservation_date_from,
      preservation_date_to,
      preservation_group
    } = req.body;

    // Validate required fields
    if (!name || !number) {
      return res.status(400).json({
        success: false,
        error: 'Name and number are required'
      });
    }

    // Check if artifact number already exists
    const existing = db.prepare('SELECT id FROM artifacts WHERE number = ?').get(number);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Artifact number already exists'
      });
    }

    const stmt = db.prepare(`
      INSERT INTO artifacts (
        name, number, excavation_site, era, storage_location, processor,
        preservation_date, preservation_status, description, category, project, images,
        treatment_location, treatment_team, preservation_date_from, preservation_date_to, preservation_group
      ) VALUES (
        @name, @number, @excavation_site, @era, @storage_location, @processor,
        @preservation_date, @preservation_status, @description, @category, @project, @images,
        @treatment_location, @treatment_team, @preservation_date_from, @preservation_date_to, @preservation_group
      )
    `);

    const result = stmt.run({
      name,
      number,
      excavation_site: excavation_site || null,
      era: era || null,
      storage_location: storage_location || null,
      processor: processor || null,
      preservation_date: preservation_date || null,
      preservation_status: preservation_status || 'pending',
      description: description || null,
      category: category || null,
      project: project || null,
      images: images ? JSON.stringify(images) : null,
      treatment_location: treatment_location || null,
      treatment_team: treatment_team || null,
      preservation_date_from: preservation_date_from || null,
      preservation_date_to: preservation_date_to || null,
      preservation_group: preservation_group || null
    });

    const newArtifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(result.lastInsertRowid) as DbArtifactRow;

    res.json({
      success: true,
      data: {
        ...newArtifact,
        id: String(newArtifact.id),
        images: newArtifact.images ? JSON.parse(newArtifact.images) : [],
        preservation_group: newArtifact.preservation_group ? JSON.parse(newArtifact.preservation_group) : null,
        created_at: new Date(newArtifact.created_at).toISOString(),
        updated_at: new Date(newArtifact.updated_at).toISOString(),
        preservation_date: newArtifact.preservation_date || null
      }
    });
  } catch (error) {
    console.error('Error creating artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create artifact'
    });
  }
});

// 유물 수정
router.put('/artifacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if artifact exists
    const existing = db.prepare('SELECT id FROM artifacts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    // Check if artifact number already exists (if being updated)
    if (updates.number) {
      const numberExists = db.prepare('SELECT id FROM artifacts WHERE number = ? AND id != ?').get(updates.number, id);
      if (numberExists) {
        return res.status(409).json({
          success: false,
          error: 'Artifact number already exists'
        });
      }
    }

    // Build update query
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      if (field === 'images' || field === 'preservation_group') {
        if (typeof updates[field] === 'string') {
          return updates[field];
        }
        return updates[field] ? JSON.stringify(updates[field]) : null;
      }
      return updates[field];
    });

    const query = `UPDATE artifacts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.prepare(query).run(...values, id);

    const updatedArtifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id) as DbArtifactRow;

    res.json({
      success: true,
      data: {
        ...updatedArtifact,
        id: String(updatedArtifact.id),
        images: updatedArtifact.images ? JSON.parse(updatedArtifact.images) : [],
        preservation_group: updatedArtifact.preservation_group ? JSON.parse(updatedArtifact.preservation_group) : null,
        created_at: new Date(updatedArtifact.created_at).toISOString(),
        updated_at: new Date(updatedArtifact.updated_at).toISOString(),
        preservation_date: updatedArtifact.preservation_date || null
      }
    });
  } catch (error) {
    console.error('Error updating artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update artifact'
    });
  }
});

// 유물 삭제
router.delete('/artifacts/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if artifact exists
    const existing = db.prepare('SELECT id FROM artifacts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    db.prepare('DELETE FROM artifacts WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Artifact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting artifact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete artifact'
    });
  }
});

// 이미지 업로드
router.post('/artifacts/:id/images', upload.single('image'), (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const file = (req as { file?: { filename: string } }).file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // 유물 존재 여부 확인
    const artifactExists = db.prepare('SELECT id FROM artifacts WHERE id = ?').get(id);
    if (!artifactExists) {
      console.log('유물을 찾을 수 없음:', id);
      return res.status(404).json({
        success: false,
        error: 'Artifact not found'
      });
    }

    // multer가 이미 파일을 저장했으므로 파일 경로만 생성
    const filePath = `/uploads/artifacts/${file.filename}`;

    // 기존 이미지 가져오기
    const currentArtifact = db.prepare('SELECT images FROM artifacts WHERE id = ?').get(id) as { images: string } | undefined;
    let currentImages: string[] = [];
    
    if (currentArtifact?.images) {
      try {
        currentImages = JSON.parse(currentArtifact.images);
      } catch {
        currentImages = [];
      }
    }
    
    // 새 이미지 추가
    const updatedImages = [...currentImages, filePath];
    
    // 데이터베이스 업데이트
    try {
      const stmt = db.prepare('UPDATE artifacts SET images = ? WHERE id = ?');
      stmt.run(JSON.stringify(updatedImages), id);
      // better-sqlite3는 자동으로 statement를 정리하므로 finalize() 불필요
    } catch (dbError) {
      console.error('데이터베이스 업데이트 실패:', dbError);
      throw new Error(`이미지 경로 업데이트 실패: ${(dbError as Error).message}`);
    }

    res.json({
      success: true,
      data: {
        file_path: filePath,
        file_name: file.filename
      }
    });
  } catch (error) {
    console.error('Image upload error:', {
      error: error,
      message: (error as Error).message,
      stack: (error as Error).stack,
      artifactId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: (error as Error).message
    });
  }
});

// 이미지 어노테이션 조회
router.get('/artifacts/:id/annotations', (req, res) => {
  try {
    const { id } = req.params;
    const { imagePath } = req.query as { imagePath?: string };
    if (!imagePath) {
      return res.status(400).json({ success: false, error: 'imagePath 쿼리 파라미터가 필요합니다.' });
    }

    const row = db.prepare('SELECT annotation_data FROM images WHERE artifact_id = ? AND file_path = ?').get(id, imagePath) as { annotation_data?: string } | undefined;
    let annotations: unknown[] = [];
    let canvasJson: unknown | null = null;
    if (row?.annotation_data) {
      try {
        const parsed = JSON.parse(row.annotation_data);
        // 새 형식 (version 2.0 with layers)
        if (parsed && typeof parsed === 'object' && parsed.version === '2.0' && parsed.layers) {
          canvasJson = parsed;
        }
        // 이전 형식 (version 1.0 with layers)
        else if (parsed && typeof parsed === 'object' && parsed.version === '1.0' && parsed.layers) {
          canvasJson = parsed;
        }
        // 이전 형식 (fabric.js canvas JSON with objects)
        else if (parsed && typeof parsed === 'object' && parsed.objects) {
          canvasJson = parsed;
        } else if (Array.isArray(parsed)) {
          annotations = parsed;
        }
      } catch {
        annotations = [];
      }
    }

    return res.json({ success: true, data: { annotations, canvas: canvasJson } });
  } catch (error) {
    console.error('어노테이션 조회 오류:', error);
    return res.status(500).json({ success: false, error: '어노테이션 조회 실패' });
  }
});

// 이미지 어노테이션 저장(업서트)
router.post('/artifacts/:id/annotations', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { image_path, annotations } = req.body as { image_path?: string; annotations?: unknown };

    if (!image_path || typeof annotations === 'undefined') {
      return res.status(400).json({ success: false, error: 'image_path와 annotations 데이터가 필요합니다.' });
    }

    const existing = db.prepare('SELECT id FROM images WHERE artifact_id = ? AND file_path = ?').get(id, image_path) as { id?: number } | undefined;
    const annotationJson = typeof annotations === 'string' ? annotations : JSON.stringify(annotations);

    if (existing?.id) {
      db.prepare('UPDATE images SET annotation_data = ?, created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE id = ?').run(annotationJson, existing.id);
    } else {
      const file_name = image_path.split('/').pop() || image_path;
      db.prepare(`INSERT INTO images (artifact_id, file_path, file_name, annotation_data, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(id, image_path, file_name, annotationJson);
    }

    return res.json({ success: true, data: { image_path } });
  } catch (error) {
    console.error('어노테이션 저장 오류:', error);
    return res.status(500).json({ success: false, error: '어노테이션 저장 실패' });
  }
});

// 이미지 회전 적용 (실제 파일 회전)
router.post('/artifacts/:id/images/rotate', async (req, res) => {
  try {
    const { id } = req.params;
    const { image_path, rotation } = req.body as { image_path?: string; rotation?: number };

    if (!image_path || typeof rotation !== 'number') {
      return res.status(400).json({ success: false, error: 'image_path와 rotation 값이 필요합니다.' });
    }

    // 0도 회전은 무시
    if (rotation === 0) {
      return res.json({ success: true, data: { image_path, rotated: false } });
    }

    // 유물 존재 확인
    const artifact = db.prepare('SELECT images FROM artifacts WHERE id = ?').get(id) as { images: string } | undefined;
    if (!artifact) {
      return res.status(404).json({ success: false, error: '유물을 찾을 수 없습니다.' });
    }

    // 파일 경로 확인
    const uploadsBase = path.join(__dirname, '../../uploads/artifacts');
    if (!image_path.startsWith('/uploads/artifacts/')) {
      return res.status(400).json({ success: false, error: '잘못된 이미지 경로입니다.' });
    }

    const rel = image_path.replace('/uploads/artifacts/', '');
    const absPath = path.join(uploadsBase, rel);
    const resolved = path.resolve(absPath);

    if (!resolved.startsWith(uploadsBase) || !fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, error: '이미지 파일을 찾을 수 없습니다.' });
    }

    // sharp로 이미지 회전
    const tempPath = resolved + '.tmp';
    await sharp(resolved)
      .rotate(rotation)
      .toFile(tempPath);

    // 원본 파일 교체
    fs.unlinkSync(resolved);
    fs.renameSync(tempPath, resolved);

    // 어노테이션에서 회전 정보 초기화 (이미 적용됨)
    const existing = db.prepare('SELECT id, annotation_data FROM images WHERE artifact_id = ? AND file_path = ?').get(id, image_path) as { id?: number; annotation_data?: string } | undefined;
    if (existing?.id && existing.annotation_data) {
      try {
        const parsed = JSON.parse(existing.annotation_data);
        if (parsed.imageRotation !== undefined) {
          parsed.imageRotation = 0; // 회전이 적용되었으므로 0으로 리셋
          db.prepare('UPDATE images SET annotation_data = ? WHERE id = ?').run(JSON.stringify(parsed), existing.id);
        }
      } catch {
        // 무시
      }
    }

    return res.json({ success: true, data: { image_path, rotated: true } });
  } catch (error) {
    console.error('이미지 회전 오류:', error);
    return res.status(500).json({ success: false, error: '이미지 회전 실패' });
  }
});

// 통계 데이터
router.get('/stats', (req, res) => {
  try {
    const totalArtifacts = db.prepare('SELECT COUNT(*) as count FROM artifacts').get() as { count: number };
    const statusStats = db.prepare(`
      SELECT preservation_status, COUNT(*) as count 
      FROM artifacts 
      GROUP BY preservation_status
    `).all() as { preservation_status: string; count: number }[];

    const categoryStats = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM artifacts 
      WHERE category IS NOT NULL 
      GROUP BY category
    `).all() as { category: string; count: number }[];

    const recentArtifacts = db.prepare(`
      SELECT * FROM artifacts 
      ORDER BY created_at DESC 
      LIMIT 5
    `).all() as DbArtifactRow[];

    res.json({
      success: true,
      data: {
        total: totalArtifacts.count,
        byStatus: statusStats.reduce((acc, stat) => {
          acc[stat.preservation_status] = stat.count;
          return acc;
        }, {} as Record<string, number>),
        byCategory: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = stat.count;
          return acc;
        }, {} as Record<string, number>),
        recent: recentArtifacts.map(artifact => ({
          ...artifact,
          id: String(artifact.id),
          images: artifact.images ? JSON.parse(artifact.images) : []
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// 이미지 삭제
router.delete('/artifacts/:id/images/:imagePath', (req, res) => {
  try {
    const { id, imagePath } = req.params;
    const decodedImagePath = decodeURIComponent(imagePath);
    
    // 유물 존재 여부 확인
    const artifact = db.prepare('SELECT images FROM artifacts WHERE id = ?').get(id) as { images: string } | undefined;
    if (!artifact) {
      return res.status(404).json({
        success: false,
        error: '유물을 찾을 수 없습니다.'
      });
    }
    
    let currentImages: string[] = [];
    if (artifact.images) {
      try {
        currentImages = JSON.parse(artifact.images);
      } catch {
        currentImages = [];
      }
    }
    
    // 이미지가 존재하는지 확인
    const imageIndex = currentImages.indexOf(decodedImagePath);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '이미지를 찾을 수 없습니다.'
      });
    }
    
    // 이미지 목록에서 제거
    const updatedImages = currentImages.filter(img => img !== decodedImagePath);
    
    // 데이터베이스 업데이트
    const stmt = db.prepare('UPDATE artifacts SET images = ? WHERE id = ?');
    stmt.run(JSON.stringify(updatedImages), id);
    
    // 실제 파일 삭제 (업로드 폴더 내부만 허용)
    try {
      const uploadsBase = path.join(__dirname, '../../uploads/artifacts');
      if (decodedImagePath.startsWith('/uploads/artifacts/')) {
        const rel = decodedImagePath.replace('/uploads/artifacts/', '');
        const abs = path.join(uploadsBase, rel);
        const resolved = path.resolve(abs);
        if (resolved.startsWith(uploadsBase) && fs.existsSync(resolved)) {
          fs.unlinkSync(resolved);
        }
      }
    } catch (fileErr) {
      console.warn('파일 삭제 중 경고:', (fileErr as Error).message);
    }
    
    res.json({
      success: true,
      message: '이미지가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '이미지 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 프로젝트 리스트 가져오기
router.get('/projects', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT DISTINCT project 
      FROM artifacts 
      WHERE project IS NOT NULL AND project != ''
      ORDER BY project ASC
    `).all() as { project: string }[];

    const projectList = projects.map(p => p.project);

    res.json({
      success: true,
      data: projectList
    });
  } catch (error) {
    console.error('프로젝트 리스트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 리스트를 가져오는 중 오류가 발생했습니다.'
    });
  }
});

// ==================== 노트 API ====================

// 유물의 노트 목록 조회
router.get('/artifacts/:id/notes', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const notes = db.prepare(`
      SELECT id, artifact_id, title, created_at, updated_at 
      FROM notes 
      WHERE artifact_id = ? 
      ORDER BY updated_at DESC
    `).all(id) as NoteRow[];

    res.json({
      success: true,
      data: notes.map(note => ({
        ...note,
        id: String(note.id),
        created_at: note.created_at ? new Date(note.created_at).toISOString() : null,
        updated_at: note.updated_at ? new Date(note.updated_at).toISOString() : null,
      }))
    });
  } catch (error) {
    console.error('노트 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '노트 목록 조회 실패' });
  }
});

// 특정 노트 조회
router.get('/notes/:noteId', (req: express.Request, res: express.Response) => {
  try {
    const { noteId } = req.params;
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as NoteRow;

    if (!note) {
      return res.status(404).json({ success: false, error: '노트를 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      data: {
        ...note,
        id: String(note.id),
        canvas_data: note.canvas_data ? JSON.parse(note.canvas_data) : null,
        created_at: note.created_at ? new Date(note.created_at).toISOString() : null,
        updated_at: note.updated_at ? new Date(note.updated_at).toISOString() : null,
      }
    });
  } catch (error) {
    console.error('노트 조회 오류:', error);
    res.status(500).json({ success: false, error: '노트 조회 실패' });
  }
});

// 노트 생성
router.post('/artifacts/:id/notes', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    // 유물 존재 확인
    const artifact = db.prepare('SELECT id FROM artifacts WHERE id = ?').get(id);
    if (!artifact) {
      return res.status(404).json({ success: false, error: '유물을 찾을 수 없습니다.' });
    }

    const result = db.prepare(`
      INSERT INTO notes (artifact_id, title) VALUES (?, ?)
    `).run(id, title || '새 노트');

    const newNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid) as NoteRow;

    res.json({
      success: true,
      data: {
        ...newNote,
        id: String(newNote.id),
        canvas_data: null,
        created_at: newNote.created_at ? new Date(newNote.created_at).toISOString() : null,
        updated_at: newNote.updated_at ? new Date(newNote.updated_at).toISOString() : null,
      }
    });
  } catch (error) {
    console.error('노트 생성 오류:', error);
    res.status(500).json({ success: false, error: '노트 생성 실패' });
  }
});

// 노트 수정 (저장)
router.put('/notes/:noteId', (req: express.Request, res: express.Response) => {
  try {
    const { noteId } = req.params;
    const { title, canvas_data } = req.body;

    // 노트 존재 확인
    const existing = db.prepare('SELECT id FROM notes WHERE id = ?').get(noteId);
    if (!existing) {
      return res.status(404).json({ success: false, error: '노트를 찾을 수 없습니다.' });
    }

    const canvasJson = canvas_data ? JSON.stringify(canvas_data) : null;
    
    db.prepare(`
      UPDATE notes 
      SET title = COALESCE(?, title), 
          canvas_data = COALESCE(?, canvas_data),
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(title, canvasJson, noteId);

    const updatedNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as NoteRow;

    res.json({
      success: true,
      data: {
        ...updatedNote,
        id: String(updatedNote.id),
        canvas_data: updatedNote.canvas_data ? JSON.parse(updatedNote.canvas_data) : null,
        created_at: updatedNote.created_at ? new Date(updatedNote.created_at).toISOString() : null,
        updated_at: updatedNote.updated_at ? new Date(updatedNote.updated_at).toISOString() : null,
      }
    });
  } catch (error) {
    console.error('노트 수정 오류:', error);
    res.status(500).json({ success: false, error: '노트 수정 실패' });
  }
});

// 노트 삭제
router.delete('/notes/:noteId', (req: express.Request, res: express.Response) => {
  try {
    const { noteId } = req.params;

    const existing = db.prepare('SELECT id FROM notes WHERE id = ?').get(noteId);
    if (!existing) {
      return res.status(404).json({ success: false, error: '노트를 찾을 수 없습니다.' });
    }

    db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);

    res.json({ success: true, message: '노트가 삭제되었습니다.' });
  } catch (error) {
    console.error('노트 삭제 오류:', error);
    res.status(500).json({ success: false, error: '노트 삭제 실패' });
  }
});

export default router;
