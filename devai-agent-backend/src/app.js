// src/app.js - Aplicación Express principal
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Importar configuraciones
const logger = require('./config/logger');

// 🚨 IMPORTAR RUTAS (ESTO ES LO QUE FALTABA)
const apiRoutes = require('./routes/index');

// Crear aplicación Express
const app = express();

// =================================
// 📋 MIDDLEWARE DE SEGURIDAD Y BÁSICO
// =================================

// Helmet para headers de seguridad (configuración permisiva para desarrollo)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configurado para desarrollo
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Accept', 'Origin']
}));

// Logging de requests (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined', { 
    stream: { write: msg => logger.info(msg.trim()) },
    skip: (req, res) => req.url === '/health' // No loggear health checks
  }));
}

// Parsers de body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

// =================================
// 🔧 MIDDLEWARE DE DEBUG Y MONITOREO
// =================================

// Middleware de logging detallado para debug
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log de request entrante
  logger.info(`📥 ${req.method} ${req.url} - ${req.ip}`);
  
  // Timeout de seguridad para requests
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn(`⏰ Request timeout: ${req.method} ${req.url}`);
      res.status(408).json({ 
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
        timestamp: timestamp
      });
    }
  }, 30000); // 30 segundos

  // Limpiar timeout cuando la respuesta termine
  res.on('finish', () => {
    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    const status = res.statusCode >= 400 ? '❌' : '✅';
    logger.info(`${status} ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// =================================
// 🌐 RUTAS PRINCIPALES
// =================================

// 🏥 Ruta de salud básica (DEBE RESPONDER SIEMPRE)
app.get('/health', (req, res) => {
  logger.info('🏥 Health check requested');
  
  const healthStatus = {
    status: 'OK',
    service: 'DevAI Agent Backend',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    node_version: process.version
  };
  
  res.status(200).json(healthStatus);
  logger.info('✅ Health check response sent');
});

// 📚 Ruta de documentación básica
app.get('/api-docs', (req, res) => {
  logger.info('📚 API docs requested');
  
  const apiInfo = {
    title: 'DevAI Agent Backend API',
    version: '1.0.0',
    description: 'Backend API para DevAI Agent con integración de múltiples servicios de IA',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /health': 'Verificar salud del servicio',
      'GET /api-docs': 'Esta documentación',
      'GET /': 'Información general de la API',
      'POST /ai/chat': 'Enviar mensaje a servicios de IA',
      'GET /ai/status': 'Estado de proveedores de IA',
      'GET /ai/models': 'Modelos disponibles por proveedor',
      'POST /files/upload': 'Subir archivos para análisis',
      'POST /files/analyze': 'Analizar archivos subidos',
      'GET /conversations': 'Listar conversaciones guardadas',
      'POST /conversations': 'Guardar nueva conversación'
    },
    contact: {
      developer: 'DevAI Agent Team',
      repository: 'https://github.com/user/devai-agent-backend'
    }
  };
  
  res.status(200).json(apiInfo);
  logger.info('✅ API docs response sent');
});

// 🚨 CRÍTICO: REGISTRAR LAS RUTAS DE LA API
app.use('/', apiRoutes);

// =================================
// 🚫 MANEJO DE ERRORES Y 404
// =================================

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  logger.warn(`🔍 Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableRoutes: {
      'GET /health': 'Health check',
      'GET /api-docs': 'API documentation', 
      'GET /': 'API information',
      'POST /ai/chat': 'AI chat endpoint',
      'GET /ai/status': 'AI providers status'
    },
    timestamp: new Date().toISOString()
  });
});

// Middleware global de manejo de errores
app.use((error, req, res, next) => {
  logger.error(`💥 Unhandled error in ${req.method} ${req.url}:`, error);
  
  // No enviar stack trace en producción
  const errorResponse = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: error.message,
    timestamp: new Date().toISOString()
  };
  
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      name: error.name,
      code: error.code,
      status: error.status
    };
  }
  
  res.status(error.status || 500).json(errorResponse);
});

// =================================
// 🔧 FUNCIONES DE UTILIDAD
// =================================

// Función para obtener información del servidor
app.getServerInfo = () => {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    routes: app._router ? app._router.stack.length : 0
  };
};

// =================================
// EXPORTAR APLICACIÓN
// =================================

module.exports = app;