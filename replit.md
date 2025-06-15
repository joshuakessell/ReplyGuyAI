# replit.md

## Overview
This is an enterprise-grade Reddit Reply AI browser extension that generates intelligent, customized responses to Reddit posts and comments directly within the Reddit interface. The extension eliminates API fetching limitations by reading content directly from the page DOM and features comprehensive error handling, logging, and user data management.

## System Architecture

### Browser Extension Architecture
- **Platform**: Chrome Extension Manifest V3
- **Content Scripts**: Direct DOM manipulation and UI injection into Reddit pages
- **Background Service**: Handles AI API communication and extension lifecycle
- **Storage**: Chrome Extension APIs for settings and reply history
- **Permissions**: Active tab access for Reddit.com domains only

### Core Services
- **AI Service**: OpenAI GPT-4o integration with retry logic and error handling
- **Reddit Extractor**: DOM-based content extraction supporting multiple Reddit layouts
- **Storage Service**: Encrypted settings and reply history management
- **Logger**: Enterprise-grade structured logging with storage and export
- **Error Handler**: Comprehensive error categorization and user-friendly messaging

## Key Components

### Extension Components
Located in `extension/` directory:
- **Content Script**: Injects AI reply generator UI directly into Reddit pages
- **Background Service**: Handles AI API communication and extension lifecycle
- **Reddit Extractor**: Reads post/comment data directly from Reddit DOM
- **Popup Interface**: Settings and configuration management
- **Storage Service**: Manages user preferences and reply history

### Core Services
- **AI Service**: OpenAI GPT-4o integration with enterprise-grade error handling
- **Logger**: Structured logging with storage and debugging capabilities  
- **Error Handler**: Categorized error handling with user-friendly messaging
- **Storage Service**: Chrome extension storage with data export/import

## Data Flow

1. **Page Detection**: Content script detects Reddit post or comment page
2. **UI Injection**: AI reply generator interface injected into page
3. **Content Extraction**: DOM parser extracts post/comment content and metadata
4. **Customization**: User specifies reply direction, length, mood, and tone
5. **AI Generation**: Background service calls OpenAI API with structured prompts
6. **Response Display**: Generated reply shown with copy and regeneration options
7. **History Storage**: Successful replies stored locally with full context

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