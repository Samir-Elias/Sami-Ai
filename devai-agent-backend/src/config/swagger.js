// ============================================
// 📚 SWAGGER CONFIGURATION
// ============================================

import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

## Rate Limiting

- **General**: 100 requests por 15 minutos
- **Auth**: 5 intentos por 15 minutos
- **Upload**: 10 uploads por hora

## Códigos de Error

- **400**: Bad Request - Datos inválidos
- **401**: Unauthorized - Token inválido o faltante
- **403**: Forbidden - Sin permisos
- **404**: Not Found - Recurso no encontrado
- **429**: Too Many Requests - Rate limit excedido
- **500**: Internal Server Error - Error del servidor
    `,
    contact: {
      name: 'DevAI Team',
      email: 'support@devai-agent.com',
      url: 'https://devai-agent.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.BACKEND_URL || 'http://localhost:5000',
      description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server'
    },
    {
      url: 'https://api.devai-agent.com',
      description: 'Production Server'
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Autenticación y autorización'
    },
    {
      name: 'Users',
      description: 'Gestión de usuarios'
    },
    {
      name: 'Conversations',
      description: 'Gestión de conversaciones'
    },
    {
      name: 'Messages',
      description: 'Gestión de mensajes'
    },
    {
      name: 'Projects',
      description: 'Gestión de proyectos'
    },
    {
      name: 'Files',
      description: 'Gestión de archivos'
    },
    {
      name: 'AI',
      description: 'Integración con APIs de IA'
    },
    {
      name: 'Analytics',
      description: 'Métricas y analytics'
    },
    {
      name: 'System',
      description: 'Endpoints del sistema'
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
      // Esquemas de respuesta
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully'
          },
          data: {
            type: 'object',
            description: 'Response data'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Error message'
          },
          error: {
            type: 'string',
            example: 'Detailed error information'
          },
          code: {
            type: 'string',
            example: 'ERROR_CODE'
          }
        }
      },
      
      // Esquemas de entidades
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clpx1234567890'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          username: {
            type: 'string',
            example: 'developer'
          },
          name: {
            type: 'string',
            example: 'John Developer'
          },
          avatar: {
            type: 'string',
            format: 'uri',
            example: '/uploads/avatars/avatar.jpg'
          },
          preferences: {
            type: 'object',
            example: {
              theme: 'dark',
              language: 'es'
            }
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      
      Conversation: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clpx1234567890'
          },
          title: {
            type: 'string',
            example: 'React Component Optimization'
          },
          preview: {
            type: 'string',
            example: 'Discussion about optimizing React components'
          },
          aiProvider: {
            type: 'string',
            enum: ['gemini', 'groq', 'huggingface', 'ollama'],
            example: 'gemini'
          },
          aiModel: {
            type: 'string',
            example: 'gemini-1.5-flash'
          },
          messageCount: {
            type: 'integer',
            example: 5
          },
          totalTokens: {
            type: 'integer',
            example: 1250
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      
      Message: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clpx1234567890'
          },
          role: {
            type: 'string',
            enum: ['user', 'assistant', 'system'],
            example: 'user'
          },
          content: {
            type: 'string',
            example: 'How can I optimize my React components?'
          },
          aiProvider: {
            type: 'string',
            example: 'gemini'
          },
          aiModel: {
            type: 'string',
            example: 'gemini-1.5-flash'
          },
          thinking: {
            type: 'string',
            example: 'Analyzing React optimization techniques...'
          },
          totalTokens: {
            type: 'integer',
            example: 250
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      
      Project: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clpx1234567890'
          },
          name: {
            type: 'string',
            example: 'React Todo App'
          },
          description: {
            type: 'string',
            example: 'A simple todo application built with React'
          },
          totalFiles: {
            type: 'integer',
            example: 15
          },
          totalSize: {
            type: 'integer',
            description: 'Size in bytes',
            example: 1048576
          },
          totalLines: {
            type: 'integer',
            example: 1250
          },
          primaryLanguage: {
            type: 'string',
            example: 'javascript'
          },
          languages: {
            type: 'object',
            example: {
              javascript: 10,
              css: 3,
              html: 2
            }
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      
      ProjectFile: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clpx1234567890'
          },
          name: {
            type: 'string',
            example: 'App.js'
          },
          path: {
            type: 'string',
            example: 'src/App.js'
          },
          size: {
            type: 'integer',
            example: 2048
          },
          type: {
            type: 'string',
            example: '.js'
          },
          language: {
            type: 'string',
            example: 'javascript'
          },
          lineCount: {
            type: 'integer',
            example: 85
          },
          content: {
            type: 'string',
            example: 'import React from "react";...'
          }
        }
      },
      
      ApiKey: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'clpx1234567890'
          },
          provider: {
            type: 'string',
            enum: ['gemini', 'groq', 'huggingface', 'openai'],
            example: 'gemini'
          },
          name: {
            type: 'string',
            example: 'Gemini Production Key'
          },
          isActive: {
            type: 'boolean',
            example: true
          },
          isDefault: {
            type: 'boolean',
            example: true
          },
          usageCount: {
            type: 'integer',
            example: 150
          },
          lastUsedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      
      TokenPair: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          expiresIn: {
            type: 'string',
            example: '7d'
          },
          tokenType: {
            type: 'string',
            example: 'Bearer'
          }
        }
      }
    },
    
    responses: {
      BadRequest: {
        description: 'Bad Request - Datos inválidos',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - Token inválido o faltante',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - Sin permisos suficientes',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFound: {
        description: 'Not Found - Recurso no encontrado',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      TooManyRequests: {
        description: 'Too Many Requests - Rate limit excedido',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal Server Error - Error del servidor',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    },
    
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Número de página',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Elementos por página',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        }
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        description: 'Campo de ordenamiento',
        required: false,
        schema: {
          type: 'string',
          default: 'createdAt'
        }
      },
      OrderParam: {
        name: 'order',
        in: 'query',
        description: 'Dirección de ordenamiento',
        required: false,
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc'
        }
      }
    }
  },
  
  security: [
    {
      bearerAuth: []
    }
  ]
};

/**
 * 🔧 Opciones de Swagger JSDoc
 */
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    path.join(process.cwd(), 'src/routes/*.js'),
    path.join(process.cwd(), 'src/controllers/*.js'),
    path.join(process.cwd(), 'src/models/*.js'),
    path.join(__dirname, './swagger-schemas.js')
  ]
};

/**
 * 📚 Generar especificación Swagger
 */
export const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * 🎨 Configuración de Swagger UI
 */
export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; }
    .swagger-ui .info .description p { font-size: 14px; }
    .swagger-ui .info .description h1 { color: #1e293b; margin-top: 20px; }
    .swagger-ui .info .description h2 { color: #334155; margin-top: 15px; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
    .swagger-ui .opblock.opblock-put { border-color: #f59e0b; }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
    .swagger-ui .opblock-summary-description { font-weight: 600; }
  `,
  customSiteTitle: 'DevAI Agent API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

/**
 * 🔧 Middleware de Swagger
 */
export const setupSwagger = (app) => {
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

    console.log('📚 Swagger UI disponible en: /api-docs');
  }
};

/**
 * 🧪 Generar documentación de testing
 */
export const generateTestDocs = () => {
  if (process.env.NODE_ENV === 'test') {
    return {
      ...swaggerSpec,
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Test Server'
        }
      ]
    };
  }
  return swaggerSpec;
};

/**
 * 📄 Generar documentación en formato JSON
 */
export const exportApiDocs = () => {
  return JSON.stringify(swaggerSpec, null, 2);
};

/**
 * 🔍 Validar especificación Swagger
 */
export const validateSwaggerSpec = () => {
  try {
    if (!swaggerSpec.openapi) {
      throw new Error('OpenAPI version not specified');
    }
    
    if (!swaggerSpec.info || !swaggerSpec.info.title) {
      throw new Error('API title not specified');
    }
    
    if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
      console.warn('⚠️ No API paths found in Swagger spec');
    }
    
    console.log('✅ Swagger specification is valid');
    return true;
  } catch (error) {
    console.error('❌ Invalid Swagger specification:', error.message);
    return false;
  }
};

export default {
  spec: swaggerSpec,
  setup: setupSwagger,
  options: swaggerUiOptions,
  validate: validateSwaggerSpec
};