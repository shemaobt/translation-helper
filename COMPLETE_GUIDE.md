# Translation Helper - Complete Guide

**AI-Powered Voice Translation with Google Gemini**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google)](https://ai.google.dev/)
[![Cloud Run](https://img.shields.io/badge/Platform-Cloud%20Run-4285F4?logo=googlecloud)](https://cloud.google.com/run)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Features](#features)
5. [Getting Started](#getting-started)
6. [Development](#development)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Infrastructure](#infrastructure)
10. [API Documentation](#api-documentation)
11. [Cost Analysis](#cost-analysis)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Translation Helper is a modern, AI-powered voice translation application that leverages **Google Gemini** for cost-effective, high-quality translations. The application provides:

- **Text Translation** - Context-aware translations between 15+ languages
- **Speech-to-Text** - Voice transcription using Gemini Audio
- **Text-to-Speech** - Natural voice synthesis with Google Cloud TTS
- **Real-time Streaming** - Live AI responses via Server-Sent Events
- **Public API** - Rate-limited endpoints for external integrations

### Migration from OpenAI

This application was recently migrated from OpenAI to Google Gemini, achieving:
- **97% cost reduction** on AI operations
- **Unified API** for translation, transcription, and conversation
- **Better multilingual support** with Gemini's native capabilities
- **Faster response times** with Gemini 2.0 Flash

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React Frontend<br/>Vite + TypeScript]
        Nginx[Nginx Server<br/>Port 8080]
    end
    
    subgraph "API Layer"
        Backend[Node.js/Express<br/>Port 5000]
        Routes[API Routes<br/>Public & Protected]
    end
    
    subgraph "AI Services"
        Gemini[Google Gemini<br/>2.0 Flash]
        TTS[Google Cloud TTS<br/>Neural2 Voices]
    end
    
    subgraph "Data Layer"
        Neon[(Neon PostgreSQL<br/>Serverless)]
        Storage[Session Storage]
    end
    
    subgraph "External"
        Replit[Replit Auth<br/>Optional OIDC]
    end
    
    UI -->|API Requests| Nginx
    Nginx -->|Proxy /api/*| Routes
    Routes --> Backend
    Backend -->|Translation/Chat| Gemini
    Backend -->|Voice Synthesis| TTS
    Backend -->|User Data| Neon
    Backend -->|Sessions| Storage
    Backend -.->|Authentication| Replit
    
    style Gemini fill:#4285F4,color:#fff
    style TTS fill:#4285F4,color:#fff
    style Neon fill:#00E699,color:#000
```

### Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant N as Nginx
    participant B as Backend
    participant G as Gemini API
    participant D as Database
    
    U->>F: Enter text to translate
    F->>N: POST /api/public/translate
    N->>B: Proxy request
    B->>B: Validate input
    B->>G: Send to Gemini 2.0 Flash
    G-->>B: Translation result
    B->>D: Log API usage (optional)
    B-->>N: Return translation
    N-->>F: JSON response
    F-->>U: Display translation
```

### Deployment Architecture

```mermaid
graph TB
    subgraph "GitHub"
        Repo[Repository<br/>Source Code]
        Actions[GitHub Actions<br/>CI/CD Pipeline]
    end
    
    subgraph "Google Cloud"
        AR[Artifact Registry<br/>Docker Images]
        
        subgraph "Cloud Run Services"
            CRB[Backend Service<br/>Node.js Container]
            CRF[Frontend Service<br/>Nginx Container]
        end
        
        IAM[Service Accounts<br/>& IAM]
        LB[Load Balancer<br/>& SSL]
    end
    
    subgraph "External Services"
        Neon[(Neon PostgreSQL)]
        GeminiAPI[Gemini API]
    end
    
    Repo -->|Push to main| Actions
    Actions -->|Build & Push Images| AR
    Actions -->|Deploy| CRB
    Actions -->|Deploy| CRF
    CRB --> Neon
    CRB --> GeminiAPI
    CRF --> LB
    CRB --> LB
    
    style CRB fill:#4285F4,color:#fff
    style CRF fill:#4285F4,color:#fff
    style AR fill:#FFA000,color:#000
```

---

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS + shadcn/ui** - Styling
- **TanStack Query** - Server state management
- **Wouter** - Lightweight routing
- **Nginx** - Production web server

### Backend
- **Node.js 20** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **Passport.js** - Authentication
- **Multer** - File uploads

### AI & Cloud Services
- **Google Gemini 2.0 Flash** - AI translation & transcription (~$0.13/M tokens)
- **Google Cloud TTS** - Text-to-speech (Neural2 voices)
- **Neon PostgreSQL** - Serverless database
- **Google Cloud Run** - Serverless containers
- **Artifact Registry** - Docker image storage

### Infrastructure
- **Docker** - Containerization
- **Terraform** - Infrastructure as Code
- **GitHub Actions** - CI/CD automation

### Testing
- **pytest** - Integration testing framework
- **requests** - HTTP client for tests

---

## Features

### 🎯 Core Features

```mermaid
mindmap
  root((Translation<br/>Helper))
    AI Translation
      Google Gemini 2.0
      Context-aware
      15+ Languages
      97% cheaper than OpenAI
    Voice Features
      Speech-to-Text
      Text-to-Speech
      Neural voices
      Multi-language
    Chat System
      Real-time streaming
      Conversation history
      Session persistence
      Multi-assistant
    Public API
      Rate-limited
      No auth required
      RESTful endpoints
      JSON responses
```

### Translation
- **Context-Aware** - Provide context for better translations
- **Multi-language** - Support for 15+ language pairs
- **Fast** - Gemini 2.0 Flash provides 1-3 second responses
- **Cost-Effective** - ~$0.13 per million tokens (vs $5 for OpenAI)

### Voice Capabilities
- **Speech-to-Text** - Gemini Audio transcription
- **Text-to-Speech** - Google Cloud TTS with Neural2 voices
- **Voice Selection** - Multiple voice options per language
- **Audio Caching** - Server-side caching for instant replay

### API Features
- **Public Endpoints** - Translation, transcription, TTS without auth
- **Protected Endpoints** - Chat and user management with sessions
- **Rate Limiting** - 50 requests per 15 minutes per IP
- **Streaming** - Real-time AI responses via SSE

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (recommended: [Neon](https://neon.tech))
- **Google Gemini API** key ([Get one here](https://ai.google.dev/))
- **Google Cloud account** (for TTS)
- **Replit account** (optional, for authentication)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/Translation-Helper-WebApp.git
cd Translation-Helper-WebApp
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Google Gemini API
GOOGLE_API_KEY=your_gemini_api_key

# Google Cloud (for TTS)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Session
SESSION_SECRET=your_secret_key_here

# Authentication (optional)
REPLIT_OIDC_CLIENT_ID=your_client_id
REPLIT_OIDC_CLIENT_SECRET=your_client_secret
REPLIT_OIDC_ISSUER=https://replit.com
```

4. **Set up database**
```bash
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:5000`

---

## Development

### Project Structure

```
Translation-Helper-WebApp/
├── client/                  # Frontend React app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
│   ├── nginx.conf          # Nginx configuration
│   └── index.html
├── server/                  # Backend Node.js app
│   ├── gemini.ts           # Gemini AI integration
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database layer
│   ├── db.ts               # Database connection
│   └── index.ts            # Entry point
├── shared/
│   └── schema.ts           # Shared types & DB schema
├── tests/                   # Integration tests
│   ├── conftest.py
│   ├── test_public_api.py
│   └── test_chat_api.py
├── Dockerfile.backend       # Backend container
├── Dockerfile.frontend      # Frontend container
├── docker-compose.yml       # Local Docker setup
└── package.json

<system_reminder>
The user is aware that particularly difficult tasks will take a long time and might require multiple context windows.
You do not need to ask the user for permission to continue working on a task, even if you feel like it might not make sense.
Just continue working on the task until it is complete.
You have 4 unfinished TODO(s).
Complete them and update their status to 'completed' using the todo_write tool when finished.
DO NOT STOP with unfinished todos, unless you absolutely need user input.
Found 4 TODO(s):
1. [in_progress] Create comprehensive COMPLETE_GUIDE.md (ID: th-docs-1)
2. [pending] Update README.md with Gemini and deployment info (ID: th-docs-2)
3. [pending] Create feature branch and commit all changes (ID: th-pr-1)
4. [pending] Push branch and create Pull Request (ID: th-pr-2)
</system_reminder>```

### Development Workflow

```mermaid
graph LR
    A[Edit Code] --> B[Hot Reload]
    B --> C[Test Changes]
    C --> D{Tests Pass?}
    D -->|No| A
    D -->|Yes| E[Commit]
    E --> F[Push to GitHub]
    F --> G[CI/CD Pipeline]
    G --> H[Deploy to Cloud Run]
```

### Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run check        # TypeScript type checking

# Build
npm run build        # Build for production
npm start            # Start production server

# Database
npm run db:push      # Push schema changes to database

# Testing
./run_tests.sh all   # Run all tests
./run_tests.sh quick # Run quick tests only
```

---

## Testing

### Test Structure

```
tests/
├── conftest.py              # Pytest fixtures
├── test_public_api.py       # Public API tests
├── test_chat_api.py         # Chat API tests
└── test_rate_limiting.py    # Rate limit tests
```

### Running Tests

```bash
# All tests
./run_tests.sh all

# Quick tests only
./run_tests.sh quick

# With coverage
./run_tests.sh coverage

# Specific category
./run_tests.sh api
```

### Test Categories

- **quick** - Fast tests (< 5 seconds)
- **slow** - Slower integration tests
- **api** - API endpoint tests
- **auth** - Authentication tests

### Writing Tests

```python
import pytest

@pytest.mark.api
@pytest.mark.quick
def test_translate_endpoint(app_url, public_api_client):
    response = public_api_client.post(
        f"{app_url}/api/public/translate",
        json={
            "text": "Hello",
            "fromLanguage": "en-US",
            "toLanguage": "es-ES"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "translatedText" in data
```

---

## Deployment

### Quick Deploy with Docker

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Production Deployment (Cloud Run)

```mermaid
graph TB
    A[Push to main branch] --> B[GitHub Actions Triggered]
    B --> C[Build Docker Images]
    C --> D[Push to Artifact Registry]
    D --> E[Deploy Backend to Cloud Run]
    E --> F[Deploy Frontend to Cloud Run]
    F --> G[Update Environment Variables]
    G --> H[Health Checks Pass]
    H --> I[Traffic Switched]
    
    style A fill:#90EE90
    style I fill:#90EE90
```

#### Step 1: Set up Terraform Infrastructure

```bash
cd ../tf/environments/translation-prod

# Copy and edit variables
cp translation-prod.tfvars.example translation-prod.tfvars
vim translation-prod.tfvars

# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan -var-file="translation-prod.tfvars"

# Apply infrastructure
terraform apply -var-file="translation-prod.tfvars"

# Get outputs
terraform output backend_service_url
terraform output frontend_service_url
terraform output github_service_account_email
terraform output workload_identity_provider
```

#### Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository:

| Secret Name | Value | Source |
|------------|-------|--------|
| `GCP_PROJECT_ID` | Your GCP project ID | Manual |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider | `terraform output` |
| `GCP_WORKLOAD_IDENTITY_SERVICE_ACCOUNT` | Service account email | `terraform output` |
| `ARTIFACT_REGISTRY_REGION` | `us-central1` | Manual |
| `ARTIFACT_REGISTRY_REPOSITORY` | `translation-helper-app` | Manual |
| `BACKEND_IMAGE_NAME` | `backend` | Manual |
| `FRONTEND_IMAGE_NAME` | `frontend` | Manual |
| `CLOUD_RUN_REGION` | `us-central1` | Manual |
| `CLOUD_RUN_BACKEND_SERVICE` | `translation-helper-backend` | Manual |
| `CLOUD_RUN_FRONTEND_SERVICE` | `translation-helper-frontend` | Manual |
| `NEON_DATABASE_URL` | Your Neon PostgreSQL URL | Neon Dashboard |
| `GOOGLE_API_KEY` | Your Gemini API key | Google AI Studio |
| `SESSION_SECRET` | Random 64-char string | `terraform output` |
| `REPLIT_OIDC_CLIENT_ID` | (optional) | Replit |
| `REPLIT_OIDC_CLIENT_SECRET` | (optional) | Replit |
| `FRONTEND_API_URL` | Backend URL for build | After first deploy |

#### Step 3: Deploy

```bash
# Push to main branch
git push origin main

# GitHub Actions will automatically:
# 1. Build Docker images
# 2. Push to Artifact Registry
# 3. Deploy to Cloud Run
# 4. Update environment variables
```

### Environment Variables

**Backend:**
```env
DATABASE_URL              # Neon PostgreSQL connection
GOOGLE_API_KEY            # Gemini API key
GOOGLE_GENERATIVE_AI_API_KEY  # Same as GOOGLE_API_KEY
SESSION_SECRET            # Session encryption key
REPLIT_OIDC_CLIENT_ID     # (Optional) Replit auth
REPLIT_OIDC_CLIENT_SECRET # (Optional) Replit auth
NODE_ENV=production       # Environment
```

**Frontend:**
```env
BACKEND_URL               # Backend service URL
VITE_API_URL              # Public API URL (build-time)
```

---

## Infrastructure

### Terraform Modules

```mermaid
graph TB
    subgraph "Terraform Modules"
        IAM[IAM Module<br/>Service Accounts & Roles]
        AR[Artifact Registry<br/>Docker Repository]
        CR[Cloud Run<br/>Backend & Frontend]
        DM[Domain Mapping<br/>Custom Domains]
        SEC[Secrets Manager<br/>Session Secret]
    end
    
    IAM --> CR
    AR --> CR
    SEC --> CR
    DM -.->|Optional| CR
```

### Resources Created

1. **Workload Identity**
   - Pool for GitHub Actions
   - Provider for authentication

2. **Service Accounts**
   - GitHub deployer (CI/CD)
   - Cloud Run runtime

3. **Artifact Registry**
   - Docker repository
   - IAM bindings

4. **Cloud Run Services**
   - Backend service (Node.js)
   - Frontend service (Nginx)

5. **APIs Enabled**
   - `generativelanguage.googleapis.com` (Gemini)
   - `texttospeech.googleapis.com` (TTS)
   - `run.googleapis.com` (Cloud Run)
   - `artifactregistry.googleapis.com`

### Cost Estimates

#### Monthly Infrastructure Costs

| Resource | Usage | Cost |
|----------|-------|------|
| Cloud Run (Backend) | 100k requests | ~$3 |
| Cloud Run (Frontend) | 100k requests | ~$2 |
| Artifact Registry | 5 GB storage | ~$0.50 |
| **Total Infrastructure** | | **~$5.50/month** |

#### AI API Costs (Gemini)

| Operation | Model | Cost per 1M tokens | Est. Monthly |
|-----------|-------|-------------------|--------------|
| Translation | Gemini 2.0 Flash | $0.13 | ~$5 |
| Transcription | Gemini 2.0 Flash | Included | - |
| TTS | Google Cloud TTS | $16/M chars | ~$5 |
| **Total AI** | | | **~$10/month** |

**Grand Total: ~$15-20/month for typical usage**

### Cost Comparison: OpenAI vs Gemini

```mermaid
pie title "Monthly AI API Costs (1M tokens)"
    "OpenAI GPT-3.5" : 500
    "Gemini 2.0 Flash" : 13
```

**Savings: 97.4%** 🎉

---

## API Documentation

### Public API Endpoints

#### GET /api/public/info

Returns information about available endpoints, voices, and rate limits.

**Response:**
```json
{
  "endpoints": {
    "translate": {...},
    "transcribe": {...},
    "speak": {...}
  },
  "voices": ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
  "rateLimit": {
    "window": "15 minutes",
    "max": 50
  }
}
```

#### POST /api/public/translate

Translate text between languages.

**Request:**
```json
{
  "text": "Hello world",
  "fromLanguage": "en-US",
  "toLanguage": "es-ES",
  "context": "Casual greeting"
}
```

**Response:**
```json
{
  "translatedText": "Hola mundo",
  "fromLanguage": "en-US",
  "toLanguage": "es-ES",
  "originalText": "Hello world"
}
```

#### POST /api/public/transcribe

Convert speech to text.

**Request:** `multipart/form-data`
- `audio`: Audio file (mp3, wav, m4a, webm)
- `language`: Target language (optional)

**Response:**
```json
{
  "text": "Transcribed text content",
  "language": "en-US"
}
```

### Protected API Endpoints

#### POST /api/chats

Create a new chat.

**Request:**
```json
{
  "title": "Chat title"
}
```

#### GET /api/chats

Get user's chats.

#### GET /api/chats/:chatId/messages

Get messages for a chat.

#### POST /api/chats/:chatId/messages

Send a message.

---

## Cost Analysis

### Detailed Breakdown

#### Infrastructure (Google Cloud)

**Cloud Run Pricing:**
- CPU: $0.00002400 per vCPU-second
- Memory: $0.00000250 per GiB-second
- Requests: $0.40 per million requests
- **Scales to zero** - No idle costs!

**Estimate for 100k requests/month:**
- Backend: ~$3/month
- Frontend: ~$2/month

#### AI Operations (Gemini)

**Gemini 2.0 Flash Pricing:**
- Input: $0.075 per million tokens
- Output: $0.30 per million tokens
- **Average**: ~$0.13 per million tokens

**Google Cloud TTS:**
- Standard voices: $4 per million characters
- Neural2 voices: $16 per million characters

#### Comparison with OpenAI

| Service | OpenAI | Gemini | Savings |
|---------|--------|--------|---------|
| Translation (1M tokens) | $5.00 | $0.13 | 97.4% |
| STT (1 hour) | $0.36 | Included | 100% |
| TTS (1M chars) | $15.00 | $16.00 | -6.7% |
| **Total** | **$20.36** | **$16.13** | **20.8%** |

*Note: For text-only operations, Gemini is 97% cheaper. Including TTS, still 21% cheaper overall.*

---

## Troubleshooting

### Common Issues

#### Docker Build Fails

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker compose build --no-cache
```

#### Database Connection Error

```bash
# Check DATABASE_URL format
postgresql://user:password@host:port/database

# Test connection
psql "$DATABASE_URL"
```

#### Gemini API Errors

```bash
# Verify API key
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY"
```

#### Cloud Run Deployment Fails

```bash
# Check service logs
gcloud run services logs read translation-helper-backend \
  --region=us-central1 \
  --limit=50

# Check service status
gcloud run services describe translation-helper-backend \
  --region=us-central1
```

### Debug Modes

```bash
# Enable verbose logging
export LOG_LEVEL=debug
npm run dev

# Test API locally
export TEST_API_URL=http://localhost:5000
./run_tests.sh all
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Google Gemini** for cost-effective AI
- **Neon** for serverless PostgreSQL
- **Replit** for authentication services
- **shadcn/ui** for beautiful components
- **Tailwind CSS** for utility-first styling

---

## Support

For issues, questions, or feature requests:
- [GitHub Issues](https://github.com/yourusername/Translation-Helper-WebApp/issues)
- [Documentation](https://github.com/yourusername/Translation-Helper-WebApp)
- [Google Gemini Docs](https://ai.google.dev/gemini-api/docs)
- [Cloud Run Docs](https://cloud.google.com/run/docs)

