# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Устанавливаем bun для быстрой установки зависимостей
RUN npm install -g bun

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .

# Передаём переменные окружения в сборку (через ARG → ENV)
ARG VITE_ORG_DOMAINS_URL
ARG VITE_TECH_DOMAINS_URL
ARG VITE_TECHNOLOGIES_URL
ARG VITE_REQUIREMENTS_URL
ARG VITE_DECISIONS_URL
ARG VITE_HARDENING_URL
ARG VITE_ARCH_TEMPLATES_URL

ENV VITE_ORG_DOMAINS_URL=$VITE_ORG_DOMAINS_URL
ENV VITE_TECH_DOMAINS_URL=$VITE_TECH_DOMAINS_URL
ENV VITE_TECHNOLOGIES_URL=$VITE_TECHNOLOGIES_URL
ENV VITE_REQUIREMENTS_URL=$VITE_REQUIREMENTS_URL
ENV VITE_DECISIONS_URL=$VITE_DECISIONS_URL
ENV VITE_HARDENING_URL=$VITE_HARDENING_URL
ENV VITE_ARCH_TEMPLATES_URL=$VITE_ARCH_TEMPLATES_URL

RUN bun run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
