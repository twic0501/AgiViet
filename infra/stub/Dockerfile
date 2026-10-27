FROM node:24.18.0-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node . .
RUN mkdir -p /data/docs /data/uploads && chown -R node:node /data
USER node
ENV NODE_ENV=production DOC_DIR=/data/docs UPLOAD_DIR=/data/uploads
EXPOSE 8080
CMD ["node", "server.mjs"]
