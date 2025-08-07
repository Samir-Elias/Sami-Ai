// src/config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

/**
 * 🔧 Configuración base de Swagger
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'DevAI Agent API',
    version: '1.0.0',
    description: `
# DevAI Agent Backend API

API REST para DevAI Agent - Tu asistente de desarrollo con IA.

## Características

- 🤖 **Múltiples proveedores de IA**: Gemini, Groq, HuggingFace, Ollama
- 💬 **Chat inteligente**: Conversaciones contextuales con historial
- 📁 **Análisis de proyectos**: Subida y análisis de archivos de código
- 🔐 **Autenticación JWT**: Seguridad robusta con refresh tokens
- 📊 **Analytics**: Seguimiento de uso y métricas
- 🚀 **Live Preview**: Previsualización de código en tiempo real

## Autenticación

La API usa JWT (JSON Web Tokens) para autenticación. Incluye el token en el header:

Authorization: Bearer YOUR_JWT_TOKEN

## Rate Limiting

- **General**: 100 requests por 15 minutos
- **Auth**: 5 intentos por 15 minutos
- **Upload**: 10 uploads por hora
    `,
    contact: {
      name: 'DevAI Team',
      email: 'support@devai-agent.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.BACKEND_URL || 'http://localhost:3001',
      description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtenido del endpoint /auth/login'
      }
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object', description: 'Response data' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
          error: { type: 'string', example: 'Detailed error information' },
          code: { type: 'string', example: 'ERROR_CODE' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }]
};

/**
 * 🔧 Opciones de Swagger JSDoc
 */
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js')
  ]
};

/**
 * 📚 Generar especificación Swagger
 */
let swaggerSpec;
try {
  swaggerSpec = swaggerJSDoc(swaggerOptions);
} catch (error) {
  console.warn('⚠️ Error generating Swagger spec:', error.message);
  swaggerSpec = { openapi: '3.0.0', info: { title: 'API', version: '1.0.0' }, paths: {} };
}

/**
 * 🎨 Configuración de Swagger UI
 */
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; }
  `,
  customSiteTitle: 'DevAI Agent API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true
  }
};

/**
 * 🔧 Función principal de configuración
 */
const setupSwagger = (app) => {
  try {
    if (process.env.SWAGGER_ENABLED !== 'false') {
      // Endpoint para la especificación JSON
      app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });

      // Swagger UI
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

      // Redirección desde /docs
      app.get('/docs', (req, res) => {
        res.redirect('/api-docs');
      });

      console.log('📚 Swagger UI available at: /api-docs');
    }
  } catch (error) {
    console.warn('⚠️ Swagger setup failed:', error.message);
  }
};

module.exports = setupSwagger;