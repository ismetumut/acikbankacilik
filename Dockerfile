# Akort backend API — taşınabilir konteyner (Render/Railway/Fly/kendi sunucunuz).
FROM node:22-slim

WORKDIR /app

# Bağımlılıklar (tsx devDependency olduğu için --include=dev).
COPY package.json package-lock.json ./
RUN npm install --include=dev

# Kaynak (frontend seed verisini de içerdiği için src/ dahil).
COPY server ./server
COPY src ./src
COPY tsconfig.json ./

ENV PORT=8787
ENV DATABASE_PATH=/data/akort.db
EXPOSE 8787

# SQLite verisi için kalıcı hacim.
VOLUME ["/data"]

CMD ["npm", "run", "server:start"]
