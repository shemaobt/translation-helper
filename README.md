# OBT Mentor Companion - AI-Powered Mentorship Tracking System

A comprehensive mentorship tracking and assessment application for YWAM Oral Bible Translation (OBT) facilitators. Features competency tracking, qualification management, mentorship activity logging, quarterly report generation, and global memory search powered by Qdrant vector database with semantic search.

## Features

### 🎯 Core Features
- **OBT Mentor Assistant**: Dedicated AI assistant for mentorship guidance and support
- **Competency Tracking**: Track progress across 8 core OBT competencies with status levels
- **Qualification Management**: Store and manage formal courses and credentials
- **Activity Logging**: Record language translation mentorship activities with chapter counts
- **Quarterly Reports**: Generate comprehensive reports compiling all facilitator data
- **Global Memory Search**: Semantic search across all facilitator conversations using Qdrant
- **Portuguese Interface**: Portfolio and report features use Portuguese labels

### 📊 Competency Tracking
Track progress in 8 core competencies:
- Scripture Engagement
- Oral Bible Translation Methods
- Cultural Sensitivity
- Community Development
- Team Leadership
- Training & Facilitation
- Technology Integration
- Program Assessment

Status levels: Not Started, Developing, Proficient, Advanced

### 📚 Portfolio Management
- **Competencies Tab**: Track competency progress with notes
- **Qualifications Tab**: Record formal courses, institutions, completion dates
- **Activities Tab**: Log language translation work with chapter counts
- **Reports Tab**: Generate and view quarterly assessment reports

### 🔍 AI-Powered Features
- **Semantic Memory**: Qdrant vector database stores conversation embeddings
- **Contextual Responses**: AI retrieves relevant past conversations
- **Cross-Learning**: Access insights from other facilitators globally
- **OpenAI Integration**: Uses GPT-4 via Assistant API

### 🔐 Security & Authentication
- **Replit Auth Integration**: Secure OpenID Connect authentication
- **Session Management**: PostgreSQL-backed session storage
- **User Approval System**: Admin approval workflow for new users
- **Secure Reports**: Report access restricted to owning facilitator

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
- **OpenAI API** integration (Assistant API)
- **Qdrant** vector database for semantic search

### Database
- **PostgreSQL** with Neon serverless driver
- **Facilitator profiles** with competency tracking
- **Qualification and activity records**
- **Quarterly report storage**
- **Vector embeddings** in Qdrant Cloud

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- Replit account (for authentication)
- Qdrant Cloud account

### Environment Variables
```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Qdrant Vector Database
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key

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

## API Documentation

### Authentication
All API endpoints require authentication via session cookies.

### Portfolio Endpoints

#### Get Facilitator Profile
```http
GET /api/facilitator
```

#### Update Facilitator Profile
```http
PUT /api/facilitator
Content-Type: application/json

{
  "region": "South America",
  "mentorSupervisor": "John Doe"
}
```

#### Get Competencies
```http
GET /api/facilitator/competencies
```

#### Update Competency
```http
POST /api/facilitator/competencies
Content-Type: application/json

{
  "competencyId": "scripture-engagement",
  "status": "proficient",
  "notes": "Completed advanced training"
}
```

#### Get Qualifications
```http
GET /api/facilitator/qualifications
```

#### Create Qualification
```http
POST /api/facilitator/qualifications
Content-Type: application/json

{
  "courseTitle": "OBT Facilitator Training",
  "institution": "YWAM University",
  "completionDate": "2024-06-15",
  "credential": "Certificate"
}
```

#### Get Activities
```http
GET /api/facilitator/activities
```

#### Create Activity
```http
POST /api/facilitator/activities
Content-Type: application/json

{
  "languageName": "Swahili",
  "chaptersCount": 5,
  "activityDate": "2024-10-01",
  "notes": "Gospel of John chapters 1-5"
}
```

### Report Endpoints

#### Get Reports
```http
GET /api/facilitator/reports
```

#### Generate Report
```http
POST /api/facilitator/reports/generate
Content-Type: application/json

{
  "periodStart": "2024-01-01",
  "periodEnd": "2024-03-31"
}
```

#### Delete Report
```http
DELETE /api/facilitator/reports/:reportId
```

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

#### Send Message (with Global Memory)
```http
POST /api/chats/:chatId/messages
Content-Type: application/json

{
  "content": "How do I improve my facilitation skills?"
}
```

The AI automatically retrieves relevant context from:
- Your past conversations
- Related experiences from other facilitators (global memory)

## Architecture

### Vector Memory System
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Storage**: Qdrant Cloud vector database
- **Search**: Cosine similarity with score thresholds
- **Context**: Facilitator-specific + global cross-learning

### Portfolio Data Model
```typescript
Facilitator {
  id, userId, region, mentorSupervisor,
  totalLanguagesMentored, totalChaptersMentored
}

FacilitatorCompetency {
  facilitatorId, competencyId, status, notes
}

FacilitatorQualification {
  facilitatorId, courseTitle, institution,
  completionDate, credential
}

MentorshipActivity {
  facilitatorId, languageName, chaptersCount,
  activityDate, notes
}

QuarterlyReport {
  facilitatorId, periodStart, periodEnd, reportData
}
```

## Usage

### For Facilitators
1. **Sign up** and wait for admin approval
2. **Complete profile** with region and supervisor info
3. **Track competencies** across 8 core areas
4. **Log activities** for each language mentored
5. **Record qualifications** from training courses
6. **Generate reports** quarterly for assessment
7. **Chat with AI** for mentorship guidance

### For Administrators
1. **Approve users** from pending list
2. **Monitor facilitators** across regions
3. **Review reports** for assessment cycles
4. **Manage permissions** and access

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- **YWAM** for the Oral Bible Translation program
- **OpenAI** for AI models and APIs
- **Qdrant** for vector database capabilities
- **Replit** for hosting and authentication
- **Radix UI** and **shadcn/ui** for component library
