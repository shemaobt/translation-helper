# Translation Helper

**AI-Powered Voice Translation Application with Google Gemini**

A modern, cost-effective translation application featuring voice recognition, text-to-speech, real-time streaming responses, and comprehensive Bible translation assistant tools.

## Features

### Core Capabilities
- **AI Translation** - Context-aware translations using Google Gemini 2.0 Flash (~$0.13/M tokens)
- **Speech-to-Text** - Gemini Audio integration for voice transcription
- **Text-to-Speech** - Google Cloud TTS with Neural2 voices
- **Real-time Streaming** - Server-Sent Events for live AI responses
- **Chat Management** - Persistent conversation history

### Specialized Assistants
- **Storyteller** - Creates engaging, spoken-language stories about biblical themes
- **Oral Performer** - Transforms biblical passages into oral versions for live audiences
- **Conversation Partner** - General translation assistance
- **OBT Health Assessor** - Evaluates Oral Bible Translation projects
- **Back Translation Checker** - Verifies translation accuracy against original texts

### Voice Features
- Multiple TTS voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
- Voice-specific caching for instant replay
- Transcription editing before sending

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express.js, TypeScript, Drizzle ORM |
| **Database** | PostgreSQL (Neon serverless) |
| **AI** | Google Gemini 2.0 Flash, Google Cloud TTS |
| **Infrastructure** | Docker, Google Cloud Run, Terraform, GitHub Actions |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database ([Neon](https://neon.tech) recommended)
- Google Gemini API key ([Get one here](https://ai.google.dev/))
- Google Cloud account (for TTS)

### Installation

```bash
# Clone repository
git clone https://github.com/shemaobt/translation-helper.git
cd translation-helper

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Set up database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host/db
GOOGLE_API_KEY=your_gemini_api_key
SESSION_SECRET=your_session_secret
```

## Project Structure

```
Translation-Helper-WebApp/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities
│   └── nginx.conf          # Production web server config
├── server/                  # Node.js backend
│   ├── gemini.ts           # AI integration
│   ├── prompts.ts          # Agent prompt definitions
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database layer
│   └── db.ts               # Database connection
├── shared/
│   └── schema.ts           # Shared types & DB schema
├── tests/                   # Integration tests
├── Dockerfile.backend       # Backend container
├── Dockerfile.frontend      # Frontend container
└── docker-compose.yml       # Local Docker setup
```

## API Documentation

### Public Endpoints (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/info` | GET | Available endpoints and rate limits |
| `/api/public/translate` | POST | Translate text between languages |
| `/api/public/transcribe` | POST | Convert speech to text |
| `/api/public/speak` | POST | Convert text to speech |

**Rate Limit:** 50 requests per 15 minutes per IP

### Translation Example

```bash
curl -X POST https://your-app.com/api/public/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "fromLanguage": "en-US",
    "toLanguage": "es-ES"
  }'
```

### Protected Endpoints (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chats` | GET/POST | List or create chats |
| `/api/chats/:id/messages` | GET/POST | Get or send messages |
| `/api/chats/:id/stream` | GET | Stream AI responses (SSE) |
| `/api/auth/user` | GET | Current user info |
| `/api/user/profile-image` | POST | Upload profile picture |
| `/api/user/change-password` | POST | Update password |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/prompts` | GET | List all agent prompts |
| `/api/admin/prompts/:id` | GET/PUT | Get or update a prompt |
| `/api/admin/prompts/:id/reset` | POST | Reset prompt to default |
| `/api/admin/users` | GET | List all users |
| `/api/admin/feedback` | GET | View user feedback |

## Prompt Management

Agent prompts are stored in the database and can be managed via the Admin UI at `/admin/prompts`.

### Default Prompts

Edit default prompts in `server/prompts.ts`:

```typescript
export const AGENT_PROMPTS = {
  storyteller: `You are the Storyteller Assistant...`,
  conversation: `You are the Conversation Partner...`,
  performer: `You are the Oral Performer...`,
  // ...
};
```

### Adding a New Agent

1. Add to schema in `shared/schema.ts`:
```typescript
export const ASSISTANTS = {
  // ...existing agents...
  newAgent: {
    id: 'newAgent',
    name: 'New Agent Name',
    description: 'Agent description',
    model: 'gemini-2.0-flash-exp',
  }
};
```

2. Add prompt in `server/prompts.ts`:
```typescript
export const AGENT_PROMPTS = {
  // ...existing prompts...
  newAgent: `Your prompt instructions here...`,
};
```

3. Run `npm run db:push` to seed the prompt to the database.

## Deployment

### Docker (Local/Staging)

```bash
docker compose up -d
docker compose logs -f
```

### Google Cloud Run (Production)

1. **Set up infrastructure with Terraform:**
```bash
cd ../tf/environments/translation-prod
terraform init
terraform apply -var-file="translation-prod.tfvars"
```

2. **Configure GitHub Secrets:**
   - `GCP_PROJECT_ID`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_WORKLOAD_IDENTITY_SERVICE_ACCOUNT`
   - `NEON_DATABASE_URL`
   - `GOOGLE_API_KEY`
   - `SESSION_SECRET`

3. **Deploy via push to main:**
```bash
git push origin main
```

GitHub Actions will automatically build, push, and deploy to Cloud Run.

## Testing

```bash
# Install test dependencies
pip install -r requirements-test.txt

# Run all tests
./run_tests.sh all

# Quick tests only
./run_tests.sh quick

# With coverage
./run_tests.sh coverage
```

## Cost Analysis

| Service | Cost |
|---------|------|
| Cloud Run (100k requests/month) | ~$5/month |
| Gemini 2.0 Flash (1M tokens) | ~$0.13 |
| Google Cloud TTS (1M chars) | ~$16 |
| **Total typical usage** | **~$15-20/month** |

**Compared to OpenAI: 97% cost reduction on AI operations**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:push` | Push schema changes to database |
| `npm run check` | TypeScript type checking |

## Troubleshooting

### Database Connection Error
```bash
# Verify DATABASE_URL format
postgresql://user:password@host:port/database

# Test connection
psql "$DATABASE_URL"
```

### Gemini API Errors
```bash
# Verify API key
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_KEY"
```

### Cloud Run Deployment Issues
```bash
# Check logs
gcloud run services logs read translation-helper-backend \
  --region=us-central1 --limit=50

# Check service status
gcloud run services describe translation-helper-backend \
  --region=us-central1
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
