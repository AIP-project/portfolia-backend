#!/bin/bash

set -e

# 컬러 출력을 위한 변수
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 시그널 핸들링을 위한 함수
cleanup() {
    log_info "Shutting down gracefully..."
    pm2 stop all
    pm2 delete all
    exit 0
}

# 시그널 트랩 설정
trap cleanup SIGTERM SIGINT

log_info "🚀 Starting application initialization..."

# 데이터베이스 연결 확인 (선택사항)
log_info "🔍 Checking database connection..."
if npx prisma db status > /dev/null 2>&1; then
    log_success "Database connection established"
else
    log_warning "Database connection check failed, but continuing..."
fi

# Prisma 클라이언트 생성
log_info "📦 Generating Prisma client..."
if npx prisma generate; then
    log_success "Prisma client generated successfully"
else
    log_error "Prisma client generation failed"
    exit 1
fi

# 데이터베이스 마이그레이션 실행
log_info "🗄️ Running database migrations..."
if npx prisma migrate deploy; then
    log_success "Database migrations completed successfully"
else
    log_error "Database migrations failed"
    exit 1
fi

# 선택사항: 데이터베이스 시드 실행
if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
    log_info "🌱 Running database seed..."
    if npx prisma db seed; then
        log_success "Database seed completed"
    else
        log_warning "Database seed failed, but continuing..."
    fi
fi

log_info "🎯 Starting PM2 runtime..."

# PM2로 애플리케이션 실행
exec pm2-runtime ecosystem.config.js