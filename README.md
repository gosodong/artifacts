# 박물관 유물관리 시스템

React + TypeScript + SQLite3 기반의 현대적인 박물관 유물 관리 시스템입니다. HubSpot CRM 스타일의 UI/UX를 제공합니다.

## 주요 기능

### 📊 대시보드
- 실시간 유물 통계 (전체, 처리 대기, 처리 중, 처리 완료)
- 최근 등록된 유물 목록
- 프로젝트별 현황 요약

### 🏛️ 유물 관리
- 유물 등록/수정/삭제 (이름, 번호, 발굴지, 시대, 보관위치 등)
- 상세 메타데이터 관리
- 여러 이미지 업로드 및 관리
- 보존 상태 추적 (처리 대기/중/완료)
- 고급 검색 및 필터링

### 🖼️ 이미지 관리
- 드래그 앤 드롭 이미지 업로드
- 이미지 갤러리 뷰
- 이미지 다운로드 및 삭제
- Canvas 기반 이미지 주석 및 편집
  - 펜, 형광펜, 지우개 도구
  - 색상 선택 및 굵기 조절
  - 실행 취소/재실행 기능

### 🔧 보존 상태 추적
- 처리 전/중/후 상태 관리
- 보존 처리 기록 관리
- 처리자 및 날짜 추적
- 처리 전후 이미지 비교

### 📁 프로젝트 관리
- 프로젝트별 유물 분류
- 프로젝트 상태 관리 (진행 중/완료/일시 중단)
- 기간 및 담당자 관리

### 📱 태블릿 PC 최적화
- 터치 친화적인 UI
- 스와이프 제스처 지원
- 롱 프레스 메뉴
- 반응형 디자인

## 기술 스택

### 프론트엔드
- React 18 + TypeScript
- Vite (빌드 도구)
- Tailwind CSS (스타일링)
- Zustand (상태 관리)
- React Router (라우팅)
- Headless UI (컴포넌트)
- Lucide React (아이콘)

### 백엔드
- Node.js + Express
- SQLite3 (데이터베이스)
- Better-sqlite3 (데이터베이스 드라이버)
- Multer (파일 업로드)
- CORS (교차 출처 리소스 공유)

## 설치 및 실행

### 요구사항
- Node.js 18+ 
- npm 또는 pnpm

### 설치
```bash
# 저장소 클론
git clone [repository-url]
cd museum-artifact-system

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 개발 서버
- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3001/api
- API 문서: http://localhost:3001/api/health

## 데이터베이스

SQLite3를 사용하며, 자동으로 다음 테이블이 생성됩니다:

- **artifacts**: 유물 정보
- **images**: 이미지 정보
- **projects**: 프로젝트 정보
- **preservation_logs**: 보존 처리 기록

## API 엔드포인트

### 유물 관리
- `GET /api/artifacts` - 모든 유물 조회
- `GET /api/artifacts/:id` - 특정 유물 조회
- `POST /api/artifacts` - 유물 등록
- `PUT /api/artifacts/:id` - 유물 수정
- `DELETE /api/artifacts/:id` - 유물 삭제

### 이미지 관리
- `POST /api/artifacts/:id/images` - 이미지 업로드

### 통계
- `GET /api/stats` - 통계 데이터 조회

## 배포

### Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### Docker 배포 (예정)
```bash
# Docker 이미지 빌드
docker build -t museum-system .

# 컨테이너 실행
docker run -p 3000:3000 museum-system
```

## 테스트

```bash
# 단위 테스트 실행
npm run test

# 테스트 커버리지
npm run test:coverage
```

## 환경 변수

### 개발 환경
```env
VITE_API_URL=http://localhost:3001/api
NODE_ENV=development
```

### 프로덕션 환경
```env
VITE_API_URL=https://your-domain.com/api
NODE_ENV=production
```

## 사용법

### 1. 첫 로그인
- 대시보드에서 전체 현황 확인
- 새 유물 등록으로 시작

### 2. 유물 등록
- 필수 정보 입력 (이름, 번호)
- 이미지 업로드
- 상세 정보 추가

### 3. 이미지 편집
- 이미지 클릭 후 편집 모드
- 도구 선택 및 주석 추가
- 저장 후 다운로드

### 4. 보존 처리
- 유물 상태 변경
- 처리 기록 작성
- 전후 이미지 비교

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 문의사항

문의사항이나 버그 리포트는 Issues를 통해 남겨주세요.

---

**박물관 유물관리 시스템** - 한국의 문화유산을 디지털로 보존하고 관리합니다.
