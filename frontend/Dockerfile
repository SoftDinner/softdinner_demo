# Frontend Dockerfile (개발 모드)
# Next.js 16 requires Node.js >= 20.9.0
FROM node:20-alpine

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (React 19 호환성을 위해 legacy-peer-deps 사용)
RUN npm install --legacy-peer-deps

# 나머지 파일 복사 (개발 모드에서는 볼륨 마운트로 덮어씌워짐)
COPY . .

# 포트 3000 노출
EXPOSE 3000

# 개발 모드 실행 (핫 리로드 지원)
CMD ["npm", "run", "dev"]

