# 프로덕션 빌드 스테이지
FROM node:20-alpine

# yarn과 PM2 전역 설치
RUN npm install -g pm2

# 노드 환경변수 설정
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# 애플리케이션 환경 변수
ARG APP_PORT=3000
ENV APP_PORT=${APP_PORT}

EXPOSE ${APP_PORT}

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# package.json과 yarn.lock 복사
COPY package.json yarn.lock ./

# 프로덕션 의존성 설치
RUN yarn install --production --frozen-lockfile

# 빌드된 애플리케이션 복사
COPY ./dist ./dist

# env 파일 복사
COPY .env.${NODE_ENV} .env

# PM2 설정 파일 생성
COPY deploy/ecosystem.config.js .


# PM2로 애플리케이션 실행
CMD ["pm2-runtime", "ecosystem.config.js"]