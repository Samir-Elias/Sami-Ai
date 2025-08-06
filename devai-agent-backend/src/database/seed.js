// ============================================
// 🌱 DEVAI AGENT - DATABASE SEED
// ============================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 🚀 Función principal de seed
 */
async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  try {
    // Limpiar datos existentes (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      await cleanDatabase();
    }

    // Crear usuarios de ejemplo
    const users = await createUsers();
    console.log(`✅ Creados ${users.length} usuarios`);

    // Crear proyectos de ejemplo
    const projects = await createProjects(users);
    console.log(`✅ Creados ${projects.length} proyectos`);

    // Crear conversaciones de ejemplo
    const conversations = await createConversations(users, projects);
    console.log(`✅ Creadas ${conversations.length} conversaciones`);

    // Crear datos de analytics
    await createAnalytics(users);
    console.log(`✅ Creados datos de analytics`);

    console.log('🎉 Seed completado exitosamente!');

  } catch (error) {
    console.error('❌ Error en seed:', error);
    throw error;
  }
}

/**
 * 🗑️ Limpiar base de datos (solo desarrollo)
 */
async function cleanDatabase() {
  console.log('🗑️ Limpiando base de datos...');
  
  const models = [
    'analytics',
    'usage',
    'errorLog',
    'message',
    'conversation',
    'projectFile',
    'project',
    'apiKey',
    'user'
  ];

  for (const model of models) {
    try {
      await prisma[model].deleteMany();
      console.log(`   Limpiado: ${model}`);
    } catch (error) {
      console.warn(`   Warning: No se pudo limpiar ${model}:`, error.message);
    }
  }
}

/**
 * 👤 Crear usuarios de ejemplo
 */
async function createUsers() {
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const usersData = [
    {
      email: 'admin@devai.local',
      username: 'admin',
      name: 'Administrador DevAI',
      password: hashedPassword,
      emailVerified: true,
      preferences: {
        theme: 'dark',
        language: 'es',
        notifications: true
      },
      settings: {
        defaultAiProvider: 'gemini',
        autoSave: true,
        showWelcome: false
      }
    },
    {
      email: 'developer@devai.local',
      username: 'developer',
      name: 'Juan Desarrollador',
      password: hashedPassword,
      emailVerified: true,
      preferences: {
        theme: 'dark',
        language: 'es',
        notifications: false
      },
      settings: {
        defaultAiProvider: 'groq',
        autoSave: true,
        showWelcome: true
      }
    },
    {
      email: 'user@devai.local',
      username: 'user',
      name: 'María Usuario',
      password: hashedPassword,
      emailVerified: false,
      preferences: {
        theme: 'light',
        language: 'es',
        notifications: true
      },
      settings: {
        defaultAiProvider: 'gemini',
        autoSave: false,
        showWelcome: true
      }
    }
  ];

  const users = [];
  for (const userData of usersData) {
    const user = await prisma.user.create({
      data: userData
    });
    users.push(user);

    // Crear API keys de ejemplo para cada usuario
    await createApiKeysForUser(user.id);
  }

  return users;
}

/**
 * 🔑 Crear API keys para un usuario
 */
async function createApiKeysForUser(userId) {
  const apiKeysData = [
    {
      provider: 'gemini',
      keyHash: await bcrypt.hash('fake-gemini-key', 10),
      name: 'Gemini Principal',
      isDefault: true,
      isActive: true
    },
    {
      provider: 'groq',
      keyHash: await bcrypt.hash('fake-groq-key', 10),
      name: 'Groq Rápido',
      isDefault: false,
      isActive: true
    }
  ];

  for (const keyData of apiKeysData) {
    await prisma.apiKey.create({
      data: {
        ...keyData,
        userId
      }
    });
  }
}

/**
 * 📁 Crear proyectos de ejemplo
 */
async function createProjects(users) {
  const projects = [];

  // Proyecto React para el primer usuario
  const reactProject = await prisma.project.create({
    data: {
      userId: users[0].id,
      name: 'Proyecto React Demo',
      description: 'Aplicación React de ejemplo con componentes funcionales',
      totalFiles: 3,
      totalSize: 1024 * 5, // 5KB
      totalLines: 150,
      primaryLanguage: 'javascript',
      languages: {
        javascript: 2,
        css: 1,
        html: 1
      },
      analysis: {
        complexity: 'low',
        dependencies: ['react', 'react-dom'],
        patterns: ['functional-components', 'hooks']
      }
    }
  });

  // Archivos del proyecto React
  await createProjectFiles(reactProject.id, [
    {
      name: 'App.js',
      path: 'src/App.js',
      content: getReactAppContent(),
      size: 1024 * 2,
      type: '.js',
      language: 'javascript',
      lineCount: 50,
      charCount: 1024 * 2
    },
    {
      name: 'index.css',
      path: 'src/index.css',
      content: getCSSContent(),
      size: 1024,
      type: '.css',
      language: 'css',
      lineCount: 30,
      charCount: 1024
    },
    {
      name: 'index.html',
      path: 'public/index.html',
      content: getHTMLContent(),
      size: 1024 * 2,
      type: '.html',
      language: 'html',
      lineCount: 70,
      charCount: 1024 * 2
    }
  ]);

  projects.push(reactProject);

  // Proyecto Python para el segundo usuario
  const pythonProject = await prisma.project.create({
    data: {
      userId: users[1].id,
      name: 'API Python FastAPI',
      description: 'API REST construida con FastAPI y PostgreSQL',
      totalFiles: 2,
      totalSize: 1024 * 3,
      totalLines: 100,
      primaryLanguage: 'python',
      languages: {
        python: 2
      },
      analysis: {
        complexity: 'medium',
        dependencies: ['fastapi', 'uvicorn', 'sqlalchemy'],
        patterns: ['rest-api', 'async']
      }
    }
  });

  await createProjectFiles(pythonProject.id, [
    {
      name: 'main.py',
      path: 'main.py',
      content: getPythonMainContent(),
      size: 1024 * 2,
      type: '.py',
      language: 'python',
      lineCount: 60,
      charCount: 1024 * 2
    },
    {
      name: 'models.py',
      path: 'models.py',
      content: getPythonModelsContent(),
      size: 1024,
      type: '.py',
      language: 'python',
      lineCount: 40,
      charCount: 1024
    }
  ]);

  projects.push(pythonProject);

  return projects;
}

/**
 * 📄 Crear archivos de proyecto
 */
async function createProjectFiles(projectId, filesData) {
  for (const fileData of filesData) {
    await prisma.projectFile.create({
      data: {
        ...fileData,
        projectId
      }
    });
  }
}

/**
 * 💬 Crear conversaciones de ejemplo
 */
async function createConversations(users, projects) {
  const conversations = [];

  // Conversación sobre React
  const reactConversation = await prisma.conversation.create({
    data: {
      userId: users[0].id,
      projectId: projects[0].id,
      title: 'Optimización de componentes React',
      preview: 'Consulta sobre cómo optimizar el rendimiento de componentes React',
      aiProvider: 'gemini',
      aiModel: 'gemini-1.5-flash',
      messageCount: 4,
      totalTokens: 1200
    }
  });

  await createMessagesForConversation(reactConversation.id, [
    {
      role: 'user',
      content: '¿Cómo puedo optimizar el rendimiento de mis componentes React?',
    },
    {
      role: 'assistant',
      content: 'Te ayudo a optimizar tus componentes React. Aquí tienes algunas estrategias clave...',
      aiProvider: 'gemini',
      aiModel: 'gemini-1.5-flash',
      totalTokens: 300
    },
    {
      role: 'user',
      content: 'Perfecto, ¿y qué opinas sobre usar React.memo?'
    },
    {
      role: 'assistant',
      content: 'React.memo es excelente para optimizar componentes funcionales...',
      aiProvider: 'gemini',
      aiModel: 'gemini-1.5-flash',
      totalTokens: 250
    }
  ]);

  conversations.push(reactConversation);

  // Conversación sobre Python
  const pythonConversation = await prisma.conversation.create({
    data: {
      userId: users[1].id,
      projectId: projects[1].id,
      title: 'FastAPI y async/await',
      preview: 'Dudas sobre programación asíncrona en FastAPI',
      aiProvider: 'groq',
      aiModel: 'llama3-8b-8192',
      messageCount: 2,
      totalTokens: 800
    }
  });

  await createMessagesForConversation(pythonConversation.id, [
    {
      role: 'user',
      content: 'Explícame cómo funciona async/await en FastAPI'
    },
    {
      role: 'assistant',
      content: 'async/await en FastAPI permite manejar operaciones asíncronas de manera eficiente...',
      aiProvider: 'groq',
      aiModel: 'llama3-8b-8192',
      totalTokens: 400
    }
  ]);

  conversations.push(pythonConversation);

  return conversations;
}

/**
 * 📨 Crear mensajes para una conversación
 */
async function createMessagesForConversation(conversationId, messagesData) {
  for (const messageData of messagesData) {
    await prisma.message.create({
      data: {
        ...messageData,
        conversationId
      }
    });
  }
}

/**
 * 📊 Crear datos de analytics
 */
async function createAnalytics(users) {
  const events = [
    {
      event: 'user_login',
      category: 'auth',
      action: 'login',
      userId: users[0].id,
      properties: { method: 'email' }
    },
    {
      event: 'message_sent',
      category: 'chat',
      action: 'create',
      userId: users[0].id,
      properties: { provider: 'gemini', tokens: 150 }
    },
    {
      event: 'project_uploaded',
      category: 'project',
      action: 'create',
      userId: users[1].id,
      properties: { fileCount: 5, language: 'python' }
    }
  ];

  for (const eventData of events) {
    await prisma.analytics.create({
      data: eventData
    });
  }
}

// ============================================
// 📄 CONTENIDO DE ARCHIVOS EJEMPLO
// ============================================

function getReactAppContent() {
  return `import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage(\`Contador: \${count}\`);
  }, [count]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>DevAI Agent Demo</h1>
        <p>{message}</p>
        <button onClick={() => setCount(count + 1)}>
          Incrementar
        </button>
        <button onClick={() => setCount(0)}>
          Reset
        </button>
      </header>
    </div>
  );
}

export default App;`;
}

function getCSSContent() {
  return `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
}

button {
  background-color: #61dafb;
  border: none;
  color: black;
  padding: 15px 32px;
  text-align: center;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 8px;
}

button:hover {
  background-color: #21a9c7;
}`;
}

function getHTMLContent() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <title>DevAI Agent Demo</title>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>`;
}

function getPythonMainContent() {
  return `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="DevAI Demo API", version="1.0.0")

class Item(BaseModel):
    name: str
    price: float

items = []

@app.get("/")
async def root():
    return {"message": "DevAI Demo API"}

@app.get("/items")
async def get_items():
    return items

@app.post("/items")
async def create_item(item: Item):
    items.append(item)
    return item

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)`;
}

function getPythonModelsContent() {
  return `from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Item(Base):
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    price = Column(Float)
    
    def __repr__(self):
        return f"<Item(name='{self.name}', price={self.price})>"`;
}

// ============================================
// 🚀 EJECUTAR SEED
// ============================================

main()
  .catch((e) => {
    console.error('❌ Error fatal en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });