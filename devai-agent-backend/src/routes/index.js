const express = require('express');
const logger = require('../config/logger');

// Crear router principal
const router = express.Router();

// =================================
// MIDDLEWARE PARA LOGGING DE RUTAS
// =================================

router.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      logger.warn('API Request Error:', logData);
    } else {
      logger.info('API Request:', logData);
    }
  });
  
  next();
});

// =================================
// INFORMACIÓN DE LA API
// =================================

router.get('/', (req, res) => {
  res.json({
    message: 'DevAI Agent API v1',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      // Autenticación
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        logout: 'POST /auth/logout',
        refresh: 'POST /auth/refresh',
        profile: 'GET /auth/profile'
      },
      // Usuarios
      users: {
        list: 'GET /users',
        profile: 'GET /users/profile',
        update: 'PUT /users/profile',
        delete: 'DELETE /users/profile'
      },
      // Conversaciones
      conversations: {
        list: 'GET /conversations',
        create: 'POST /conversations',
        get: 'GET /conversations/:id',
        update: 'PUT /conversations/:id',
        delete: 'DELETE /conversations/:id'
      },
      // Mensajes
      messages: {
        list: 'GET /conversations/:id/messages',
        create: 'POST /conversations/:id/messages',
        get: 'GET /messages/:id',
        update: 'PUT /messages/:id',
        delete: 'DELETE /messages/:id'
      },
      // Proyectos
      projects: {
        list: 'GET /projects',
        create: 'POST /projects', 
        get: 'GET /projects/:id',
        update: 'PUT /projects/:id',
        delete: 'DELETE /projects/:id'
      },
      // Archivos
      files: {
        upload: 'POST /files/upload',
        list: 'GET /files',
        get: 'GET /files/:id',
        download: 'GET /files/:id/download',
        delete: 'DELETE /files/:id'
      },
      // IA
      ai: {
        chat: 'POST /ai/chat',
        models: 'GET /ai/models',
        providers: 'GET /ai/providers'
      },
      // Analíticas
      analytics: {
        dashboard: 'GET /analytics/dashboard',
        usage: 'GET /analytics/usage',
        conversations: 'GET /analytics/conversations'
      }
    },
    documentation: process.env.NODE_ENV !== 'production' ? '/api-docs' : 'Contact admin'
  });
});

// =================================
// IMPORTAR Y CONFIGURAR RUTAS
// =================================

// Rutas de autenticación
try {
  const authRoutes = require('./auth');
  router.use('/auth', authRoutes);
  logger.info('✅ Auth routes loaded');
} catch (error) {
  logger.warn('⚠️ Auth routes not available:', error.message);
  
  // Ruta temporal mientras no existe el archivo
  router.use('/auth', (req, res) => {
    res.status(501).json({
      error: 'Auth routes not implemented yet',
      message: 'Authentication endpoints are under development',
      available_soon: true
    });
  });
}

// Rutas de usuarios
try {
  const userRoutes = require('./users');
  router.use('/users', userRoutes);
  logger.info('✅ User routes loaded');
} catch (error) {
  logger.warn('⚠️ User routes not available:', error.message);
  
  router.use('/users', (req, res) => {
    res.status(501).json({
      error: 'User routes not implemented yet',
      message: 'User management endpoints are under development',
      available_soon: true
    });
  });
}

// Rutas de conversaciones
try {
  const conversationRoutes = require('./conversations');
  router.use('/conversations', conversationRoutes);
  logger.info('✅ Conversation routes loaded');
} catch (error) {
  logger.warn('⚠️ Conversation routes not available:', error.message);
  
  router.use('/conversations', (req, res) => {
    res.status(501).json({
      error: 'Conversation routes not implemented yet',
      message: 'Conversation endpoints are under development',
      available_soon: true
    });
  });
}

// Rutas de mensajes
try {
  const messageRoutes = require('./messages');
  router.use('/messages', messageRoutes);
  logger.info('✅ Message routes loaded');
} catch (error) {
  logger.warn('⚠️ Message routes not available:', error.message);
  
  router.use('/messages', (req, res) => {
    res.status(501).json({
      error: 'Message routes not implemented yet',
      message: 'Message endpoints are under development',
      available_soon: true
    });
  });
}

// Rutas de proyectos
try {
  const projectRoutes = require('./projects');
  router.use('/projects', projectRoutes);
  logger.info('✅ Project routes loaded');
} catch (error) {
  logger.warn('⚠️ Project routes not available:', error.message);
  
  router.use('/projects', (req, res) => {
    res.status(501).json({
      error: 'Project routes not implemented yet',
      message: 'Project management endpoints are under development',
      available_soon: true
    });
  });
}

// Rutas de archivos
try {
  const fileRoutes = require('./files');
  router.use('/files', fileRoutes);
  logger.info('✅ File routes loaded');
} catch (error) {
  logger.warn('⚠️ File routes not available:', error.message);
  
  router.use('/files', (req, res) => {
    res.status(501).json({
      error: 'File routes not implemented yet',
      message: 'File management endpoints are under development',
      available_soon: true
    });
  });
}

// Rutas de IA
try {
  const aiRoutes = require('./ai');
  router.use('/ai', aiRoutes);
  logger.info('✅ AI routes loaded');
} catch (error) {
  logger.warn('⚠️ AI routes not available:', error.message);
  
  router.use('/ai', (req, res) => {
    res.status(501).json({
      error: 'AI routes not implemented yet',
      message: 'AI integration endpoints are under development',
      available_soon: true
    });
  });
}

// Rutas de analíticas
try {
  const analyticsRoutes = require('./analytics');
  router.use('/analytics', analyticsRoutes);
  logger.info('✅ Analytics routes loaded');
} catch (error) {
  logger.warn('⚠️ Analytics routes not available:', error.message);
  
  router.use('/analytics', (req, res) => {
    res.status(501).json({
      error: 'Analytics routes not implemented yet',
      message: 'Analytics endpoints are under development',
      available_soon: true
    });
  });
}

// =================================
// RUTAS DE TESTING Y DEBUG
// =================================

if (process.env.NODE_ENV !== 'production') {
  // Ruta para testing
  router.get('/test', (req, res) => {
    res.json({
      message: 'Test endpoint working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      headers: req.headers,
      query: req.query,
      ip: req.ip
    });
  });
  
  // Ruta para debug
  router.get('/debug', (req, res) => {
    res.json({
      message: 'Debug information',
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      },
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        params: req.params,
        ip: req.ip
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_URL: process.env.DATABASE_URL ? '[HIDDEN]' : 'Not set',
        JWT_SECRET: process.env.JWT_SECRET ? '[HIDDEN]' : 'Not set'
      }
    });
  });
}

// =================================
// MIDDLEWARE DE ERROR PARA RUTAS
// =================================

router.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: `The endpoint ${req.method} ${req.baseUrl}${req.path} does not exist`,
    available_endpoints: '/api/v1',
    documentation: process.env.NODE_ENV !== 'production' ? '/api-docs' : 'Contact admin',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;