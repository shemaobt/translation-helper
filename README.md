# Translation Helper - AI-Powered Voice Translation App

A comprehensive **Google Gemini-powered** voice-enabled translation application with universal browser compatibility, featuring Gemini Audio for speech-to-text, Google Cloud TTS for text-to-speech, real-time streaming responses, and optimized performance.

🎉 **Recently migrated from OpenAI to Google Gemini - achieving 97% cost reduction!**

📚 **[Read the Complete Guide](COMPLETE_GUIDE.md)** for detailed documentation, deployment instructions, and architecture diagrams.

## Features

### 🎯 Core Features
- **AI-Powered Translation**: Uses Google Gemini 2.0 Flash for cost-effective translation (~$0.13/M tokens)
- **Voice Recognition**: Gemini Audio integration for speech-to-text conversion
- **Text-to-Speech**: Google Cloud TTS with Neural2 voices
- **Real-time Streaming**: Server-Sent Events (SSE) for streaming AI responses
- **Multi-language Support**: Comprehensive language support for global users
- **Chat Management**: Persistent conversation history with chat organization

### 🔊 Voice Features
- **Speech Recognition**: Record voice messages and convert to text
- **Multiple TTS Voices**: Choose from 6 different AI voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
- **Voice-Specific Caching**: Instant replay for previously generated audio
- **Fast Audio Generation**: Optimized TTS model for 1-3 second response times
- **Transcription Editing**: Edit transcribed text before sending

### ⚡ Performance Optimizations
- **Multi-layer Caching**: Voice-specific audio caching with ETag support
- **Fast TTS Model**: Uses tts-1 model for optimal speed/quality balance
- **Real-time Streaming**: SSE for immediate response display
- **Efficient Audio Processing**: Optimized pipeline for voice features

### 🔐 Security & Authentication
- **Replit Auth Integration**: Secure OpenID Connect authentication
- **Session Management**: PostgreSQL-backed session storage
- **API Key Management**: User-generated API keys for external access
- **Usage Tracking**: Monitor API usage and costs

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **Radix UI** primitives for accessible components

### Backend
- **Node.js** with Express.js
- **TypeScript** with ESM modules
- **Drizzle ORM** with PostgreSQL
- **Passport.js** with OpenID Connect
- **Google Gemini API** integration
- **Google Cloud TTS** for voice synthesis

### Database
- **PostgreSQL** with Neon serverless driver
- **Session storage** for authentication
- **Chat and message persistence**
- **API key management**

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (recommended: [Neon](https://neon.tech) serverless)
- Google Gemini API key ([Get one here](https://ai.google.dev/))
- Google Cloud account (for TTS API)
- Replit account (optional, for authentication)

### Environment Variables
```bash
# Database (use Neon for serverless PostgreSQL)
DATABASE_URL=your_postgresql_connection_string

# Google Gemini API
GOOGLE_API_KEY=your_gemini_api_key

# Google Cloud (for TTS)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Authentication
REPLIT_OIDC_CLIENT_ID=your_replit_client_id
REPLIT_OIDC_CLIENT_SECRET=your_replit_client_secret
REPLIT_OIDC_ISSUER=https://replit.com

# Session
SESSION_SECRET=your_session_secret
```

### Development Setup
```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Production Build
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Using Docker Compose (recommended for local/staging)
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Cloud Run Deployment

See [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md#deployment) for detailed deployment instructions including:
- Terraform infrastructure setup
- GitHub Actions CI/CD configuration
- Environment variable configuration
- Custom domain setup

## API Documentation

### Authentication
The API has two types of endpoints:
- **Protected endpoints** (`/api/*`) - Require authentication via session cookies
- **Public endpoints** (`/api/public/*`) - No authentication required, but rate-limited

### Public API Endpoints

#### Get API Information
```http
GET /api/public/info
```
Returns information about available public endpoints, rate limits, and available voices.

#### Public Text Translation
```http
POST /api/public/translate
Content-Type: application/json

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

#### Public Speech-to-Text
```http
POST /api/public/transcribe
Content-Type: multipart/form-data

Form Data:
- audio: Audio file (required)
- language: Language code (optional, default: 'auto')
```

**Response:**
```json
{
  "text": "Transcribed text content",
  "language": "en-US"
}
```

#### Public Text-to-Speech
```http
POST /api/public/speak
Content-Type: application/json

{
  "text": "Hello world",
  "language": "en-US",
  "voice": "alloy"
}
```

**Response:** Audio file (MP3 format)

**Rate Limits for Public API:**
- 50 requests per 15 minutes per IP address
- Text length limits: 2048 chars for translation, 1024 chars for TTS

### Chat Endpoints

#### Create New Chat
```http
POST /api/chats
Content-Type: application/json

{
  "title": "Chat title"
}
```

#### Get User's Chats
```http
GET /api/chats
```

#### Get Chat Messages
```http
GET /api/chats/:chatId/messages
```

#### Send Message
```http
POST /api/chats/:chatId/messages
Content-Type: application/json

{
  "content": "Message content",
  "role": "user"
}
```

#### Stream AI Response
```http
GET /api/chats/:chatId/stream
Accept: text/event-stream
```

### Voice API Endpoints

#### Speech-to-Text (Whisper)
```http
POST /api/audio/transcribe
Content-Type: multipart/form-data
Authorization: Required

Form Data:
- audio: Audio file (mp3, wav, m4a, etc.)
- language: Target language code (optional)
```

**Response:**
```json
{
  "text": "Transcribed text content",
  "language": "en-US"
}
```

#### Text-to-Speech (TTS)
```http
POST /api/audio/speak
Content-Type: application/json
Authorization: Required

{
  "text": "Text to convert to speech",
  "language": "en-US",
  "voice": "alloy"
}
```

**Available Voices:**
- `alloy` - Versatile and balanced
- `echo` - Clear and articulate  
- `fable` - Expressive and warm
- `onyx` - Deep and authoritative
- `nova` - Warm and engaging
- `shimmer` - Soft and gentle

**Response:** Audio file (MP3 format)

### User Management

#### Get Current User
```http
GET /api/auth/user
```

#### Generate API Key
```http
POST /api/users/api-keys
Content-Type: application/json

{
  "name": "API key name"
}
```

#### Get API Keys
```http
GET /api/users/api-keys
```

## Usage Examples

### JavaScript/TypeScript Client
```typescript
// Send a chat message
const response = await fetch('/api/chats/123/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Translate this to Spanish: Hello world',
    role: 'user'
  })
});

// Convert speech to text
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('language', 'en-US');

const transcription = await fetch('/api/audio/transcribe', {
  method: 'POST',
  body: formData
});

// Convert text to speech
const audioResponse = await fetch('/api/audio/speak', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello, how are you?',
    voice: 'alloy',
    language: 'en-US'
  })
});
const audioBlob = await audioResponse.blob();
```

### Python Client
```python
import requests

# Transcribe audio
with open('audio.mp3', 'rb') as audio_file:
    response = requests.post(
        'https://your-app.replit.app/api/audio/transcribe',
        files={'audio': audio_file},
        data={'language': 'en-US'}
    )
    transcription = response.json()

# Generate speech
response = requests.post(
    'https://your-app.replit.app/api/audio/speak',
    json={
        'text': 'Hello world',
        'voice': 'nova',
        'language': 'en-US'
    }
)
with open('output.mp3', 'wb') as f:
    f.write(response.content)
```

## Performance Features

### Caching Strategy
- **Voice-specific caching**: Each voice has separate cache entries
- **ETag support**: Efficient client-side caching
- **Instant replay**: Previously generated audio plays immediately
- **Memory management**: Automatic cache cleanup and rotation

### Optimization Details
- **Fast TTS Model**: Uses `tts-1` for 1-3 second generation times
- **Streaming Responses**: Real-time AI response display
- **Efficient Audio Processing**: Optimized encoding and delivery
- **Connection Pooling**: Database connection optimization

## Browser Compatibility

- **Chrome/Chromium**: Full support
- **Firefox**: Full support  
- **Safari**: Full support
- **Edge**: Full support
- **Mobile browsers**: Responsive design with touch support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Testing

```bash
# Install test dependencies
pip install -r requirements-test.txt

# Run all tests
./run_tests.sh all

# Run quick tests only
./run_tests.sh quick

# Run with coverage
./run_tests.sh coverage
```

See [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md#testing) for detailed testing documentation.

## Cost Comparison

| Service | OpenAI | Google Gemini | Savings |
|---------|--------|---------------|---------|
| Translation (1M tokens) | $5.00 | $0.13 | **97%** |
| Transcription (1 hour) | $0.36 | Included | **100%** |
| Infrastructure | N/A | ~$5.50/month | Cloud Run |

**Total monthly cost**: ~$15-20 for typical usage (vs $100+ with OpenAI)

## Architecture

The application uses a modern, cloud-native architecture:
- **Frontend**: React + Vite served by Nginx on Google Cloud Run
- **Backend**: Node.js/Express on Google Cloud Run
- **Database**: Neon PostgreSQL (serverless)
- **AI**: Google Gemini 2.0 Flash + Google Cloud TTS
- **Infrastructure**: Terraform for IaC, GitHub Actions for CI/CD

See [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md#architecture) for detailed architecture diagrams.

## Documentation

- **[Complete Guide](COMPLETE_GUIDE.md)** - Comprehensive documentation with diagrams
- **[Terraform Setup](../tf/environments/translation-prod/README.md)** - Infrastructure deployment
- **[API Documentation](COMPLETE_GUIDE.md#api-documentation)** - Full API reference

## Acknowledgments

- **Google Gemini** for cost-effective, high-quality AI
- **Neon** for serverless PostgreSQL
- **Google Cloud** for scalable infrastructure
- **Replit** for authentication services
- **Radix UI** and **shadcn/ui** for the component library
- **Tailwind CSS** for styling utilities