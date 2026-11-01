# Base đa kiến trúc; Compose OCI chọn linux/arm64, không sao chép node_modules từ host.
FROM node:24.18.0-bookworm-slim
WORKDIR /opt/frontend
COPY frontend/server.mjs frontend/index.html frontend/sw.js ./
COPY frontend/ban ./ban
COPY frontend/mua ./mua
COPY frontend/shared ./shared
COPY frontend/assets ./assets
# Màn app bán mới (Sổ vườn, gọi backend thật) + thư viện hiệu ứng/linh vật app cũ cần + mô hình quy trình công khai.
# Trang mô phỏng trong thiet-ke/ vẫn được chép nhưng server.mjs trả 404 khi không bật AGV_TEST_TOOLS / AGV_MOI_TRUONG=thu.
COPY frontend/thiet-ke ./thiet-ke
COPY frontend/tham-khao ./tham-khao
COPY frontend/mo-phong-quy-trinh ./mo-phong-quy-trinh
USER node
EXPOSE 8090
CMD ["node", "server.mjs"]
