const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { ERROR_MESSAGES } = require('../utils/constants');
const { formatFileSize } = require('../utils/helpers');
const aiService = require('../services/aiService');

const prisma = new PrismaClient();

// =================================
// CONTROLADORES DE ANALÍTICAS
// =================================

/**
 * @desc    Obtener dashboard general del usuario
 * @route   GET /api/v1/analytics/dashboard
 * @access  Private
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe = '30d' } = req.query;

    // Calcular rango de fechas según el timeframe
    const dateRange = calculateDateRange(timeframe);

    // Obtener estadísticas generales
    const [
      userStats,
      projectStats, 
      conversationStats,
      messageStats,
      fileStats,
      activityStats
    ] = await Promise.all([
      getUserStats(userId),
      getProjectStats(userId, dateRange),
      getConversationStats(userId, dateRange),
      getMessageStats(userId, dateRange),
      getFileStats(userId, dateRange),
      getActivityStats(userId, dateRange)
    ]);

    // Compilar dashboard
    const dashboard = {
      overview: {
        totalProjects: userStats.totalProjects,
        totalConversations: userStats.totalConversations,
        totalMessages: userStats.totalMessages,
        totalFiles: userStats.totalFiles,
        storageUsed: userStats.storageUsed,
        storageFormatted: formatFileSize(userStats.storageUsed)
      },
      projects: projectStats,
      conversations: conversationStats,
      messages: messageStats,
      files: fileStats,
      activity: activityStats,
      timeframe,
      generatedAt: new Date().toISOString()
    };

    logger.info(`📊 Dashboard generated for user: ${req.user.email}`, {
      userId,
      timeframe
    });

    res.json({
      dashboard
    });

  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      error: 'Failed to generate dashboard',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener analíticas de uso
 * @route   GET /api/v1/analytics/usage
 * @access  Private
 */
const getUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      timeframe = '30d',
      granularity = 'day'
    } = req.query;

    // Validar granularidad
    const validGranularities = ['hour', 'day', 'week', 'month'];
    if (!validGranularities.includes(granularity)) {
      return res.status(400).json({
        error: 'Invalid granularity',
        message: `Granularity must be one of: ${validGranularities.join(', ')}`
      });
    }

    const dateRange = calculateDateRange(timeframe);

    // Obtener datos de uso con granularidad especificada
    const [
      activityOverTime,
      conversationTrends,
      messageTrends,
      aiUsage,
      fileUsage
    ] = await Promise.all([
      getActivityOverTime(userId, dateRange, granularity),
      getConversationTrends(userId, dateRange, granularity),
      getMessageTrends(userId, dateRange, granularity),
      getAIUsage(userId, dateRange),
      getFileUsage(userId, dateRange)
    ]);

    const usage = {
      timeframe,
      granularity,
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      },
      activity: activityOverTime,
      conversations: conversationTrends,
      messages: messageTrends,
      ai: aiUsage,
      files: fileUsage,
      generatedAt: new Date().toISOString()
    };

    logger.info(`📈 Usage analytics generated for user: ${req.user.email}`, {
      userId,
      timeframe,
      granularity
    });

    res.json({
      usage
    });

  } catch (error) {
    logger.error('Get usage analytics error:', error);
    res.status(500).json({
      error: 'Failed to generate usage analytics',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener analíticas de conversaciones
 * @route   GET /api/v1/analytics/conversations
 * @access  Private
 */
const getConversationsAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe = '30d' } = req.query;

    const dateRange = calculateDateRange(timeframe);

    // Obtener analíticas detalladas de conversaciones
    const [
      conversationsByStatus,
      conversationsByProvider,
      conversationsByProject,
      messageDistribution,
      popularTopics,
      responseTimeStats
    ] = await Promise.all([
      getConversationsByStatus(userId, dateRange),
      getConversationsByProvider(userId, dateRange),
      getConversationsByProject(userId, dateRange),
      getMessageDistribution(userId, dateRange),
      getPopularTopics(userId, dateRange),
      getResponseTimeStats(userId, dateRange)
    ]);

    const analytics = {
      timeframe,
      dateRange: {
        from: dateRange.from.toISOString(),
        to: