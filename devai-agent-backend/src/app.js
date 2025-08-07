// ============================================
// 🎯 CAMBIOS PARA INTEGRAR BACKEND EN APP.JS
// ============================================

// 1️⃣ CAMBIAR IMPORTS (líneas 12-15)
// ANTES:
import { useConversations } from './hooks/useConversations';
import { useApiStatus } from './hooks/useApiStatus';
import { callFreeAIAPI, generateFallbackResponse } from './services/api/aiServiceFactory';

// DESPUÉS:
import { 
  useConversations, 
  useApiStatus, 
  callFreeAIAPI, 
  handleFileUpload as adaptedFileUpload,
  getSystemHealth 
} from './services/integrationAdapter';
import { generateFallbackResponse } from './services/api/aiServiceFactory';

// ═══════════════════════════════════════════

// 2️⃣ AGREGAR ESTADO DE SALUD DEL SISTEMA (después de línea 35)
const [systemHealth, setSystemHealth] = useState(null);
const [backendMode, setBackendMode] = useState(false);

// ═══════════════════════════════════════════

// 3️⃣ AGREGAR USEEFFECT PARA VERIFICAR BACKEND (después de línea 60)
// Verificar salud del sistema al inicializar
useEffect(() => {
  const checkSystemHealth = async () => {
    try {
      const health = await getSystemHealth();
      setSystemHealth(health);
      setBackendMode(health.backend.available);
      
      if (health.backend.available) {
        console.log('✅ Backend disponible - Modo híbrido activo');
      } else {
        console.log('⚠️ Backend no disponible - Modo solo frontend');
      }
    } catch (error) {
      console.warn('Error verificando sistema:', error);
      setBackendMode(false);
    }
  };
  
  checkSystemHealth();
}, []);

// ═══════════════════════════════════════════

// 4️⃣ MODIFICAR FUNCIÓN handleFileUpload (reemplazar función completa alrededor de línea 180)
/**
 * Manejar subida de archivos con adaptador
 */
const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  setIsLoading(true);
  
  try {
    const projectName = files[0].webkitRelativePath ? 
      files[0].webkitRelativePath.split('/')[0] : 
      `Proyecto ${new Date().toLocaleDateString()}`;

    // Usar adaptador para subida
    const result = await adaptedFileUpload(files, projectName, isMobile);

    if (result.success) {
      setCurrentProject(result.project);

      // Mensaje de confirmación mejorado
      const confirmationMessage = {
        role: 'assistant',
        content: `✅ **Proyecto procesado exitosamente** ${result.source === 'backend' ? '(Backend)' : '(Local)'}\n\n📁 **${result.project.name}**\n📊 ${result.project.totalFiles || result.project.files?.length || 0} archivos procesados\n💾 ${Math.round((result.project.totalSize || result.project.files?.reduce((acc, f) => acc + (f.size || 0), 0) || 0) / 1024)} KB total\n\n🧠 **Contexto disponible:**\n${(result.project.files || []).slice(0, 10).map(f => `• ${f.name} (${f.type || f.language})`).join('\n')}\n\n💡 *Ahora puedes preguntarme sobre tu código!* ${backendMode ? '🔗' : '🏠'}`,
        agent: backendMode ? 'Sistema (Backend)' : 'Sistema (Local)',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmationMessage]);
      setShowWelcome(false);

    } else {
      throw new Error(result.error || 'Error desconocido procesando archivos');
    }

  } catch (error) {
    console.error('Error cargando archivos:', error);
    const errorMessage = {
      role: 'assistant',
      content: `❌ **Error cargando proyecto**: ${error.message}\n\n💡 **Sugerencias:**\n- Asegúrate de que los archivos sean de texto\n- Verifica que no excedan ${isMobile ? '2MB' : '5MB'} por archivo\n- Intenta con menos archivos si es un proyecto grande${backendMode ? '\n- El backend puede estar sobrecargado, intenta nuevamente' : ''}`,
      agent: 'Sistema',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
};

// ═══════════════════════════════════════════

// 5️⃣ MODIFICAR generateThinkingReport (alrededor de línea 150)
/**
 * Generar reporte de pensamiento mejorado
 */
const generateThinkingReport = (provider, response, project) => {
  const mode = backendMode ? 'Backend + ' : 'Directo ';
  return `${mode}${provider.toUpperCase()} procesó tu consulta
• Modelo: ${response.model || currentModel}
• Tokens: ${response.usage?.total_tokens || 'N/A'}${project ? `
• Contexto: ${project.files?.length || project.totalFiles || 0} archivos` : ''}
• Modo: ${response.model ? 'API Real' : 'Simulado'} ${backendMode ? '(Backend)' : '(Directo)'}
• Tiempo: ${new Date().toLocaleTimeString()}`;
};

// ═══════════════════════════════════════════

// 6️⃣ AGREGAR INDICADOR VISUAL DE BACKEND EN EL HEADER
// Modificar la prop del Header (alrededor de línea 250) para incluir:
<Header
  // ... props existentes
  backendStatus={systemHealth?.backend}
  // ... resto de props
/>

// ═══════════════════════════════════════════

// 7️⃣ AGREGAR INFORMACIÓN DE SISTEMA AL WELCOME (opcional)
// En la función handleShowWelcome, podrías agregar:
const handleShowWelcome = () => {
  setShowWelcome(true);
  // Log para debugging
  console.log('Sistema:', {
    backend: backendMode ? 'Disponible' : 'No disponible',
    health: systemHealth,
    apis: apiStatus
  });
};

// ═══════════════════════════════════════════
// 📋 RESUMEN DE CAMBIOS:
// ═══════════════════════════════════════════

/*
✅ BENEFICIOS DE ESTA INTEGRACIÓN:

1. 🔄 **Fallback Automático**: Si el backend falla, usa servicios directos
2. 📁 **Upload Híbrido**: Backend para análisis avanzado, local como fallback  
3. 💾 **Conversaciones Sincronizadas**: Backend si disponible, localStorage si no
4. 📊 **Monitoreo**: Conoce el estado del sistema en tiempo real
5. 🔧 **Zero Breaking Changes**: Tu código actual sigue funcionando
6. ⚡ **Mejor Performance**: Backend optimizado cuando disponible
7. 🏠 **Offline Support**: Funciona sin backend
8. 📱 **Mobile Optimized**: Configuraciones específicas por dispositivo

📥 PRÓXIMOS PASOS:

1. Aplicar estos cambios a tu App.js
2. Actualizar el componente Header para mostrar estado del backend
3. Probar con backend ON y OFF
4. Verificar que las conversaciones se guarden correctamente
5. Testear upload de archivos en ambos modos

🔗 El adaptador maneja todo automáticamente:
- Detección de backend disponible
- Fallbacks inteligentes
- Configuración óptima por dispositivo
- Manejo de errores robusto
*/