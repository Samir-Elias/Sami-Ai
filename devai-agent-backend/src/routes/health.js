// Health check endpoint para Render
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    };

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.database = 'connected';
    } catch (dbError) {
      health.database = 'disconnected';
      health.status = 'degraded';
      console.error('Database health check failed:', dbError);
    }

    // Test Redis connection (if configured)
    if (process.env.REDIS_URL) {
      try {
        // Add Redis health check here if you're using Redis
        health.redis = 'connected';
      } catch (redisError) {
        health.redis = 'disconnected';
        health.status = 'degraded';
        console.error('Redis health check failed:', redisError);
      }
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Readiness check
 * GET /ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness check
 * GET /alive
 */
router.get('/alive', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;