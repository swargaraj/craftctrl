FROM jarredsumner/bun:latest

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

EXPOSE 5575

ENV NODE_ENV=production

CMD ["bun", "start"]
