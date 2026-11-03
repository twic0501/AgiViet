# Backend bản đi thi trên Render free (512 MB). Đặt DATABASE_URL (vai agv_backend_gateway trên Neon, nạp bằng
# infra/render/nap-csdl.mjs THU=1) → nối Postgres ngoài, RAM đo ~190–290 MB. Không đặt DATABASE_URL → PGlite nhúng
# (~600–700 MB, KHÔNG vừa gói free; chỉ dùng chạy thử máy mạnh). Chế độ thử: khóa QR/PDF tự sinh, có đồng hồ thử.
# Build từ gốc repo: docker build -f infra/render/backend.Dockerfile .
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
ENV NODE_ENV=production AGV_MOI_TRUONG=thu AGV_DU_LIEU=cho AGV_DONG_HO_THU=1 AGV_PG_POOL_MAX=4 \
    HOST=0.0.0.0 PORT=10000 LOG_LEVEL=warn AGV_DOC_DIR=/tmp/agv-tai-lieu
EXPOSE 10000
CMD ["node", "--import", "/opt/backend/node_modules/tsx/dist/loader.mjs", "src/server.ts"]
