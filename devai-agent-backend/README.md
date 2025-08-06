# 🤖 DevAI Agent Backend

> **Un backend potente y escalable para aplicaciones de IA con múltiples proveedores y gestión completa de conversaciones.**

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Express](https://img.shields.io/badge/Express-4.x-blue.svg)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)
![Redis](https://img.shields.io/badge/Redis-7.x-red.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)

## 🚀 Características Principales

### 🔐 **Autenticación y Seguridad**
- Autenticación JWT con refresh tokens
- Validación robusta de contraseñas
- Rate limiting inteligente
- Middleware de seguridad completo
- Logging de auditoría

### 🤖 **Integración Multi-IA**
- **Gemini** - Google AI
- **Groq** - Inferencia ultra-rápida
- **HuggingFace** - Modelos open source
- **Ollama** - Modelos locales
- Sistema de routing inteligente

### 💬 **Gestión de Conversaciones**
- Conversaciones persistentes
- Historial completo de mensajes
- Contexto inteligente
- Búsqueda avanzada
- Exportación de datos

### 📁 **Gestión de Archivos**
- Upload seguro y validado
- Múltiples tipos de archivo
- Procesamiento automático
- Almacenamiento organizado
- Compresión inteligente

### 📊 **Proyectos y Analíticas**
- Gestión de proyectos de IA
- Métricas de uso detalladas
- Dashboard de analíticas
- Reportes automáticos
- Insights de rendimiento

## 🛠️ Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| **Runtime** | Node.js | 18+ |
| **Framework** | Express.js | 4.x |
| **Base de Datos** | PostgreSQL | 15+ |
| **ORM** | Prisma | 5.x |
| **Cache** | Redis | 7.x |
| **Autenticación** | JWT | - |
| **Validación** | Express Validator | 7.x |
| **Logging** | Winston | 3.x |
| **Documentación** | Swagger | 3.x |
| **Contenedores** | Docker | - |

## 📦 Instalación Rápida

### 📋 Prerrequisitos

```bash
# Node.js 18 o superior
node --version  # v18.0.0+

# npm o yarn
npm --version   # 9.0.0+

# Docker (opcional pero recomendado)
docker --version
```

### 🔧 Configuración del Entorno

```bash
# 1. Clonar repositorio
git clone <tu-repositorio>
cd devai-agent-backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 4. Levantar servicios con Docker
docker-compose up -d

# 5. Configurar base de datos
npx prisma generate
npx prisma migrate dev
npm run db:seed

# 6. ¡Iniciar el servidor!
npm run dev
```

### 🌐 URLs de Acceso

```bash
🖥️  Servidor principal:     http://localhost:3001
📚  Documentación API:      http://localhost:3001/api-docs
🩺  Health check:           http://localhost:3001/health
📊  Status detallado:       http://localhost:3001/status
🔗  API v1:                 http://localhost:3001/api/v1
```

## 📁 Estructura del Proyecto

```
devai-agent-backend/
├── 📄 package.json                 # Dependencias y scripts
├── 📄 docker-compose.yml           # Servicios Docker
├── 📄 Dockerfile                   # Imagen Docker
├── 📄 .env.example                 # Variables de entorno
├── 📄 README.md                    # Este archivo
├── 📄 nodemon.json                 # Configuración nodemon
│
├── 📂 src/                         # Código fuente
│   ├── 📄 app.js                   # Configuración Express
│   ├── 📄 server.js                # Punto de entrada
│   │
│   ├── 📂 config/                  # Configuraciones
│   │   ├── 📄 database.js          # Conexión DB
│   │   ├── 📄 redis.js             # Conexión Redis
│   │   ├── 📄 jwt.js               # Configuración JWT
│   │   ├── 📄 logger.js            # Sistema de logs
│   │   ├── 📄 swagger.js           # Documentación API
│   │   └── 📄 upload.js            # Configuración uploads
│   │
│   ├── 📂 middleware/              # Middlewares
│   │   ├── 📄 auth.js              # Autenticación
│   │   ├── 📄 validation.js        # Validaciones
│   │   ├── 📄 rateLimit.js         # Rate limiting
│   │   ├── 📄 error.js             # Manejo errores
│   │   ├── 📄 logger.js            # Logging requests
│   │   └── 📄 upload.js            # Upload archivos
│   │
│   ├── 📂 routes/                  # Rutas de la API
│   │   ├── 📄 index.js             # Router principal
│   │   ├── 📄 auth.js              # Autenticación ✅
│   │   ├── 📄 users.js             # Usuarios
│   │   ├── 📄 conversations.js     # Conversaciones
│   │   ├── 📄 messages.js          # Mensajes
│   │   ├── 📄 projects.js          # Proyectos
│   │   ├── 📄 files.js             # Archivos
│   │   ├── 📄 ai.js                # IA
│   │   └── 📄 analytics.js         # Analíticas
│   │
│   ├── 📂 controllers/             # Controladores
│   │   ├── 📄 authController.js    # Auth ✅
│   │   ├── 📄 userController.js    # Usuarios
│   │   ├── 📄 conversationController.js
│   │   ├── 📄 messageController.js
│   │   ├── 📄 projectController.js
│   │   ├── 📄 fileController.js
│   │   ├── 📄 aiController.js
│   │   └── 📄 analyticsController.js
│   │
│   ├── 📂 services/                # Lógica de negocio
│   │   ├── 📄 authService.js
│   │   ├── 📄 userService.js
│   │   ├── 📄 conversationService.js
│   │   ├── 📄 messageService.js
│   │   ├── 📄 projectService.js
│   │   ├── 📄 fileService.js
│   │   ├── 📄 aiService.js
│   │   ├── 📄 cacheService.js
│   │   ├── 📄 emailService.js
│   │   └── 📄 analyticsService.js
│   │
│   ├── 📂 models/                  # Modelos de datos
│   │   ├── 📄 User.js
│   │   ├── 📄 Conversation.js
│   │   ├── 📄 Message.js
│   │   ├── 📄 Project.js
│   │   ├── 📄 File.js
│   │   └── 📄 ApiKey.js
│   │
│   ├── 📂 ai/                      # Integraciones IA
│   │   ├── 📄 geminiClient.js
│   │   ├── 📄 groqClient.js
│   │   ├── 📄 huggingfaceClient.js
│   │   ├── 📄 ollamaClient.js
│   │   └── 📄 aiRouter.js
│   │
│   ├── 📂 utils/                   # Utilidades
│   │   ├── 📄 constants.js         # Constantes
│   │   ├── 📄 helpers.js           # Funciones auxiliares
│   │   ├── 📄 validators.js        # Validadores ✅
│   │   ├── 📄 encryption.js        # Encriptación
│   │   ├── 📄 fileUtils.js         # Utilidades archivos
│   │   ├── 📄 dateUtils.js         # Utilidades fechas
│   │   └── 📄 responseUtils.js     # Respuestas API
│   │
│   └── 📂 database/                # Base de datos
│       ├── 📄 schema.prisma        # Schema Prisma ✅
│       └── 📄 seed.js              # Datos iniciales ✅
│
├── 📂 storage/                     # Almacenamiento
│   ├── 📂 uploads/                 # Archivos subidos
│   │   ├── 📂 images/
│   │   ├── 📂 documents/
│   │   ├── 📂 code/
│   │   └── 📂 archives/
│   ├── 📂 temp/                    # Archivos temporales
│   ├── 📂 logs/                    # Logs del sistema
│   └── 📂 backups/                 # Respaldos
│
├── 📂 tests/                       # Tests
│   ├── 📂 unit/                    # Tests unitarios
│   ├── 📂 integration/             # Tests integración
│   └── 📂 fixtures/                # Datos de prueba
│
├── 📂 docs/                        # Documentación
│   └── 📂 swagger/                 # Specs OpenAPI
│
└── 📂 scripts/                     # Scripts utilidad
```

## 🔧 Scripts Disponibles

```bash
# 🚀 Desarrollo
npm run dev              # Iniciar con nodemon
npm start                # Iniciar en producción

# 🗄️ Base de datos
npm run db:generate      # Generar Prisma client
npm run db:migrate       # Ejecutar migraciones
npm run db:seed          # Cargar datos iniciales
npm run db:reset         # Resetear BD (dev only)
npm run db:studio        # Abrir Prisma Studio

# 🧪 Testing
npm test                 # Ejecutar tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con cobertura

# 🔍 Calidad de código
npm run lint             # ESLint
npm run lint:fix         # Arreglar errores ESLint
npm run format           # Prettier

# 🐳 Docker
npm run docker:build     # Construir imagen
npm run docker:up        # Levantar servicios
npm run docker:down      # Bajar servicios

# 📦 Producción
npm run build            # Preparar para producción
npm run pm2:start        # Iniciar con PM2
npm run pm2:stop         # Parar PM2
```

## 🌍 Variables de Entorno

### 📋 Requeridas

```bash
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/devai_agent"

# JWT
JWT_SECRET="tu-clave-secreta-muy-segura-de-al-menos-32-caracteres"

# Entorno
NODE_ENV="development"
PORT=3001
```

### 🔧 Opcionales

```bash
# Redis (opcional)
REDIS_URL="redis://localhost:6379"

# APIs de IA
GEMINI_API_KEY="tu-clave-gemini"
GROQ_API_KEY="tu-clave-groq"
HUGGINGFACE_API_KEY="tu-clave-huggingface"
OLLAMA_URL="http://localhost:11434"

# Email (futuro)
SMTP_HOST="smtp.ejemplo.com"
SMTP_PORT=587
SMTP_USER="tu-email"
SMTP_PASS="tu-password"

# Frontend
FRONTEND_URL="http://localhost:3000"

# Configuraciones adicionales
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
UPLOAD_MAX_SIZE="50mb"
```

## 🚀 API Endpoints

### 🔐 Autenticación
```
POST   /api/v1/auth/register     # Registrar usuario
POST   /api/v1/auth/login        # Iniciar sesión
POST   /api/v1/auth/logout       # Cerrar sesión
POST   /api/v1/auth/refresh      # Renovar token
GET    /api/v1/auth/profile      # Obtener perfil
GET    /api/v1/auth/verify       # Verificar token
```

### 👤 Usuarios
```
GET    /api/v1/users             # Listar usuarios
GET    /api/v1/users/profile     # Mi perfil
PUT    /api/v1/users/profile     # Actualizar perfil
DELETE /api/v1/users/profile     # Eliminar cuenta
```

### 💬 Conversaciones
```
GET    /api/v1/conversations     # Mis conversaciones
POST   /api/v1/conversations     # Nueva conversación
GET    /api/v1/conversations/:id # Obtener conversación
PUT    /api/v1/conversations/:id # Actualizar conversación
DELETE /api/v1/conversations/:id # Eliminar conversación
```

### 📝 Mensajes
```
GET    /api/v1/conversations/:id/messages  # Mensajes
POST   /api/v1/conversations/:id/messages  # Nuevo mensaje
GET    /api/v1/messages/:id                # Obtener mensaje
PUT    /api/v1/messages/:id                # Actualizar mensaje
DELETE /api/v1/messages/:id                # Eliminar mensaje
```

### 🤖 IA
```
POST   /api/v1/ai/chat          # Chat con IA
GET    /api/v1/ai/models        # Modelos disponibles
GET    /api/v1/ai/providers     # Proveedores activos
```

### 📁 Archivos
```
POST   /api/v1/files/upload     # Subir archivo
GET    /api/v1/files            # Mis archivos
GET    /api/v1/files/:id        # Obtener archivo
DELETE /api/v1/files/:id        # Eliminar archivo
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests específicos
npm test -- --grep "auth"

# Tests con cobertura
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## 🚢 Deployment

### 🐳 Docker

```bash
# Construir imagen
docker build -t devai-agent-backend .

# Ejecutar contenedor
docker run -p 3001:3001 --env-file .env devai-agent-backend

# Usando docker-compose
docker-compose up -d
```

### ☁️ Vercel/Railway/Render

```bash
# 1. Configurar variables de entorno en la plataforma
# 2. Conectar repositorio
# 3. La plataforma detectará automáticamente el proyecto Node.js
```

### 🖥️ VPS/Servidor

```bash
# 1. Clonar repositorio
git clone <tu-repo>
cd devai-agent-backend

# 2. Instalar dependencias
npm ci --production

# 3. Configurar PM2
npm install -g pm2
npm run pm2:start

# 4. Configurar nginx (opcional)
# Ver docs/nginx.conf
```

## 🤝 Contribuir

1. **Fork** el proyecto
2. **Crea** una rama (`git checkout -b feature/nueva-caracteristica`)
3. **Commit** tus cambios (`git commit -m 'Add: nueva característica'`)
4. **Push** a la rama (`git push origin feature/nueva-caracteristica`)
5. **Abre** un Pull Request

## 📝 Convenciones

### 🏷️ Commits
```bash
feat: nueva característica
fix: corrección de bug
docs: documentación
style: formato/estilo
refactor: refactorización
test: tests
chore: mantenimiento
```

### 📁 Archivos
- **camelCase** para variables y funciones
- **PascalCase** para clases y componentes
- **kebab-case** para archivos y URLs
- **UPPER_CASE** para constantes

## 🔒 Seguridad

- ✅ Autenticación JWT robusta
- ✅ Rate limiting inteligente
- ✅ Validación de entrada estricta
- ✅ Headers de seguridad (Helmet)
- ✅ CORS configurado
- ✅ Logging de auditoría
- ✅ Sanitización de datos

## 📊 Monitoreo

### 🔍 Logs
```bash
# Ver logs en tiempo real
tail -f storage/logs/combined.log

# Logs por nivel
grep "ERROR" storage/logs/error.log
grep "WARN" storage/logs/combined.log
```

### 📈 Métricas
- Health checks automáticos
- Métricas de rendimiento
- Uso de memoria y CPU
- Estadísticas de API

## 🆘 Solución de Problemas

### ❌ Errores Comunes

**Error: "Cannot connect to database"**
```bash
# Verificar que PostgreSQL esté ejecutándose
docker-compose up -d postgres

# Verificar configuración en .env
echo $DATABASE_URL
```

**Error: "JWT Secret not found"**
```bash
# Asegurar que JWT_SECRET está en .env
echo $JWT_SECRET

# Generar nuevo secret
openssl rand -base64 32
```

**Error: "Port 3001 already in use"**
```bash
# Cambiar puerto en .env
PORT=3002

# O matar proceso existente
lsof -ti:3001 | xargs kill
```

## 📚 Recursos Adicionales

- 📖 [Documentación Prisma](https://prisma.io/docs)
- 📖 [Express.js Guide](https://expressjs.com/guide)
- 📖 [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp)
- 📖 [Node.js Security](https://nodejs.org/en/security/)

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Ver el archivo `LICENSE` para más detalles.

---

## 👥 Equipo

**Desarrollado con ❤️ por el equipo de DevAI Agent**

¿Preguntas? ¿Sugerencias? ¡Abre un issue o contacta al equipo!

---

## 🎯 Roadmap

### ✅ **Fase 1 - Completada**
- [x] Infraestructura básica
- [x] Autenticación JWT
- [x] Base de datos con Prisma
- [x] Sistema de archivos
- [x] Documentación API

### 🚧 **Fase 2 - En Desarrollo**
- [ ] Integración completa de IA
- [ ] Sistema de conversaciones
- [ ] Dashboard de analíticas
- [ ] Notificaciones en tiempo real
- [ ] API de webhooks

### 🔮 **Fase 3 - Futuro**
- [ ] Integración con más proveedores de IA
- [ ] Sistema de plugins
- [ ] Análisis de sentimientos
- [ ] Auto-scaling dinámico
- [ ] Marketplace de prompts

---

**¡Gracias por usar DevAI Agent Backend! 🚀**