# Backend bản đi thi trên Render (gói free, 512 MB). Chế độ thử: PGlite nhúng nạp 89 migration + chợ mẫu mỗi lần khởi động
# (dữ liệu luôn sạch, không cần CSDL ngoài); khóa QR/PDF tự sinh. Build từ gốc repo: docker build -f infra/render/backend.Dockerfile .
FROM node:24.18.0-bookworm-slim
WORKDIR /opt/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund && npm cache clean --force
COPY backend/src ./src
COPY backend/assets ./assets
COPY security/lib /opt/security/lib
COPY db/migrations /opt/db/migrations
COPY db/seed /opt/db/seed
COPY db/seed-cho /opt/db/seed-cho
RUN mkdir -p /tmp/agv-tai-lieu && chown node:node /tmp/agv-tai-lieu
USER node
ENV NODE_ENV=production AGV_MOI_TRUONG=thu AGV_DU_LIEU=cho HOST=0.0.0.0 PORT=10000 LOG_LEVEL=warn AGV_DOC_DIR=/tmp/agv-tai-lieu
EXPOSE 10000
CMD ["npx", "tsx", "src/server.ts"]
