const { Pool } = require('pg');
const redis = require('redis');

class AnalyticsController {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
        this.redis = redis.createClient({
            url: process.env.REDIS_URL
        });
    }

    // Obtener métricas generales del dashboard
    async getDashboardMetrics(req, res) {
        try {
            const cacheKey = 'dashboard:metrics';
            const cached = await this.redis.get(cacheKey);

            if (cached) {
                return res.json(JSON.parse(cached));
            }

            const queries = await Promise.all([
                // Total de usuarios
                this.pool.query('SELECT COUNT(*) as total_users FROM users'),
                // Usuarios activos en las últimas 24h
                this.pool.query(`
                    SELECT COUNT(*) as active_users 
                    FROM users 
                    WHERE last_active >= NOW() - INTERVAL '24 hours'
                `),
                // Total de conversaciones
                this.pool.query('SELECT COUNT(*) as total_conversations FROM conversations'),
                // Conversaciones de hoy
                this.pool.query(`
                    SELECT COUNT(*) as today_conversations 
                    FROM conversations 
                    WHERE created_at >= CURRENT_DATE
                `),
                // Total de mensajes
                this.pool.query('SELECT COUNT(*) as total_messages FROM messages'),
                // Promedio de mensajes por conversación
                this.pool.query(`
                    SELECT AVG(message_count) as avg_messages_per_conversation 
                    FROM (
                        SELECT conversation_id, COUNT(*) as message_count 
                        FROM messages 
                        GROUP BY conversation_id
                    ) t
                `),
                // Top 5 tipos de agentes más usados
                this.pool.query(`
                    SELECT agent_type, COUNT(*) as usage_count 
                    FROM conversations 
                    GROUP BY agent_type 
                    ORDER BY usage_count DESC 
                    LIMIT 5
                `)
            ]);

            const metrics = {
                totalUsers: parseInt(queries[0].rows[0].total_users),
                activeUsers: parseInt(queries[1].rows[0].active_users),
                totalConversations: parseInt(queries[2].rows[0].total_conversations),
                todayConversations: parseInt(queries[3].rows[0].today_conversations),
                totalMessages: parseInt(queries[4].rows[0].total_messages),
                avgMessagesPerConversation: parseFloat(queries[5].rows[0].avg_messages_per_conversation) || 0,
                topAgentTypes: queries[6].rows,
                timestamp: new Date().toISOString()
            };

            // Cachear por 5 minutos
            await this.redis.setex(cacheKey, 300, JSON.stringify(metrics));

            res.json(metrics);
        } catch (error) {
            console.error('Error getting dashboard metrics:', error);
            res.status(500).json({ error: 'Error al obtener métricas del dashboard' });
        }
    }

    // Obtener estadísticas de uso por períodos
    async getUsageStats(req, res) {
        try {
            const { period = 'week', metric = 'conversations' } = req.query;
            
            let interval, dateFormat;
            switch (period) {
                case 'day':
                    interval = '24 hours';
                    dateFormat = 'HH24:MI';
                    break;
                case 'week':
                    interval = '7 days';
                    dateFormat = 'YYYY-MM-DD';
                    break;
                case 'month':
                    interval = '30 days';
                    dateFormat = 'YYYY-MM-DD';
                    break;
                default:
                    interval = '7 days';
                    dateFormat = 'YYYY-MM-DD';
            }

            let query;
            switch (metric) {
                case 'conversations':
                    query = `
                        SELECT 
                            TO_CHAR(created_at, '${dateFormat}') as date,
                            COUNT(*) as count
                        FROM conversations 
                        WHERE created_at >= NOW() - INTERVAL '${interval}'
                        GROUP BY TO_CHAR(created_at, '${dateFormat}')
                        ORDER BY date
                    `;
                    break;
                case 'messages':
                    query = `
                        SELECT 
                            TO_CHAR(created_at, '${dateFormat}') as date,
                            COUNT(*) as count
                        FROM messages 
                        WHERE created_at >= NOW() - INTERVAL '${interval}'
                        GROUP BY TO_CHAR(created_at, '${dateFormat}')
                        ORDER BY date
                    `;
                    break;
                case 'users':
                    query = `
                        SELECT 
                            TO_CHAR(created_at, '${dateFormat}') as date,
                            COUNT(*) as count
                        FROM users 
                        WHERE created_at >= NOW() - INTERVAL '${interval}'
                        GROUP BY TO_CHAR(created_at, '${dateFormat}')
                        ORDER BY date
                    `;
                    break;
                default:
                    return res.status(400).json({ error: 'Métrica no válida' });
            }

            const result = await this.pool.query(query);
            res.json({
                period,
                metric,
                data: result.rows
            });

        } catch (error) {
            console.error('Error getting usage stats:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas de uso' });
        }
    }

    // Obtener estadísticas de rendimiento del sistema
    async getPerformanceStats(req, res) {
        try {
            const queries = await Promise.all([
                // Tiempo promedio de respuesta por tipo de agente
                this.pool.query(`
                    SELECT 
                        c.agent_type,
                        AVG(EXTRACT(EPOCH FROM (m.created_at - c.created_at))) as avg_response_time
                    FROM conversations c
                    JOIN messages m ON c.id = m.conversation_id
                    WHERE m.role = 'assistant'
                    AND c.created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY c.agent_type
                `),
                // Distribución de longitud de conversaciones
                this.pool.query(`
                    SELECT 
                        CASE 
                            WHEN message_count <= 5 THEN '1-5'
                            WHEN message_count <= 10 THEN '6-10'
                            WHEN message_count <= 20 THEN '11-20'
                            ELSE '20+'
                        END as message_range,
                        COUNT(*) as conversation_count
                    FROM (
                        SELECT conversation_id, COUNT(*) as message_count
                        FROM messages
                        GROUP BY conversation_id
                    ) t
                    GROUP BY message_range
                    ORDER BY message_range
                `),
                // Tasa de éxito (conversaciones completadas)
                this.pool.query(`
                    SELECT 
                        status,
                        COUNT(*) as count,
                        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
                    FROM conversations
                    WHERE created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY status
                `)
            ]);

            const performanceStats = {
                avgResponseTimeByAgent: queries[0].rows,
                conversationLengthDistribution: queries[1].rows,
                successRate: queries[2].rows,
                timestamp: new Date().toISOString()
            };

            res.json(performanceStats);
        } catch (error) {
            console.error('Error getting performance stats:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas de rendimiento' });
        }
    }

    // Obtener estadísticas detalladas de un usuario específico
    async getUserAnalytics(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ error: 'ID de usuario requerido' });
            }

            const queries = await Promise.all([
                // Información básica del usuario
                this.pool.query('SELECT * FROM users WHERE id = $1', [userId]),
                // Total de conversaciones del usuario
                this.pool.query('SELECT COUNT(*) as total FROM conversations WHERE user_id = $1', [userId]),
                // Conversaciones por tipo de agente
                this.pool.query(`
                    SELECT agent_type, COUNT(*) as count
                    FROM conversations 
                    WHERE user_id = $1
                    GROUP BY agent_type
                `, [userId]),
                // Actividad mensual del usuario
                this.pool.query(`
                    SELECT 
                        TO_CHAR(created_at, 'YYYY-MM') as month,
                        COUNT(*) as conversations
                    FROM conversations 
                    WHERE user_id = $1
                    AND created_at >= NOW() - INTERVAL '12 months'
                    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                    ORDER BY month
                `, [userId]),
                // Tiempo promedio de sesión
                this.pool.query(`
                    SELECT 
                        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_session_duration
                    FROM conversations 
                    WHERE user_id = $1
                `, [userId])
            ]);

            if (queries[0].rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const userAnalytics = {
                user: queries[0].rows[0],
                totalConversations: parseInt(queries[1].rows[0].total),
                conversationsByAgentType: queries[2].rows,
                monthlyActivity: queries[3].rows,
                avgSessionDuration: parseFloat(queries[4].rows[0].avg_session_duration) || 0,
                timestamp: new Date().toISOString()
            };

            res.json(userAnalytics);
        } catch (error) {
            console.error('Error getting user analytics:', error);
            res.status(500).json({ error: 'Error al obtener analíticas del usuario' });
        }
    }

    // Obtener reportes personalizados
    async getCustomReport(req, res) {
        try {
            const {
                startDate,
                endDate,
                metrics = ['conversations', 'messages', 'users'],
                groupBy = 'day',
                agentType
            } = req.body;

            if (!startDate || !endDate) {
                return res.status(400).json({ 
                    error: 'Fechas de inicio y fin son requeridas' 
                });
            }

            const reportData = {};

            for (const metric of metrics) {
                let baseQuery = '';
                let table = '';

                switch (metric) {
                    case 'conversations':
                        table = 'conversations';
                        break;
                    case 'messages':
                        table = 'messages';
                        break;
                    case 'users':
                        table = 'users';
                        break;
                    default:
                        continue;
                }

                let dateFormat;
                switch (groupBy) {
                    case 'hour':
                        dateFormat = 'YYYY-MM-DD HH24';
                        break;
                    case 'day':
                        dateFormat = 'YYYY-MM-DD';
                        break;
                    case 'week':
                        dateFormat = 'IYYY-IW';
                        break;
                    case 'month':
                        dateFormat = 'YYYY-MM';
                        break;
                    default:
                        dateFormat = 'YYYY-MM-DD';
                }

                baseQuery = `
                    SELECT 
                        TO_CHAR(created_at, '${dateFormat}') as period,
                        COUNT(*) as count
                    FROM ${table}
                    WHERE created_at BETWEEN $1 AND $2
                `;

                const params = [startDate, endDate];

                if (agentType && table === 'conversations') {
                    baseQuery += ' AND agent_type = $3';
                    params.push(agentType);
                }

                baseQuery += `
                    GROUP BY TO_CHAR(created_at, '${dateFormat}')
                    ORDER BY period
                `;

                const result = await this.pool.query(baseQuery, params);
                reportData[metric] = result.rows;
            }

            res.json({
                report: reportData,
                filters: {
                    startDate,
                    endDate,
                    metrics,
                    groupBy,
                    agentType
                },
                generatedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error generating custom report:', error);
            res.status(500).json({ error: 'Error al generar reporte personalizado' });
        }
    }

    // Obtener métricas en tiempo real
    async getRealTimeMetrics(req, res) {
        try {
            const queries = await Promise.all([
                // Usuarios conectados (últimos 5 minutos)
                this.pool.query(`
                    SELECT COUNT(*) as online_users 
                    FROM users 
                    WHERE last_active >= NOW() - INTERVAL '5 minutes'
                `),
                // Conversaciones activas
                this.pool.query(`
                    SELECT COUNT(*) as active_conversations 
                    FROM conversations 
                    WHERE status = 'active'
                    AND updated_at >= NOW() - INTERVAL '1 hour'
                `),
                // Mensajes en la última hora
                this.pool.query(`
                    SELECT COUNT(*) as recent_messages 
                    FROM messages 
                    WHERE created_at >= NOW() - INTERVAL '1 hour'
                `),
                // Carga del sistema por tipo de agente
                this.pool.query(`
                    SELECT 
                        agent_type,
                        COUNT(*) as active_sessions
                    FROM conversations 
                    WHERE status = 'active'
                    AND updated_at >= NOW() - INTERVAL '1 hour'
                    GROUP BY agent_type
                `)
            ]);

            const realTimeMetrics = {
                onlineUsers: parseInt(queries[0].rows[0].online_users),
                activeConversations: parseInt(queries[1].rows[0].active_conversations),
                recentMessages: parseInt(queries[2].rows[0].recent_messages),
                systemLoad: queries[3].rows,
                timestamp: new Date().toISOString()
            };

            res.json(realTimeMetrics);
        } catch (error) {
            console.error('Error getting real-time metrics:', error);
            res.status(500).json({ error: 'Error al obtener métricas en tiempo real' });
        }
    }

    // Limpiar caché de analytics
    async clearCache(req, res) {
        try {
            const pattern = 'dashboard:*';
            const keys = await this.redis.keys(pattern);
            
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }

            res.json({ 
                message: 'Caché de analytics limpiado',
                clearedKeys: keys.length
            });
        } catch (error) {
            console.error('Error clearing cache:', error);
            res.status(500).json({ error: 'Error al limpiar caché' });
        }
    }

    // Exportar datos para reportes
    async exportData(req, res) {
        try {
            const { 
                format = 'json',
                table = 'conversations',
                startDate,
                endDate,
                limit = 1000
            } = req.query;

            let query = `SELECT * FROM ${table}`;
            const params = [];

            if (startDate && endDate) {
                query += ' WHERE created_at BETWEEN $1 AND $2';
                params.push(startDate, endDate);
            }

            query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
            params.push(limit);

            const result = await this.pool.query(query, params);

            if (format === 'csv') {
                const csv = this.convertToCSV(result.rows);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${table}_export.csv"`);
                return res.send(csv);
            }

            res.json({
                data: result.rows,
                count: result.rows.length,
                exportedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error exporting data:', error);
            res.status(500).json({ error: 'Error al exportar datos' });
        }
    }

    // Utilidad para convertir a CSV
    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ];
        
        return csvContent.join('\n');
    }
}

module.exports = AnalyticsController;