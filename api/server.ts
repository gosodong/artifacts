import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db, { initializeDatabase } from './database/connection.ts';
import artifactRoutes from './routes/artifacts.js';
import integrationRoutes from './routes/integrations.js';
import backupRoutes from './routes/backup.js';
import healthRoutes from './routes/health.js';
import { optionalAuth } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowed.length) return cb(null, allowed.includes(origin))
    const dev = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3001']
    cb(null, dev.includes(origin))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files with proper headers
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    // 이미지 파일에 대한 CORS 헤더 설정
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    }
  }
}));

// /images 경로도 /uploads로 리다이렉트 (하위 호환성)
app.use('/images', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    // 이미지 파일에 대한 CORS 헤더 설정
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    }
  }
}));

// /images/artifact-<num>.jpg 패턴 처리: 아티팩트 번호로 첫 번째 이미지 제공
app.get('/images/artifact-:num.jpg', (req, res) => {
  try {
    const numParam = req.params.num;
    const artifactNumber = numParam.toUpperCase().startsWith('ART-') ? numParam.toUpperCase() : `ART-${numParam}`;
    const row = db.prepare('SELECT images FROM artifacts WHERE number = ?').get(artifactNumber) as { images?: string } | undefined;
    if (!row) {
      return res.status(404).json({ success: false, error: 'Artifact not found' });
    }
    let images: string[] = [];
    if (row.images) {
      try { images = JSON.parse(row.images); } catch { images = []; }
    }
    if (!images.length) {
      return res.status(404).json({ success: false, error: 'No images for artifact' });
    }
    const relPath = images[0]; // e.g. /uploads/artifacts/xxx.jpg
    const absPath = path.join(__dirname, '..', relPath.startsWith('/') ? relPath.slice(1) : relPath);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, error: 'Image file not found' });
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendFile(absPath);
  } catch (error) {
    console.error('artifact image resolve error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Initialize database
initializeDatabase();

// Routes
app.use('/api', artifactRoutes);
app.use('/api', integrationRoutes);
app.use('/api', optionalAuth, backupRoutes);
app.use('/api', healthRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve frontend build (SPA) if available
const clientDistPath = path.join(__dirname, '../dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const stack = err instanceof Error ? err.stack : undefined;
  if (stack) {
    console.error(stack);
  } else {
    console.error(err);
  }
  void next;
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (err instanceof Error ? err.message : 'Unknown error')
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
});

export default app;
