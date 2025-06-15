# replit.md

## Overview
This is a Reddit Reply AI application that generates intelligent, customized responses to Reddit posts and comments. The application features a modern web interface built with React, TypeScript, and shadcn/ui components, backed by an Express.js server with PostgreSQL database integration via Drizzle ORM.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: TailwindCSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: wouter for client-side routing
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware for JSON parsing and logging
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **API Integration**: OpenAI for AI response generation
- **Session Management**: Built-in storage abstraction with memory fallback

## Key Components

### Database Schema
Located in `shared/schema.ts`:
- **users**: User authentication and management
- **redditPosts**: Stores fetched Reddit content (URL, title, content, metadata)
- **aiReplies**: Generated AI responses with customization parameters

### Frontend Components
- **Home Page**: Main interface with multi-step workflow (URL input → content display → customization → AI response)
- **Reddit Content Display**: Shows fetched Reddit posts/comments with metadata
- **Customization Panel**: User input for reply direction, length, and mood preferences
- **AI Response Display**: Generated reply with copy functionality and regeneration options
- **Theme Provider**: Light/dark theme support with system preference detection

### Backend Services
- **Reddit API Integration**: Fetches and parses Reddit content from URLs
- **OpenAI Integration**: Generates customized responses based on user preferences
- **Storage Layer**: Abstracted data access with memory-based implementation
- **API Routes**: RESTful endpoints for Reddit fetching and AI generation

## Data Flow

1. **URL Input**: User pastes Reddit URL on homepage
2. **Content Fetching**: Backend validates URL and fetches Reddit content
3. **Data Storage**: Reddit post/comment stored in database with metadata
4. **Content Display**: Frontend shows fetched content in readable format
5. **Customization**: User specifies reply direction, length, and mood
6. **AI Generation**: Backend sends context and preferences to OpenAI
7. **Response Storage**: Generated reply saved with parameters
8. **Display & Interaction**: User can copy, regenerate, or clear responses

## External Dependencies

### Frontend Dependencies
- **UI Components**: Extensive Radix UI component library for accessible interfaces
- **Styling**: TailwindCSS with PostCSS for processing
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns for time formatting

### Backend Dependencies
- **Database**: PostgreSQL via Neon serverless with connection pooling
- **AI Service**: OpenAI API for response generation
- **Validation**: Zod schemas for type-safe data validation
- **Session Storage**: connect-pg-simple for PostgreSQL session store

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Fast bundling for server-side code
- **Vite Plugins**: Development experience enhancements for Replit

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20, PostgreSQL 16 modules
- **Process**: `npm run dev` starts both frontend (Vite) and backend (tsx) in development mode
- **Port Configuration**: Backend serves on port 5000, frontend proxied through Vite
- **Hot Reload**: Vite HMR for frontend, tsx watch mode for backend

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Static Assets**: Express serves built frontend from public directory
- **Environment**: Production mode with NODE_ENV=production

### Database Management
- **Migrations**: Drizzle Kit handles schema migrations
- **Connection**: Environment variable DATABASE_URL for connection string
- **Development**: PostgreSQL 16 module in Replit environment

## Changelog
```
Changelog:
- June 15, 2025. Initial setup
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```