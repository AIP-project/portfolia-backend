# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# 의존성 파일 복사
COPY package.json yarn.lock ./
COPY prisma ./prisma

# 모든 의존성 설치 (dev dependencies 포함)
RUN yarn install --frozen-lockfile

# Prisma 클라이언트 생성
RUN npx prisma generate

# Production stage
FROM node:20-alpine AS production

# 필요한 패키지 설치
RUN apk add --no-cache bash && \
    npm install -g pm2 prisma

# 노드 환경변수 설정
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

ARG APP_PORT=3000
ENV APP_PORT=${APP_PORT}

EXPOSE ${APP_PORT}

WORKDIR /usr/src/app

# package.json과 의존성 복사
COPY package.json yarn.lock ./

# 프로덕션 의존성만 설치
RUN yarn install --production --frozen-lockfile

# 빌드 스테이지에서 생성된 Prisma 클라이언트 복사
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma

# Prisma 스키마 복사 (마이그레이션용)
COPY prisma ./prisma

# 빌드된 애플리케이션 복사
COPY ./dist ./dist

# 시작 스크립트 복사 및 권한 설정
COPY deploy/start.sh ./
RUN chmod +x start.sh

# 환경변수 파일 복사
COPY .env.${NODE_ENV} .env

# PM2 설정 파일 복사
COPY deploy/ecosystem.config.js .

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${APP_PORT}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["./start.sh"]