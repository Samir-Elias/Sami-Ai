const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Importar middlewares personalizados
const { errorHandler, notFoundHandler } = require('./middleware/error');
const { loggingMiddleware } = require('./config/logger');
const { generalRateLimit } = require('./middleware/rateLimit');

// Importar configuraciones
const logger = require('./config/logger');
const swaggerConfig = require('./config/swagger');

// Importar rutas
const routes = require('./routes');

// Crear instancia de Express
const app = express();

// =================================
// MIDDLEWARE DE SEGURIDAD
// =================================

// Helmet para headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS con configuración específica
app.use(cors({
  origin: function (origin, callback) {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:5173',
      'http://localhost:5174',
      'https://devai-agent.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Permitir requests sin origin (apps móviles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ]
}));

// =================================
// MIDDLEWARE GENERAL
// =================================

// Compresión de respuestas
app.use(compression());

// Parsing de JSON y URL encoded
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')));
app.use('/docs', express.static(path.join(__dirname, '../docs')));

// =================================
// MIDDLEWARE PERSONALIZADO
// =================================

// Logging de requests
app.use(loggingMiddleware());

// Rate limiting
app.use(generalRateLimit);

// =================================
// RUTAS DE SALUD Y DOCUMENTACIÓN
// =================================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    }
  });
});

// Status endpoint más detallado
app.get('/status', (req, res) => {
  res.status(200).json({
    service: 'DevAI Agent Backend',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    node_version: process.version,
    memory_usage: process.memoryUsage(),
    cpu_usage: process.cpuUsage(),
    pid: process.pid
  });
});

// Swagger Documentation
if (process.env.NODE_ENV !== 'production') {
  swaggerConfig(app);
}

// =================================
// RUTAS PRINCIPALES DE LA API
// =================================

// Prefijo para todas las rutas de la API
app.use('/api/v1', routes);

// Ruta raíz con información de la API
app.get('/', (req, res) => {
  res.json({
    message: 'DevAI Agent Backend API',
    version: '1.0.0',
    status: 'active',
    documentation: process.env.NODE_ENV !== 'production' ? '/api-docs' : 'Contact admin',
    endpoints: {
      health: '/health',
      status: '/status',
      api: '/api/v1',
      docs: process.env.NODE_ENV !== 'production' ? '/api-docs' : null
    },
    timestamp: new Date().toISOString()
  });
});

// =================================
// MANEJO DE ERRORES
// =================================

// Middleware para rutas no encontradas
app.use(notFoundHandler);

// Middleware global de manejo de errores
app.use(errorHandler);

// =================================
// MANEJO DE SEÑALES DEL SISTEMA
// =================================

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;