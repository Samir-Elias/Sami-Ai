// =================================
// CONFIGURACIÓN GLOBAL DE TESTS
// =================================

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import logger from '../src/config/logger.js';

// =================================
// CONFIGURACIÓN DE BASE DE DATOS DE TEST
// =================================

// Usar base de datos separada para tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/devai_agent_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32-chars';
process.env.LOG_LEVEL = 'error'; // Solo errores en tests

const prisma = new PrismaClient();

// =================================
// SETUP GLOBAL ANTES DE TODOS LOS TESTS
// =================================

beforeAll(async () => {
  logger.info('🧪 Setting up test environment...');
  
  try {
    // Conectar a la base de datos de test
    await prisma.$connect();
    logger.info('✅ Connected to test database');
    
    // Ejecutar migraciones si es necesario
    await runMigrations();
    
    // Limpiar base de datos
    await cleanDatabase();
    
    logger.info('✅ Test environment ready');
  } catch (error) {
    logger.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
});

// =================================
// CLEANUP DESPUÉS DE TODOS LOS TESTS
// =================================

afterAll(async () => {
  logger.info('🧹 Cleaning up test environment...');
  
  try {
    // Limpiar base de datos
    await cleanDatabase();
    
    // Cerrar conexión
    await prisma.$disconnect();
    
    logger.info('✅ Test environment cleaned up');
  } catch (error) {
    logger.error('❌ Failed to cleanup test environment:', error);
  }
});

// =================================
// SETUP ANTES DE CADA TEST
// =================================

beforeEach(async () => {
  // Limpiar datos entre tests para evitar interferencias
  await cleanTestData();
});

// =================================
// CLEANUP DESPUÉS DE CADA TEST
// =================================

afterEach(async () => {
  // Cleanup adicional si es necesario
  // Por ahora no hacemos nada aquí
});

// =================================
// FUNCIONES DE UTILIDAD
// =================================

/**
 * Ejecutar migraciones de Prisma
 */
async function runMigrations() {
  try {
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { 
      stdio: 'ignore',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    logger.info('✅ Database migrations applied');
  } catch (error) {
    logger.warn('⚠️ Migrations may not be needed or failed:', error.message);
  }
}

/**
 * Limpiar toda la base de datos
 */
async function cleanDatabase() {
  try {
    // Orden importante: eliminar en orden inverso de dependencias
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.file.deleteMany();
    await prisma.project.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
    
    logger.info('🗑️ Database cleaned');
  } catch (error) {
    logger.error('❌ Failed to clean database:', error);
    throw error;
  }
}

/**
 * Limpiar solo datos de test (más rápido entre tests)
 */
async function cleanTestData() {
  try {
    // Solo limpiar tablas que típicamente se usan en tests
    // Mantener usuarios de test si es necesario
    await prisma.message.deleteMany({
      where: {
        conversation: {
          user: {
            email: {
              contains: 'test'
            }
          }
        }
      }
    });
    
    await prisma.conversation.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test'
          }
        }
      }
    });
    
    await prisma.file.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test'
          }
        }
      }
    });
    
    await prisma.project.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test'
          }
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Failed to clean test data:', error);
    // No fallar el test por esto
  }
}

// =================================
// FACTORY FUNCTIONS PARA TESTS
// =================================

/**
 * Crear usuario de test
 */
export async function createTestUser(overrides = {}) {
  const bcrypt = require('bcryptjs');
  
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: await bcrypt.hash('password123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isActive: true,
    emailVerified: true
  };

  const user = await prisma.user.create({
    data: {
      ...defaultUser,
      ...overrides,
      profile: {
        create: {
          displayName: `${overrides.firstName || 'Test'} ${overrides.lastName || 'User'}`,
          preferences: {
            theme: 'light',
            language: 'en'
          }
        }
      }
    },
    include: {
      profile: true
    }
  });

  return user;
}

/**
 * Crear proyecto de test
 */
export async function createTestProject(userId, overrides = {}) {
  const defaultProject = {
    name: `Test Project ${Date.now()}`,
    description: 'A test project',
    slug: `test-project-${Date.now()}`,
    color: '#3B82F6',
    status: 'active',
    isPublic: false
  };

  const project = await prisma.project.create({
    data: {
      ...defaultProject,
      ...overrides,
      userId
    }
  });

  return project;
}

/**
 * Crear conversación de test
 */
export async function createTestConversation(userId, overrides = {}) {
  const defaultConversation = {
    title: `Test Conversation ${Date.now()}`,
    slug: `test-conversation-${Date.now()}`,
    aiProvider: 'gemini',
    modelName: 'gemini-pro',
    status: 'active'
  };

  const conversation = await prisma.conversation.create({
    data: {
      ...defaultConversation,
      ...overrides,
      userId
    }
  });

  return conversation;
}

/**
 * Crear mensaje de test
 */
export async function createTestMessage(conversationId, overrides = {}) {
  const defaultMessage = {
    content: 'This is a test message',
    role: 'user',
    status: 'completed',
    tokenCount: 5
  };

  const message = await prisma.message.create({
    data: {
      ...defaultMessage,
      ...overrides,
      conversationId
    }
  });

  return message;
}

/**
 * Crear archivo de test
 */
export async function createTestFile(userId, overrides = {}) {
  const timestamp = Date.now();
  
  const defaultFile = {
    originalName: `test-file-${timestamp}.txt`,
    filename: `${timestamp}_test_file.txt`,
    path: `/tmp/test-file-${timestamp}.txt`,
    size: 1024,
    mimetype: 'text/plain',
    type: 'code',
    status: 'uploaded',
    isPublic: false
  };

  const file = await prisma.file.create({
    data: {
      ...defaultFile,
      ...overrides,
      userId
    }
  });

  return file;
}

// =================================
// UTILIDADES DE JWT PARA TESTS
// =================================

/**
 * Generar token JWT para test
 */
export function generateTestJWT(user) {
  const jwt = require('jsonwebtoken');
  
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
    issuer: 'devai-agent',
    audience: 'devai-agent-client'
  });
}

/**
 * Crear headers de autorización para test
 */
export function createAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// =================================
// UTILIDADES DE MOCKING
// =================================

/**
 * Mock de servicios externos
 */
export function mockExternalServices() {
  // Mock de servicios de IA
  vi.mock('../src/ai/geminiClient.js', () => ({
    default: class MockGeminiClient {
      isAvailable() { return true; }
      async generateResponse() {
        return {
          content: 'This is a mocked AI response',
          usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 },
          model: 'gemini-pro'
        };
      }
    }
  }));

  // Mock de cache service
  vi.mock('../src/services/cacheService.js', () => ({
    default: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(0)
    }
  }));

  // Mock de email service si existe
  vi.mock('../src/services/emailService.js', () => ({
    default: {
      sendEmail: vi.fn().mockResolvedValue(true)
    }
  }));
}

/**
 * Restaurar mocks
 */
export function restoreMocks() {
  vi.restoreAllMocks();
}

// =================================
// UTILIDADES DE CLEANUP
// =================================

/**
 * Limpiar archivos de test del sistema de archivos
 */
export async function cleanupTestFiles() {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const testDir = path.join(process.cwd(), 'storage', 'test');
    const files = await fs.readdir(testDir).catch(() => []);
    
    for (const file of files) {
      await fs.unlink(path.join(testDir, file)).catch(() => {});
    }
    
    logger.info('🗑️ Test files cleaned up');
  } catch (error) {
    logger.warn('⚠️ Failed to cleanup test files:', error.message);
  }
}

// =================================
// EXPORTAR UTILIDADES
// =================================

export {
  prisma,
  cleanDatabase,
  cleanTestData,
  mockExternalServices,
  restoreMocks,
  cleanupTestFiles
};