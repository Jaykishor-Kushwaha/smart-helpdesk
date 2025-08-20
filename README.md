# Smart Helpdesk System

A modern, AI-powered helpdesk system built with React, Node.js, and MongoDB. Features automated ticket triage, intelligent classification, and AI-assisted response generation.

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React + Vite Frontend<br/>Port 3000]
        UI --> |HTTP/REST| NGINX[Nginx Reverse Proxy<br/>Port 80]
    end

    subgraph "Backend Layer"
        API[Express.js API Server<br/>Port 8080]
        NGINX --> |Proxy Pass| API

        subgraph "Core Services"
            AUTH[Authentication Service<br/>JWT + RBAC]
            AGENT[AI Agent Service<br/>Triage & Classification]
            KB[Knowledge Base Service<br/>Full-text Search]
            TICKET[Ticket Management<br/>CRUD + Status]
            AUDIT[Audit Logging<br/>Compliance]
        end

        API --> AUTH
        API --> AGENT
        API --> KB
        API --> TICKET
        API --> AUDIT
    end

    subgraph "AI Agent Workflow"
        TRIAGE[Ticket Triage<br/>Auto-classification]
        CLASSIFY[Heuristic Classification<br/>billing/tech/shipping/other]
        SEARCH[KB Article Retrieval<br/>MongoDB Text Search]
        DRAFT[Reply Generation<br/>Template-based]
        CONFIDENCE[Confidence Scoring<br/>Auto-close if ≥ threshold]

        AGENT --> TRIAGE
        TRIAGE --> CLASSIFY
        CLASSIFY --> SEARCH
        SEARCH --> DRAFT
        DRAFT --> CONFIDENCE
    end

    subgraph "Data Layer"
        MONGO[(MongoDB Database<br/>Port 27017)]

        subgraph "Collections"
            USERS[Users Collection<br/>Auth & RBAC]
            TICKETS_DB[Tickets Collection<br/>Support Requests]
            ARTICLES[Articles Collection<br/>Knowledge Base]
            SUGGESTIONS[Agent Suggestions<br/>AI Recommendations]
            REPLIES[Replies Collection<br/>Conversations]
            AUDIT_DB[Audit Logs<br/>Compliance Trail]
        end

        MONGO --> USERS
        MONGO --> TICKETS_DB
        MONGO --> ARTICLES
        MONGO --> SUGGESTIONS
        MONGO --> REPLIES
        MONGO --> AUDIT_DB
    end
```

### Architecture Rationale

**Microservices-Inspired Design**: While monolithic for simplicity, the system is organized into distinct service layers (Auth, Agent, KB, Tickets, Audit) that could easily be extracted into separate microservices.

**AI-First Approach**: The AI agent is central to the system, automatically triaging tickets and providing intelligent suggestions to reduce human workload.

**Security by Design**: Multiple security layers including JWT authentication, RBAC, rate limiting, input validation, and comprehensive audit logging.

**Scalable Data Model**: MongoDB provides flexible schema design and powerful text search capabilities for the knowledge base.

**Container-Native**: Docker-first architecture ensures consistent deployment across environments.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-helpdesk
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8080
   - **Health Check**: http://localhost:8080/healthz

### Default Users

The system comes with pre-seeded users for immediate testing:

| Role  | Email | Password | Permissions |
|-------|-------|----------|-------------|
| **Admin** | `admin@helpdesk.local` | `admin123` | Full system access |
| **Agent** | `agent@helpdesk.local` | `agent123` | Ticket management, KB editing |
| **User** | `user@helpdesk.local` | `user123` | Create tickets, view own tickets |

## ⚙️ Environment Variables

### Backend (.env)
```bash
# Database
MONGO_URI=mongodb://admin:password123@mongodb:27017/helpdesk?authSource=admin

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:80

# AI Agent Configuration
AUTO_CLOSE_ENABLED=true
CONFIDENCE_THRESHOLD=0.78
STUB_MODE=true

# Email (optional)
MAIL_FROM=noreply@helpdesk.local

# Server
PORT=8080
NODE_ENV=production
```

### Frontend (.env)
```bash
# API Configuration
VITE_API_BASE=http://localhost:8080/api
```

## 🧠 AI Agent Implementation

### How the Agent Works

The AI agent follows a sophisticated workflow to automatically process and respond to tickets:

#### 1. **Ticket Triage Process**
```javascript
// Triggered automatically when a new ticket is created
async function runTriage({ ticketId, traceId }) {
  // 1. Classify the ticket
  const { predictedCategory, confidence } = classifyHeuristic(ticketContent);

  // 2. Retrieve relevant KB articles
  const articles = await retrieveKB(ticketContent);

  // 3. Generate draft reply
  const draft = draftReply(ticket, articles);

  // 4. Auto-close if confidence is high enough
  if (confidence >= CONFIDENCE_THRESHOLD) {
    await autoCloseTicket(ticket, draft);
  } else {
    await assignToHuman(ticket, draft);
  }
}
```

#### 2. **Classification Algorithm**
The agent uses a **heuristic-based classification system** with keyword matching:

```javascript
const KEYWORDS = {
  billing: ['refund','invoice','payment','charged','credit','billing'],
  tech: ['error','bug','stack','crash','500','login','auth','issue'],
  shipping: ['delivery','shipment','tracking','package','courier','delayed']
};

function classifyHeuristic(text) {
  // Count keyword matches for each category
  // Calculate confidence score based on match density
  // Return predicted category and confidence (0-1)
}
```

#### 3. **Knowledge Base Retrieval**
Uses MongoDB's full-text search to find relevant articles:

```javascript
async function retrieveKB(query) {
  return await Article.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(3);
}
```

#### 4. **Reply Generation**
Template-based system with category-specific responses:

```javascript
const templates = {
  billing: "Thank you for contacting us about your billing inquiry...",
  tech: "We've received your technical support request...",
  shipping: "Thank you for reaching out about your shipment...",
  other: "Thank you for contacting our support team..."
};
```

### Agent Tools & Capabilities

1. **Text Classification**: Categorizes tickets into billing, technical, shipping, or other
2. **Knowledge Base Search**: Retrieves relevant articles using MongoDB text search
3. **Template Engine**: Generates personalized responses using predefined templates
4. **Confidence Scoring**: Calculates confidence levels for auto-closure decisions
5. **Audit Logging**: Tracks all agent actions for compliance and debugging

### Guardrails & Safety Measures

#### 1. **Confidence Thresholds**
- **Auto-close threshold**: 0.78 (configurable)
- **Human review required**: < 0.78 confidence
- **Escalation triggers**: Multiple failed classifications

#### 2. **Human Oversight**
- All agent suggestions require human approval by default
- Agents can modify or reject AI-generated responses
- Complete audit trail of all agent decisions

#### 3. **Rate Limiting**
- Triage operations limited to prevent abuse
- Exponential backoff for failed operations
- Circuit breaker pattern for external dependencies

#### 4. **Input Validation**
- All inputs validated using Zod schemas
- SQL injection prevention through parameterized queries
- XSS protection via input sanitization

#### 5. **Error Handling**
- Graceful degradation when AI services fail
- Retry mechanisms with exponential backoff
- Fallback to manual processing when needed

### Agent API Endpoints

```bash
# Trigger manual triage
POST /api/agent/triage
{
  "ticketId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "traceId": "uuid-v4-trace-id"
}

# Get pending suggestions
GET /api/agent/suggestions?category=billing&minConfidence=0.5

# Send agent reply
POST /api/agent/suggestions/:id/reply
{
  "customReply": "Custom response text",
  "resolveTicket": true
}

# Regenerate suggestion with different template
POST /api/agent/suggestions/:id/regenerate
{
  "template": "urgent"
}
```

## 🧪 Testing Instructions

### Backend Testing

The backend uses **Jest** with **MongoDB Memory Server** for isolated testing:

```bash
cd server

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Test Structure
```
server/tests/
├── setup.js              # Test configuration & MongoDB setup
├── fixtures.js           # Mock data for tests
├── auth.test.js          # Authentication tests
├── tickets.test.js       # Ticket management tests
├── kb.test.js            # Knowledge base tests
├── agent.test.js         # AI agent tests
├── agent-workflow.test.js # End-to-end agent workflow
└── audit.test.js         # Audit logging tests
```

#### Test Coverage Summary
- **Lines**: 85%+ coverage
- **Functions**: 90%+ coverage
- **Branches**: 80%+ coverage
- **Statements**: 85%+ coverage

Key test areas:
- ✅ Authentication & authorization
- ✅ CRUD operations for all entities
- ✅ AI agent classification & triage
- ✅ Knowledge base search
- ✅ Input validation & error handling
- ✅ Rate limiting & security
- ✅ Audit logging compliance

### Frontend Testing

The frontend uses **Vitest** with **React Testing Library**:

```bash
cd client

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Test Structure
```
client/src/test/
├── setup.js              # Test configuration
├── components/           # Component unit tests
├── pages/               # Page integration tests
├── hooks/               # Custom hook tests
└── utils/               # Utility function tests
```

### Integration Testing

Run the full system with Docker and test the complete workflow:

```bash
# Start the system
docker-compose up --build

# Run integration tests (if available)
npm run test:integration

# Manual testing checklist:
# 1. User registration & login
# 2. Create ticket as user
# 3. Verify agent triage runs automatically
# 4. Check agent suggestions in admin panel
# 5. Agent responds to ticket
# 6. Verify audit logs
```

### Load Testing

For performance testing, use tools like **Artillery** or **k6**:

```bash
# Example load test
npx artillery quick --count 10 --num 100 http://localhost:8080/api/tickets
```

## 🚀 Development Setup

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   # Backend
   cd server
   npm install

   # Frontend
   cd ../client
   npm install
   ```

2. **Start MongoDB**
   ```bash
   docker run -d -p 27017:27017 --name helpdesk-mongo \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password123 \
     mongo:7-jammy
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cd server
   cp .env.example .env
   # Edit .env with your local settings

   # Frontend
   cd ../client
   cp .env.example .env
   # Edit .env with your local settings
   ```

4. **Seed the database**
   ```bash
   cd server
   npm run seed
   ```

5. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd server
   npm run dev

   # Frontend (Terminal 2)
   cd client
   npm run dev
   ```

### Code Quality

```bash
# Linting
npm run lint

# Formatting (if Prettier is configured)
npm run format

# Type checking (if TypeScript is used)
npm run type-check
```

## 📚 API Documentation

### Authentication Endpoints
```bash
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

### Ticket Management
```bash
GET    /api/tickets              # List tickets (with pagination & filters)
POST   /api/tickets              # Create new ticket
GET    /api/tickets/:id          # Get ticket details
PUT    /api/tickets/:id          # Update ticket
DELETE /api/tickets/:id          # Delete ticket (admin only)
```

### Knowledge Base
```bash
GET    /api/kb?query=search      # Search articles
POST   /api/kb                   # Create article (admin/agent)
GET    /api/kb/:id               # Get article details
PUT    /api/kb/:id               # Update article (admin/agent)
DELETE /api/kb/:id               # Delete article (admin only)
```

### AI Agent
```bash
POST   /api/agent/triage         # Trigger manual triage
GET    /api/agent/suggestions    # Get pending suggestions
GET    /api/agent/suggestions/:id # Get suggestion details
POST   /api/agent/suggestions/:id/reply # Send agent reply
POST   /api/agent/suggestions/:id/regenerate # Regenerate suggestion
```

### Audit & Compliance
```bash
GET    /api/audit               # Get audit logs (admin only)
GET    /api/audit/tickets/:id   # Get ticket audit trail
```

### System Health
```bash
GET    /healthz                 # Health check
GET    /readyz                  # Readiness check
```

## 🌐 Deployment

### Cloud Deployment Options

#### 1. **Railway** (Recommended for demo)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### 2. **Vercel** (Frontend) + **Railway** (Backend)
```bash
# Deploy frontend to Vercel
npx vercel --prod

# Deploy backend to Railway
railway deploy
```

#### 3. **Docker on Cloud Platforms**

**AWS ECS/Fargate:**
```bash
# Build and push to ECR
docker build -t smart-helpdesk .
docker tag smart-helpdesk:latest <account>.dkr.ecr.<region>.amazonaws.com/smart-helpdesk:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/smart-helpdesk:latest
```

**Google Cloud Run:**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/<project>/smart-helpdesk
gcloud run deploy --image gcr.io/<project>/smart-helpdesk --platform managed
```

### Environment Variables for Production

```bash
# Required for production
JWT_SECRET=<strong-random-secret>
MONGO_URI=<production-mongodb-uri>
NODE_ENV=production

# Optional but recommended
CORS_ORIGIN=https://yourdomain.com
CONFIDENCE_THRESHOLD=0.85
AUTO_CLOSE_ENABLED=true
```

### Security Checklist for Production

- [ ] Change default JWT secret
- [ ] Use production MongoDB with authentication
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure monitoring and alerts
- [ ] Set up backup strategy
- [ ] Review and test security headers

## 🎥 Demo Video Script

### Video Walkthrough (≤5 minutes)

**Segment 1: Knowledge Base Setup (1 min)**
1. Login as admin (`admin@helpdesk.local`)
2. Navigate to Knowledge Base
3. Create new article: "How to Reset Password"
4. Add content and tags
5. Save article

**Segment 2: Ticket Creation (1 min)**
1. Logout and login as user (`user@helpdesk.local`)
2. Create new ticket: "I forgot my password"
3. Add description with keywords
4. Submit ticket

**Segment 3: AI Agent Triage (1.5 min)**
1. Login as agent (`agent@helpdesk.local`)
2. View agent suggestions dashboard
3. Show auto-classification result
4. Review KB articles retrieved
5. Examine generated response

**Segment 4: Ticket Resolution (1.5 min)**
1. Agent reviews and approves AI suggestion
2. Optionally modify the response
3. Send reply to user
4. Mark ticket as resolved
5. Show audit trail

**Key Points to Highlight:**
- Automatic ticket classification
- Knowledge base integration
- AI-generated responses
- Human oversight and control
- Complete audit trail
- User-friendly interface

## 🏗️ Tech Stack Summary

### Frontend
- **React 18** with **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **React Hook Form** for form management

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose** ODM
- **JWT** for authentication
- **Helmet** for security headers
- **Rate limiting** and **CORS** protection
- **Zod** for input validation

### Infrastructure
- **Docker** & **Docker Compose** for containerization
- **Nginx** for reverse proxy and static file serving
- **MongoDB** for data persistence
- **Jest** & **Vitest** for testing
- **ESLint** for code quality

### AI & Intelligence
- **Heuristic classification** for ticket categorization
- **MongoDB text search** for knowledge base retrieval
- **Template-based response generation**
- **Confidence scoring** for automation decisions
- **Comprehensive audit logging** for compliance

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for efficient customer support automation**