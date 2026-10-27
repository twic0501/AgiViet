# Base đa kiến trúc; Compose OCI chọn linux/arm64, không sao chép node_modules từ host.
FROM node:24.18.0-bookworm-slim
WORKDIR /opt/backend
# npm start dùng tsx trong devDependencies; cần giữ nó khi cài.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund && npm cache clean --force
ENV NODE_ENV=production
COPY backend/src ./src
COPY backend/assets ./assets
COPY security/lib /opt/security/lib
COPY db/migrations /opt/db/migrations
COPY db/seed /opt/db/seed
COPY infra/oracle/backend-entrypoint.sh /opt/oracle/backend-entrypoint.sh
RUN mkdir /data && chown node:node /data && ln -s /data .du-lieu
USER node
EXPOSE 8080
ENTRYPOINT ["bash", "/opt/oracle/backend-entrypoint.sh"]
CMD ["npm", "start"]
