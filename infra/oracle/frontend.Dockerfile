# Base đa kiến trúc; Compose OCI chọn linux/arm64, không sao chép node_modules từ host.
FROM node:24.18.0-bookworm-slim
WORKDIR /opt/frontend
COPY frontend/server.mjs frontend/index.html frontend/sw.js ./
COPY frontend/ban ./ban
COPY frontend/mua ./mua
COPY frontend/shared ./shared
COPY frontend/assets ./assets
USER node
EXPOSE 8090
CMD ["node", "server.mjs"]
