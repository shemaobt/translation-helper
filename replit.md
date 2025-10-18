# Overview

This is the OBT Mentor Companion application - an AI-powered mentorship tracking and assessment system for YWAM Oral Bible Translation (OBT) facilitators. The application uses a dedicated OBT Mentor AI assistant via OpenAI's Assistant API to provide conversational mentorship guidance. Built as a full-stack web application, it features user authentication with admin approval workflow, facilitator portfolio management (competencies, qualifications, activities), quarterly report generation with Portuguese UI, and global memory search using Qdrant Cloud vector database with semantic search across all facilitator conversations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript, built using Vite for fast development and optimized builds
- **UI Library**: Comprehensive component system using Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables for theming, supporting both light and dark modes
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build System**: Vite with custom configuration for development and production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ESM modules
- **Development**: tsx for TypeScript execution in development
- **Production**: esbuild for fast bundling and deployment

## Authentication System
- **Provider**: Replit Auth using OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL session store
- **Strategy**: Passport.js with OpenID Connect strategy
- **Security**: HTTP-only cookies with secure flag for production
- **User Approval**: Admin-controlled approval workflow for new user registration

## Database Architecture
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling via Neon's serverless pool

## Data Models
- **Users**: Profile information, authentication data, admin status, approval workflow
- **Facilitators**: Extended user profile with region, supervisor, mentorship totals
- **Facilitator Competencies**: Track 8 core OBT competencies with status levels
- **Facilitator Qualifications**: Formal courses, credentials, institutions
- **Mentorship Activities**: Language translation work with chapter counts
- **Quarterly Reports**: Compiled facilitator data snapshots for assessment periods
- **Chats**: Conversation containers with titles and user associations
- **Messages**: Individual chat messages with role-based typing (user/assistant)
- **Message Attachments**: File metadata for images and audio attached to messages (includes transcriptions for audio)
- **Sessions**: Authentication session storage (required for Replit Auth)

## Core Competencies Tracked
1. Scripture Engagement
2. Oral Bible Translation Methods
3. Cultural Sensitivity
4. Community Development
5. Team Leadership
6. Training & Facilitation
7. Technology Integration
8. Program Assessment

Status levels: not_started, developing, proficient, advanced

## AI Integration
- **Provider**: OpenAI API with dedicated OBT Mentor Assistant
- **Model**: GPT-4o via OpenAI's Assistant API (with vision and audio capabilities)
- **Thread Management**: Per-user threads for intertwined chats - all user conversations share the same OpenAI thread
- **Intertwined Chats**: Every chat accesses the full conversation history across all user chats through shared thread
- **Global Memory**: Qdrant vector database stores all conversation embeddings
- **Semantic Search**: Retrieves relevant past conversations for contextual responses across all chats
- **Cross-Learning**: Access insights from other facilitators globally
- **Embedding Model**: text-embedding-3-small (1536 dimensions)
- **Image Analysis**: GPT-4o vision for analyzing uploaded images
- **Audio Transcription**: OpenAI Whisper API for transcribing audio files (Portuguese optimized)

## Vector Memory System (Qdrant)
- **Provider**: Qdrant Cloud vector database
- **Collection**: obt_global_memory
- **Dimensions**: 1536 (OpenAI text-embedding-3-small)
- **Distance Metric**: Cosine similarity
- **Indexes**: userId, facilitatorId, chatId for efficient filtering
- **Search Types**: 
  - Facilitator-specific: User's own conversation history
  - Global: Cross-learning from all facilitators
- **Context Injection**: Relevant memories automatically added to AI prompts

## API Design
- **Style**: RESTful API with consistent endpoint patterns
- **Authentication**: Session-based authentication middleware
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Security**: CSRF protection on state-changing endpoints
- **Logging**: Request/response logging for API endpoints
- **Authorization**: Ownership validation for sensitive operations (reports, profiles)

## Portfolio Management
### Competencies Tab
- Track progress across 8 core OBT competencies
- Update status levels with notes
- Portuguese labels: "Competências"

### Qualifications Tab  
- Record formal courses and credentials
- Store institution, completion date, credential type
- Portuguese labels: "Qualificações"

### Activities Tab
- Log language translation mentorship work
- Track chapters mentored per language
- Automatic facilitator totals calculation
- Portuguese labels: "Atividades"

### Reports Tab
- Generate quarterly reports for date ranges
- View compiled facilitator data: competencies, qualifications, activities
- Summary statistics: total chapters, languages, competency completion
- Delete old reports
- Portuguese labels: "Relatórios"

## Development Environment
- **Hot Reload**: Vite HMR for frontend, tsx watch mode for backend
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Path Aliases**: Absolute imports using path mapping (@/components, @shared, @assets)
- **Replit Integration**: Special development plugins for Replit environment
- **Database Tools**: Drizzle Kit for schema management (npm run db:push)

## Production Architecture
- **Frontend**: Static assets served from Express
- **Backend**: Single Node.js process serving both API and static files
- **Build Process**: Frontend built to dist/public, backend bundled to dist/index.js
- **Environment**: Production-optimized builds with proper asset handling
- **Deployment**: Replit deployment system for publishing

## Security Features
- **Authentication**: Session-based with HTTP-only cookies
- **Authorization**: Ownership validation on all sensitive operations
- **CSRF Protection**: Required on all state-changing endpoints
- **Admin Controls**: User approval workflow prevents unauthorized access
- **Report Security**: Reports accessible only to owning facilitator
- **Password Hashing**: bcryptjs for secure password handling

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth OIDC provider
- **AI Service**: OpenAI API with Assistant endpoints and Embeddings API
- **Vector Database**: Qdrant Cloud for semantic memory search

## Frontend Libraries
- **UI Components**: Radix UI primitive components for accessibility
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: TanStack Query for server state
- **Date Handling**: date-fns for date manipulation and formatting
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: lucide-react for UI icons

## Backend Services
- **Web Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Passport.js with OpenID Connect
- **Session Storage**: connect-pg-simple for PostgreSQL sessions
- **Password Hashing**: bcryptjs for secure password handling
- **HTTP Client**: Built-in fetch for OpenAI API communication
- **Vector Database Client**: @qdrant/js-client-rest for Qdrant Cloud

## Development Tools
- **Build Tools**: Vite for frontend, esbuild for backend
- **TypeScript**: Full TypeScript support across the stack
- **Development Server**: Vite dev server with Express integration
- **Replit Plugins**: Special development tools for Replit environment
- **Schema Management**: Drizzle Kit for database migrations

# Recent Changes (October 2024)

## Complete Transformation from Translation Helper
- Renamed all branding from "Translation Helper" to "OBT Mentor Companion"
- Removed translation, voice recognition, and TTS features
- Implemented mentorship tracking system with portfolio management
- Added Qdrant Cloud integration for global memory search
- Built quarterly report generation system with Portuguese UI
- Added admin approval workflow for new users
- Implemented comprehensive security for report access

## Database Schema Updates
- Added facilitators table with region, supervisor, totals
- Added facilitator_competencies for tracking 8 core competencies
- Added facilitator_qualifications for course/credential records
- Added mentorship_activities for language work logging
- Added quarterly_reports for assessment period snapshots
- Added message_attachments table for image and audio file storage
- Added approval workflow fields to users table
- Added `userThreadId` field to users table for intertwined chats (per-user OpenAI threads)

## AI System Enhancements
- Replaced multiple assistants with single OBT Mentor assistant
- **Intertwined Chat Architecture**: Migrated from per-chat threads to per-user threads
  - Added `userThreadId` field to users table for shared conversation context
  - All user chats now share the same OpenAI thread for seamless context flow
  - AI assistant automatically has access to entire conversation history across all chats
- Integrated Qdrant vector database for conversation embeddings
- Implemented semantic search for contextual AI responses across all user chats
- Added cross-facilitator learning with global memory search
- Automatic context injection from relevant past conversations via semantic search
- Lowered vector similarity thresholds (0.5 user/0.6 global) for improved recall
- Enhanced assistant instructions with explicit memory usage directives

## Multimodal Capabilities (October 2024)
- **Image Upload & Analysis**: Users can upload images (jpg, png, gif, webp - max 10MB)
  - GPT-4o vision analyzes images in context of conversations
  - Inline image display in chat messages
  - Secure file storage in uploads directory
- **Audio Upload & Transcription**: Users can upload audio files (mp3, wav, m4a, ogg - max 25MB for 5min)
  - OpenAI Whisper API transcribes audio (Portuguese optimized)
  - Audio player with playback controls in chat
  - Transcriptions stored and displayed with audio files
  - AI assistant receives transcriptions for contextual responses
- **File Upload UI**: Paperclip attachment button with file picker, previews, and progress indicators
- **API Endpoints**: POST /api/messages/:messageId/attachments, GET /api/messages/:messageId/attachments

## UI/UX Improvements
- Built portfolio management page with 4 tabs (Portuguese labels)
- Added competency tracker with status level selection
- Created qualification management with form validation
- Implemented activity logger with automatic totals calculation
- Added quarterly report generation with date range picker
- Improved sidebar navigation with facilitator-focused items
- Simplified "New Chat" button (removed dropdown menu)
- Added file attachment UI with previews and upload progress
