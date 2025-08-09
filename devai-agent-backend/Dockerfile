# ============================================
# 🐳 DEVAI AGENT BACKEND - DOCKERFILE
# ============================================

# Imagen base de Node.js LTS
FROM node:18-alpine AS base

# Información del mantenedor
LABEL maintainer="DevAI Team"
LABEL description="Backend API para DevAI Agent - Asistente de desarrollo con IA"
LABEL version="1.0.0"

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S devai -u 1001

# ============================================
# 📦 STAGE: Dependencies
# ============================================
FROM base AS deps

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# ============================================
# 🏗️ STAGE: Builder
# ============================================
FROM base AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo dev)
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma client si existe schema
RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; else echo "No Prisma schema found, skipping"; fi

# Ejecutar build si existe
RUN npm run build || echo "No build script found"

# ============================================
# 🚀 STAGE: Production
# ============================================
FROM base AS production

WORKDIR /app

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Copiar código construido
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Copiar archivos de configuración (opcional)
COPY --from=builder /app/prisma ./prisma 2>/dev/null || echo "No prisma directory found"

# Crear directorios necesarios
RUN mkdir -p storage/uploads storage/temp storage/logs storage/backups && \
    chown -R devai:nodejs storage

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5000
ENV TZ=America/Argentina/Mendoza

# Exponer puerto
EXPOSE 5000

# Cambiar a usuario no-root
USER devai

# Health check corregido
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Comando de inicio con dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# ============================================
# 🔧 STAGE: Development
# ============================================
FROM base AS development

WORKDIR /app

# Instalar todas las dependencias
COPY package*.json ./
RUN npm install

# Copiar código fuente
COPY . .

# Crear directorios
RUN mkdir -p storage/uploads storage/temp storage/logs storage/backups

# Variables de entorno para desarrollo
ENV NODE_ENV=development
ENV PORT=5000

# Exponer puerto y puerto de debug
EXPOSE 5000 9229

# Usuario root para desarrollo (más flexibilidad)
USER root

# Hot reload con nodemon
CMD ["npm", "run", "dev"]