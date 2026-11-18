FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node src ./src
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node scripts ./scripts
USER node
ENV NODE_ENV=production
EXPOSE 8000
CMD ["sh", "-c", "node src/db/migrate.js && exec node src/index.js"]
