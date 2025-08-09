// ============================================
// 🐛 DEBUG PANEL - PARA DETECTAR PROBLEMAS
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';

const DebugPanel = ({ show, onClose }) => {
  const { 
    isLoading, 
    error, 
    computed, 
    messages,
    conversations,
    currentProvider,
    currentModel 
  } = useApp();

  const [logs, setLogs] = useState([]);
  const [apiCalls, setApiCalls] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const logsEndRef = useRef(null);

  // Interceptar console.log para capturar logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (level, args) => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      // Filtrar logs relevantes para la aplicación
      if (message.includes('DevAI') || 
          message.includes('API') || 
          message.includes('chatWithAI') ||
          message.includes('aiServiceFactory') ||
          message.includes('🎯') ||
          message.includes('🏭') ||
          message.includes('✅') ||
          message.includes('❌')) {
        
        setLogs(prev => [...prev.slice(-49), { // Mantener solo 50 logs
          id: Date.now() + Math.random(),
          timestamp,
          level,
          message,
          isApiCall: message.includes('API') || message.includes('chatWithAI')
        }]);
      }
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Auto-scroll de logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Detectar llamadas API duplicadas
  useEffect(() => {
    const apiCallLogs = logs.filter(log => log.isApiCall);
    const recentCalls = apiCallLogs.slice(-10); // Últimas 10 llamadas

    // Buscar patrones de duplicación
    const duplicates = [];
    for (let i = 1; i < recentCalls.length; i++) {
      const current = recentCalls[i];
      const previous = recentCalls[i - 1];
      
      // Si hay dos llamadas muy cercanas (menos de 1 segundo)
      if (current.timestamp === previous.timestamp && 
          current.message.includes('chatWithAI called')) {
        duplicates.push({
          timestamp: current.timestamp,
          calls: [previous, current]
        });
      }
    }

    setApiCalls(duplicates);
  }, [logs]);

  const clearLogs = () => setLogs([]);

  const exportLogs = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      appState: {
        isLoading,
        error,
        messagesCount: messages.length,
        conversationsCount: conversations.length,
        currentProvider,
        currentModel,
        connectionInfo: computed.connectionInfo
      },
      logs: logs,
      apiCalls: apiCalls,
      duplicateDetection: apiCalls.length > 0
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devai-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            🐛 Panel de Debugging
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showDetails ? '📊 Simple' : '🔍 Detalles'}
            </button>
            <button
              onClick={exportLogs}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              💾 Exportar
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              🗑️ Limpiar
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Estado de la aplicación */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-600">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">📊 Estado Actual</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-gray-600 dark:text-gray-400">Carga:</p>
              <p className={`font-medium ${isLoading ? 'text-yellow-600' : 'text-green-600'}`}>
                {isLoading ? '🔄 Cargando' : '✅ Listo'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 dark:text-gray-400">Error:</p>
              <p className={`font-medium ${error ? 'text-red-600' : 'text-green-600'}`}>
                {error ? '❌ Error' : '✅ Sin errores'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 dark:text-gray-400">Proveedor:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {computed.connectionInfo?.isConnected ? '🟢' : '🟡'} {currentProvider}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600 dark:text-gray-400">Mensajes:</p>
              <p className="font-medium text-gray-900 dark:text-white">{messages.length}</p>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded text-sm">
              <p className="text-red-800 dark:text-red-200">
                <strong>Error actual:</strong> {error}
              </p>
            </div>
          )}
        </div>

        {/* Alertas de duplicación */}
        {apiCalls.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border-b border-gray-200 dark:border-gray-600">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Llamadas API Duplicadas Detectadas ({apiCalls.length})
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Se han detectado posibles llamadas duplicadas a la API. Esto puede causar respuestas dobles.
            </p>
            {showDetails && (
              <div className="mt-2 space-y-1">
                {apiCalls.slice(-3).map((duplicate, index) => (
                  <div key={index} className="text-xs bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded">
                    <p><strong>Hora:</strong> {duplicate.timestamp}</p>
                    <p><strong>Llamadas:</strong> {duplicate.calls.length}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="font-medium text-gray-900 dark:text-white">
              📝 Logs en Tiempo Real ({logs.length}/50)
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
            {logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No hay logs disponibles. Realiza una acción para ver los logs aquí.
              </p>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className={`p-2 rounded ${
                      log.level === 'error' 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                        : log.level === 'warn'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                        : log.isApiCall
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 shrink-0">
                        {log.timestamp}
                      </span>
                      <span className={`text-xs font-bold shrink-0 ${
                        log.level === 'error' ? '❌' :
                        log.level === 'warn' ? '⚠️' :
                        log.isApiCall ? '🔄' : '💬'
                      }`}>
                        {log.level === 'error' ? 'ERR' :
                         log.level === 'warn' ? 'WARN' :
                         log.isApiCall ? 'API' : 'LOG'}
                      </span>
                      <pre className="flex-1 whitespace-pre-wrap text-xs leading-relaxed">
                        {log.message}
                      </pre>
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Footer con estadísticas */}
        <div className="p-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <div className="flex space-x-4">
              <span>📊 Total: {logs.length}</span>
              <span>🔄 APIs: {logs.filter(l => l.isApiCall).length}</span>
              <span>❌ Errores: {logs.filter(l => l.level === 'error').length}</span>
              <span>⚠️ Warnings: {logs.filter(l => l.level === 'warn').length}</span>
            </div>
            <div className="text-xs">
              Actualizado: {logs.length > 0 ? logs[logs.length - 1].timestamp : 'nunca'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook para usar el debug panel fácilmente
export const useDebug = () => {
  const [showDebug, setShowDebug] = useState(false);

  const toggleDebug = () => setShowDebug(!showDebug);
  const openDebug = () => setShowDebug(true);
  const closeDebug = () => setShowDebug(false);

  // Atajo de teclado para abrir debug (Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleDebug();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    showDebug,
    toggleDebug,
    openDebug,
    closeDebug
  };
};

export default DebugPanel;