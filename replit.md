# Overview

The OBT Mentor Companion is an AI-powered full-stack web application designed for YWAM Oral Bible Translation (OBT) facilitators. It provides mentorship tracking and assessment capabilities through an AI assistant, utilizing OpenAI's Assistant API. Key features include user authentication with admin approval, comprehensive facilitator portfolio management (competencies, qualifications, activities), quarterly report generation with English UI, and global memory search using Qdrant Cloud for semantic search across all facilitator conversations. The project aims to enhance mentorship effectiveness and facilitate cross-learning among facilitators.

## Design System
- **Brand Color**: #86884C (olive-green tone) - RGB(134, 136, 76) - HSL(62, 28%, 42%)
- **UI Framework**: Consistent olive-green palette throughout light and dark modes
- **Typography**: Inter font family with English UI labels

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React with TypeScript (Vite)
- **UI**: Radix UI primitives with shadcn/ui and Tailwind CSS (light/dark modes)
- **State Management**: TanStack Query
- **Routing**: Wouter

## Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **Development**: tsx
- **Production**: esbuild

## Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Management**: Express sessions with PostgreSQL store, Passport.js
- **Security**: HTTP-only cookies, admin approval for new users.

## Database
- **Database**: PostgreSQL (Neon serverless driver)
- **ORM**: Drizzle ORM
- **Schema Management**: Drizzle Kit

## Data Models
- **Core Entities**: Users, Facilitators, Facilitator Competencies, Facilitator Qualifications, Mentorship Activities, Quarterly Reports, Chats, Messages, Message Attachments.
- **Competencies**: Tracks 11 OBT core competencies with bilingual names and status levels (not_started, emerging, growing, proficient, advanced).

### 11 Core Competencies (Bilingual Framework)
1. **Habilidades Interpessoais / Interpersonal Skills** - Lead team with active listening, empathy, facilitation
2. **Comunicação Intercultural / Intercultural Communication** - Honor cultural codes, adjust communication naturally
3. **Habilidades Multimodais / Multimodal Skills** - Lead oral, embodied process with stories, gestures, objects
4. **Teorias e Processos de Tradução / Translation Theory & Process** - Understand translation methods, prioritize meaning in oral contexts
5. **Línguas e Comunicação / Languages & Communication** - Understand language mechanics, semantics, metaphor, discourse
6. **Línguas Bíblicas / Biblical Languages** - Consult Hebrew/Greek using exegetical tools when needed
7. **Estudos Bíblicos e Teologia / Biblical Studies & Theology** - Bring historical-cultural background and hermeneutics
8. **Planejamento e Garantia de Qualidade / Planning & Quality Assurance** - Transform vision into simple plans with ongoing QA
9. **Consultoria e Mentoria / Consulting & Mentoring** - Serve as servant-leader who teaches by doing
10. **Tecnologia Aplicada / Applied Technology** - Choose and operate tools for orality (recording, AI, collaboration)
11. **Prática Reflexiva / Reflective Practice** - Exercise self-awareness, align actions with values, welcome feedback

## AI Integration
- **Provider**: OpenAI API (GPT-4o via Assistant API, Whisper API for audio)
- **Assistant**: Dedicated OBT Mentor Assistant
- **Thread Management**: Per-user threads for shared conversation history across all chats.
- **Global Memory**: Qdrant Cloud vector database for storing conversation embeddings.
- **Semantic Search**: Retrieves relevant past conversations for contextual AI responses.
- **Context Injection**: Three-layer system for AI prompts:
    1.  **Portfolio Data**: Facilitator profile, competencies, qualifications, activities.
    2.  **Recent Message History**: Last 20 messages across all user chats.
    3.  **Semantic Vector Search**: Relevant past conversations (user-specific and optional global).
- **Multimodal**: GPT-4o Vision for image analysis, OpenAI Whisper for audio transcription.

## Vector Memory System
- **Provider**: Qdrant Cloud
- **Collection**: obt_global_memory
- **Embeddings**: text-embedding-3-small (1536 dimensions)
- **Search**: Facilitator-specific and global searches for contextual relevance.

## API Design
- **Style**: RESTful
- **Security**: Session-based authentication, CSRF protection, authorization checks (ownership validation).

## Portfolio Management
- **Competencies**: Track progress and update status.
- **Qualifications**: Record formal courses and credentials.
- **Activities**: Log language translation mentorship work.
- **Reports**: Generate, view, and delete quarterly reports. All portfolio sections include English labels.

## Security Features
- Session-based authentication with HTTP-only cookies.
- Authorization with ownership validation for sensitive operations.
- CSRF protection for state-changing endpoints.
- Admin-controlled user approval workflow.
- Secure report access (only to owning facilitator).

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL
- **Authentication**: Replit Auth OIDC
- **AI Service**: OpenAI API (Assistant endpoints, Embeddings API)
- **Vector Database**: Qdrant Cloud

## Frontend Libraries
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Date Handling**: date-fns
- **Form Handling**: React Hook Form with Zod
- **Icons**: lucide-react

## Backend Services
- **Web Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Authentication**: Passport.js with OpenID Connect
- **Session Storage**: connect-pg-simple
- **Password Hashing**: bcryptjs
- **Vector Database Client**: @qdrant/js-client-rest

## Development Tools
- **Build Tools**: Vite (frontend), esbuild (backend)
- **Type Checking**: TypeScript
- **Database Schema**: Drizzle Kit