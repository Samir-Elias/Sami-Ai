# 🤖 DevAI Agent Backend

> AI-powered development assistant backend API built with Node.js, Express, Prisma, and multiple AI providers.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-blueviolet.svg)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://docker.com/)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Features
- 🔐 **Authentication & Authorization** - JWT-based auth with refresh tokens
- 👥 **User Management** - Registration, profiles, roles (admin, user, moderator)
- 💬 **Conversations** - Chat history and conversation management
- 📁 **File Upload** - Secure file handling with validation
- 🎯 **Projects** - Project organization and management

### AI Integration
- 🧠 **Multiple AI Providers**
  - Google Gemini
  - Groq (Mixtral, Llama2)
  - HuggingFace
  - Ollama (local models)
- 🔄 **AI Router** - Intelligent provider switching
- 📊 **Token Tracking** - Usage analytics and monitoring

### Security & Performance
- 🛡️ **Security Headers** - Helmet.js protection
- 🚦 **Rate Limiting** - Configurable limits per endpoint
- 🔒 **Input Validation** - Comprehensive data validation
- 📝 **Logging** - Winston-based structured logging
- 🗂️ **Caching** - Redis-powered caching layer

### Developer Experience
- 📖 **API Documentation** - Swagger/OpenAPI docs
- 🐳 **Docker Support** - Complete containerization
- 🧪 **Testing Ready** - Vitest setup
- 🔧 **Hot Reload** - Nodemon development server
- 📊 **Health Checks** - Built-in monitoring endpoints

## 🛠 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js 18+, Express.js 4.x |
| **Database** | PostgreSQL 15+, Prisma ORM |
| **Caching** | Redis 7.x |
| **Authentication** | JWT, bcryptjs |
| **Validation** | express-validator, custom validators |
| **File Upload** | Multer with security validation |
| **Logging** | Winston with daily rotation |
| **Documentation** | Swagger/OpenAPI 3.0 |
| **Security** | Helmet.js, CORS, Rate limiting |
| **Testing** | Vitest, Supertest |
| **Development** | Nodemon, ESLint, Prettier |
| **Containerization** | Docker, Docker Compose |

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher (or **yarn** 1.22+)
- **PostgreSQL** 15.0 or higher
- **Redis** 7.0 or higher (optional, for caching)
- **Docker** and **Docker Compose** (for containerized setup)

## 🚀 Installation

### Option 1: Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-username/devai-agent-backend.git
cd devai-agent-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration (see Configuration section)
```

4. **Set up the database**
```bash
# Create PostgreSQL database
createdb devai_agent

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed initial data (optional)
npm run db:seed
```

5. **Start development server**
```bash
npm run dev
```

### Option 2: Docker Setup

1. **Clone and configure**
```bash
git clone https://github.com/your-username/devai-agent-backend.git
cd devai-agent-backend
cp .env.example .env
# Edit .env as needed
```

2. **Start with Docker Compose**
```bash
docker-compose up -d
```

3. **Initialize database**
```bash
docker-compose exec api npm run db:setup
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/devai_agent"

# Redis (Optional)
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"

# AI Providers (Optional - add as needed)
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"
HUGGINGFACE_API_KEY="your-huggingface-api-key"
OLLAMA_URL="http://localhost:11434"

# File Upload
MAX_FILE_SIZE="50mb"
UPLOAD_PATH="./storage/uploads"

# Logging
LOG_LEVEL="info"
LOG_PATH="./storage/logs"

# Email (for future features)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

### Database Configuration

The application uses PostgreSQL with Prisma ORM. The database schema includes:

- **Users** - Authentication and profile management
- **Conversations** - Chat history
- **Messages** - Individual chat messages
- **Projects** - Project organization
- **Files** - File upload tracking

### AI Provider Setup

Configure one or more AI providers:

#### Google Gemini
```env
GEMINI_API_KEY="your-api-key"
```

#### Groq
```env
GROQ_API_KEY="your-api-key"
```

#### HuggingFace
```env
HUGGINGFACE_API_KEY="your-api-key"
```

#### Ollama (Local)
```env
OLLAMA_URL="http://localhost:11434"
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```
- Runs with nodemon for hot reloading
- Available at `http://localhost:3001`
- API docs at `http://localhost:3001/api-docs`

### Production Mode
```bash
npm start
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run start` - Start production server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:reset` - Reset database
- `npm run db:studio` - Open Prisma Studio

### Health Checks

- **Health Check**: `GET /health`
- **Status**: `GET /status` (detailed system information)
- **API Info**: `GET /api/v1`

## 📚 API Documentation

### Interactive Documentation
Visit `http://localhost:3001/api-docs` for interactive Swagger documentation.

### Main API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/profile` - Get user profile
- `GET /api/v1/auth/verify` - Verify token

#### Users
- `GET /api/v1/users` - List users (admin only)
- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/profile` - Update profile
- `PUT /api/v1/users/password` - Change password
- `DELETE /api/v1/users/profile` - Deactivate account
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id/role` - Update user role (admin)

#### Conversations (Coming Soon)
- `GET /api/v1/conversations` - List conversations
- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations/:id` - Get conversation
- `PUT /api/v1/conversations/:id` - Update conversation
- `DELETE /api/v1/conversations/:id` - Delete conversation

#### Messages (Coming Soon)
- `GET /api/v1/conversations/:id/messages` - Get messages
- `POST /api/v1/conversations/:id/messages` - Send message

#### AI Integration (Coming Soon)
- `POST /api/v1/ai/chat` - Chat with AI
- `GET /api/v1/ai/models` - List available models
- `GET /api/v1/ai/providers` - List AI providers

#### Files (Coming Soon)
- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files` - List files
- `GET /api/v1/files/:id` - Get file info
- `DELETE /api/v1/files/:id` - Delete file

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Error Response
```json
{
  "error": "Error type",
  "message": "Human readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "details": { /* additional error info */ }
}
```

## 📁 Project Structure

```
devai-agent-backend/
├── 📁 src/                          # Source code
│   ├── 📁 config/                   # Configuration files
│   │   ├── database.js              # Database connection
│   │   ├── redis.js                 # Redis connection
│   │   ├── jwt.js                   # JWT configuration
│   │   ├── upload.js                # File upload config
│   │   ├── logger.js                # Logging configuration
│   │   └── swagger.js               # API documentation
│   ├── 📁 middleware/               # Express middlewares
│   │   ├── auth.js                  # Authentication middleware
│   │   ├── validation.js            # Request validation
│   │   ├── rateLimit.js            # Rate limiting
│   │   ├── error.js                 # Error handling
│   │   ├── upload.js                # File upload handling
│   │   └── logger.js                # Request logging
│   ├── 📁 routes/                   # API routes
│   │   ├── index.js                 # Main router
│   │   ├── auth.js                  # Auth routes
│   │   ├── users.js                 # User routes
│   │   ├── conversations.js         # Chat routes
│   │   ├── messages.js              # Message routes
│   │   ├── projects.js              # Project routes
│   │   ├── files.js                 # File routes
│   │   ├── ai.js                    # AI integration routes
│   │   └── analytics.js             # Analytics routes
│   ├── 📁 controllers/              # Route controllers
│   │   ├── authController.js        # Authentication logic
│   │   ├── userController.js        # User management
│   │   ├── conversationController.js# Chat management
│   │   ├── messageController.js     # Message handling
│   │   ├── projectController.js     # Project management
│   │   ├── fileController.js        # File management
│   │   ├── aiController.js          # AI integration
│   │   └── analyticsController.js   # Analytics
│   ├── 📁 services/                 # Business logic
│   │   ├── authService.js           # Auth business logic
│   │   ├── userService.js           # User business logic
│   │   ├── conversationService.js   # Chat business logic
│   │   ├── messageService.js        # Message business logic
│   │   ├── projectService.js        # Project business logic
│   │   ├── fileService.js           # File business logic
│   │   ├── aiService.js             # AI business logic
│   │   ├── cacheService.js          # Caching logic
│   │   ├── emailService.js          # Email service
│   │   └── analyticsService.js      # Analytics logic
│   ├── 📁 ai/                       # AI integrations
│   │   ├── geminiClient.js          # Google Gemini
│   │   ├── groqClient.js            # Groq integration
│   │   ├── huggingfaceClient.js     # HuggingFace
│   │   ├── ollamaClient.js          # Ollama local models
│   │   └── aiRouter.js              # AI provider router
│   ├── 📁 models/                   # Data models (if needed)
│   ├── 📁 utils/                    # Utility functions
│   │   ├── constants.js             # App constants
│   │   ├── helpers.js               # Helper functions
│   │   ├── validators.js            # Custom validators
│   │   ├── encryption.js            # Encryption utilities
│   │   ├── fileUtils.js             # File utilities
│   │   ├── dateUtils.js             # Date utilities
│   │   └── responseUtils.js         # Response formatters
│   ├── 📁 database/                 # Database related
│   │   ├── schema.prisma            # Prisma schema
│   │   ├── seed.js                  # Database seeding
│   │   └── migrations/              # DB migrations
│   ├── app.js                       # Express app setup
│   └── server.js                    # Server entry point
├── 📁 tests/                        # Test files
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── fixtures/                    # Test data
├── 📁 docs/                         # Documentation
│   └── swagger/                     # API documentation
├── 📁 storage/                      # File storage
│   ├── uploads/                     # Uploaded files
│   ├── temp/                        # Temporary files
│   ├── logs/                        # Log files
│   └── backups/                     # Database backups
├── 📁 scripts/                      # Utility scripts
├── 📁 docker/                       # Docker configurations
├── package.json                     # Dependencies & scripts
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
├── nodemon.json                     # Nodemon configuration
├── docker-compose.yml               # Docker services
├── Dockerfile                       # Docker build file
├── ecosystem.config.js              # PM2 configuration
├── eslint.config.js                 # ESLint configuration
├── vitest.config.js                 # Test configuration
└── README.md                        # This file
```

## 🛠 Development

### Code Style
- **ESLint** for code linting
- **Prettier** for code formatting
- **Conventional Commits** for commit messages

### Git Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Debugging
The application includes comprehensive logging:
- **Console output** in development
- **File logging** in production
- **Request/response logging**
- **Error tracking**

### Database Operations
```bash
# Reset database
npm run db:reset

# Generate new migration
npx prisma migrate dev --name migration-name

# View database
npm run db:studio
```

## 🚀 Deployment

### Using Docker

1. **Build and deploy**
```bash
docker-compose up -d --build
```

2. **Environment-specific configs**
```bash
# Production
docker-compose -f docker-compose.prod.yml up -d

# Staging
docker-compose -f docker-compose.staging.yml up -d
```

### Using PM2

1. **Install PM2**
```bash
npm install -g pm2
```

2. **Start application**
```bash
pm2 start ecosystem.config.js
```

3. **Monitor**
```bash
pm2 monit
pm2 logs
```

### Environment Preparation

#### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure secure JWT secrets
- [ ] Set up production database
- [ ] Configure Redis for caching
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up CI/CD pipeline

## 📊 Monitoring & Health

### Health Endpoints
- `GET /health` - Basic health check
- `GET /status` - Detailed system status

### Logging
Logs are written to:
- **Console** (development)
- **Files** in `storage/logs/` (production)
- **External services** (configurable)

### Metrics
The application tracks:
- Request/response times
- Error rates
- AI API usage
- Database performance
- Memory and CPU usage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Set up your development environment
4. Create a feature branch
5. Make your changes
6. Add tests for new features
7. Ensure all tests pass
8. Submit a pull request

### Code Standards
- Follow existing code style
- Write comprehensive tests
- Update documentation
- Use meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Express.js** community for the excellent framework
- **Prisma** team for the amazing ORM
- **AI providers** (Google, Groq, HuggingFace) for their APIs
- All contributors who help improve this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/devai-agent-backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/devai-agent-backend/discussions)
- **Email**: support@devai-agent.com

---

**Made with ❤️ by the DevAI Team**

*Happy coding! 🚀*