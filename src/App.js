// src/App.js
import React from 'react';
import { AppProvider } from './context/AppContext';

// Importa tus componentes existentes
import Header from './components/ui/Header';
// import Dashboard from './components/Dashboard'; // Si lo tienes
// import ChatComponent from './components/ChatComponent'; // Si lo tienes

// Componente principal de la aplicación
const MainApp = () => {
  return (
    <div className="App">
      {/* Tu Header existente - ahora puede usar useApp() */}
      <Header />
      
      {/* Aquí va el resto de tu interfaz */}
      <div style={{ padding: '20px' }}>
        <h1>AI Dev Agent</h1>
        
        {/* Tu interfaz de chat existente */}
        <ChatInterface />
        
        {/* Aquí puedes agregar más componentes que necesiten la API */}
        {/* <Dashboard /> */}
        {/* <SettingsPanel /> */}
      </div>
    </div>
  );
};

// Componente de chat que puede usar la API global
const ChatInterface = () => {
  const [message, setMessage] = React.useState('');
  
  // 🔥 Ahora cualquier componente puede usar estos hooks:
  const { api, isLoading, error } = require('./context/AppContext').useAPI();
  const { text: connectionText, canUseAPI } = require('./context/AppContext').useBackendStatus();

  const handleSendMessage = async (userMessage) => {
    if (!userMessage.trim() || !canUseAPI) return;

    try {
      const response = await api.chatWithAI([
        { role: 'user', content: userMessage }
      ]);
      
      console.log('✅ Respuesta del backend:', response);
      // Aquí manejarías la respuesta
      
    } catch (err) {
      console.error('❌ Error enviando mensaje:', err);
    }
  };

  return (
    <div>
      {/* Status de conexión */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: canUseAPI ? '#d4edda' : '#f8d7da',
        color: canUseAPI ? '#155724' : '#721c24',
        marginBottom: '20px',
        borderRadius: '4px'
      }}>
        <strong>Backend:</strong> {connectionText}
      </div>

      {/* Interfaz de chat */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu mensaje aquí..."
          style={{
            width: '70%',
            padding: '10px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '4px'
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage(message);
              setMessage('');
            }
          }}
        />
        <button
          onClick={() => {
            handleSendMessage(message);
            setMessage('');
          }}
          disabled={!canUseAPI || isLoading || !message.trim()}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: canUseAPI ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: canUseAPI && !isLoading ? 'pointer' : 'not-allowed'
          }}
        >
          {isLoading ? '🔄 Enviando...' : '📤 Enviar'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

// App principal envuelto en el Provider
function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;