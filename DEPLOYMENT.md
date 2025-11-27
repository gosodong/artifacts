# 국립중앙박물관 유물관리시스템 배포 가이드

## 로컬 개발 환경

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (프론트엔드 + 백엔드)
npm run dev

# 빌드
npm run build

# 프로덕션 미리보기
npm run preview
```

## Docker 배포

### 1. Docker 이미지 빌드

```bash
# 이미지 빌드
docker build -t museum-artifact-system .

# 또는 태그와 함께
docker build -t museum-artifact-system:latest .
docker build -t museum-artifact-system:v1.0 .
```

### 2. Docker 컨테이너 실행

#### 기본 실행
```bash
docker run -d \
  -p 3001:3001 \
  --name museum-app \
  museum-artifact-system
```

#### 데이터 영속성 포함
```bash
docker run -d \
  -p 3001:3001 \
  -v $(pwd)/uploads:/app/uploads \
  --name museum-app \
  museum-artifact-system
```

#### 환경변수 포함
```bash
docker run -d \
  -p 3001:3001 \
  -v $(pwd)/uploads:/app/uploads \
  --env-file .env \
  --name museum-app \
  museum-artifact-system
```

### 3. Docker Compose 사용 (권장)

```bash
# 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 컨테이너 중지
docker-compose down

# 컨테이너 재시작
docker-compose restart
```

## 배포 후 확인

### 헬스 체크
```bash
curl http://localhost:3001/api/health
```

### 로그 확인
```bash
# Docker 로그
docker logs museum-app

# 실시간 로그
docker logs -f museum-app
```

### 컨테이너 상태 확인
```bash
docker ps
docker inspect museum-app
```

## 환경 변수 설정

`.env` 파일 생성:

```env
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=http://localhost:3001,https://yourdomain.com
```

## 트러블슈팅

### 포트 충돌
```bash
# 다른 포트 사용
docker run -d -p 8080:3001 --name museum-app museum-artifact-system
```

### 컨테이너 삭제 후 재시작
```bash
docker stop museum-app
docker rm museum-app
docker run -d -p 3001:3001 --name museum-app museum-artifact-system
```

### 이미지 재빌드
```bash
docker build --no-cache -t museum-artifact-system .
```

## 프로덕션 배포 팁

1. **이미지 최적화**: 멀티스테이지 빌드로 최종 이미지 크기 최소화
2. **헬스 체크**: 자동 재시작 설정으로 안정성 향상
3. **볼륨 마운트**: uploads 디렉토리를 호스트에 마운트하여 데이터 보존
4. **환경 변수**: 민감한 정보는 환경 변수로 관리
5. **로깅**: 컨테이너 로그를 모니터링하여 문제 조기 발견

## 접속 정보

- **프론트엔드**: http://localhost:3001
- **API**: http://localhost:3001/api
- **헬스 체크**: http://localhost:3001/api/health
