# Overview

This is an OBT Mentor Companion application - an AI-powered mentorship tracking and assessment system for Oral Bible Translation (OBT) facilitators in Youth With A Mission (YWAM). The application uses OpenAI's Assistant API integrated with Qdrant vector database for global memory search. Built as a full-stack web application, it features facilitator portfolios, competency tracking, qualification management, mentorship activity logging, quarterly report generation, and semantic search across all conversations.

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

## Database Architecture
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling via Neon's serverless pool

## Data Models
- **Users**: Profile information, authentication data, timestamps
- **Chats**: Conversation containers with titles and user associations
- **Messages**: Individual chat messages with role-based typing (user/assistant)
- **API Keys**: User-generated API keys for external access with usage tracking
- **Sessions**: Authentication session storage (required for Replit Auth)

## AI Integration
- **Provider**: OpenAI API with dedicated Assistant (StoryTeller)
- **Model**: GPT-based conversation using OpenAI's Assistant API
- **Thread Management**: Persistent conversation threads for context retention
- **Token Tracking**: Usage monitoring for cost and analytics

## API Design
- **Style**: RESTful API with consistent endpoint patterns
- **Authentication**: Session-based authentication middleware
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Logging**: Request/response logging for API endpoints

## Development Environment
- **Hot Reload**: Vite HMR for frontend, tsx watch mode for backend
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Path Aliases**: Absolute imports using path mapping
- **Replit Integration**: Special development plugins for Replit environment

## Production Architecture
- **Frontend**: Static assets served from Express
- **Backend**: Single Node.js process serving both API and static files
- **Build Process**: Frontend built to dist/public, backend bundled to dist/index.js
- **Environment**: Production-optimized builds with proper asset handling

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth OIDC provider
- **AI Service**: OpenAI API with Assistant endpoints

## Frontend Libraries
- **UI Components**: Radix UI primitive components for accessibility
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: TanStack Query for server state
- **Date Handling**: date-fns for date manipulation
- **Form Handling**: React Hook Form with Zod validation

## Backend Services
- **Web Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Passport.js with OpenID Connect
- **Session Storage**: connect-pg-simple for PostgreSQL sessions
- **Password Hashing**: bcryptjs for secure password handling
- **HTTP Client**: Built-in fetch for OpenAI API communication

## Development Tools
- **Build Tools**: Vite for frontend, esbuild for backend
- **TypeScript**: Full TypeScript support across the stack
- **Development Server**: Vite dev server with Express integration
- **Replit Plugins**: Special development tools for Replit environment