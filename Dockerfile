# ----------------------------------------------------------------
# Stage 1: Builder (빌드 및 종속성 설치)
# ----------------------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app

# 빌드 및 런타임에 필요한 시스템 패키지 설치
# (Python, make, g++는 Node.js 네이티브 모듈 컴파일에 필요)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 1. 종속성 파일을 먼저 복사하여 캐시를 활용
#    (package.json이 바뀌지 않으면 npm ci 단계를 캐시 재사용)
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --verbose

# 2. 소스 코드를 복사 (소스가 변경되면 이 레이어 이후 모두 다시 빌드됨)
COPY . .

# 3. 프론트엔드/백엔드 빌드
#    (소스가 변경될 때만 이 RUN 단계가 다시 실행됨)
RUN npm run build

# ----------------------------------------------------------------
# Stage 2: Runner (최종 실행 환경)
# ----------------------------------------------------------------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# 1. 런타임 종속성 설치를 위해 패키지 파일 복사
#    (builder 스테이지에서 설치된 종속성을 다시 설치하지 않음)
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --omit=dev --verbose

# 2. builder 스테이지에서 만들어진 결과물 복사
#    (빌드된 JS/프론트엔드 파일만 복사, 소스는 포함X)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api

# 3. 업로드 디렉토리 생성
#    (호스트 볼륨 마운트 시 필요)
RUN mkdir -p ./uploads

# 포트 및 헬스 체크 설정은 그대로 유지
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 서버 시작 (npx tsx 사용)
CMD ["npx", "tsx", "api/server.ts"]