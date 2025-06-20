# replit.md

## Overview
This is ReplyGuy.AI, an enterprise-grade Reddit Reply AI browser extension that generates intelligent, customized responses to Reddit posts and comments directly within the Reddit interface. The extension eliminates API fetching limitations by reading content directly from the page DOM and features comprehensive error handling, logging, and user data management.

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

## Deployment Strategy

### Browser Extension Development
- **Platform**: Chrome Extension Manifest V3 with cross-browser compatibility
- **Build Process**: TypeScript compilation with Vite bundling for optimized output
- **Distribution**: Chrome Web Store publication with enterprise deployment options
- **Security**: Content Security Policy compliance and minimal permission requirements

### Development Environment
- **Local Development**: TypeScript watch mode with hot reloading for extension components
- **Testing**: Content script injection testing on live Reddit pages
- **Debugging**: Chrome DevTools integration with structured logging output
- **Build Output**: Optimized extension package ready for store submission

### Extension Architecture Benefits
- **No API Limits**: Direct DOM content reading eliminates Reddit API restrictions
- **Real-time Integration**: Seamless UI injection without page navigation
- **Privacy-First**: All data processing happens locally in browser
- **Cross-Platform**: Works on any Chromium-based browser (Chrome, Edge, Brave, etc.)

## Changelog
```
Changelog:
- June 15, 2025. Initial web app setup with Reddit API integration
- June 15, 2025. Complete rewrite as enterprise-grade browser extension
  * Eliminated Reddit API fetching limitations with direct DOM parsing
  * Implemented comprehensive error handling and structured logging
  * Added enterprise-level TypeScript architecture with full type safety
  * Created seamless Reddit page integration with UI injection
  * Built professional extension popup and settings management
- June 15, 2025. Updated README documentation
  * Changed app name from "Reddit Reply AI" to "ReplyGuy.AI"
  * Fixed installation instructions to use correct build script (npm run build)
  * Updated repository URLs to correct GitHub: https://github.com/joshuakessell/ReplyGuyAI
  * Corrected Chrome extension loading path to dist/public folder
- June 15, 2025. Fixed browser extension manifest and naming consistency
  * Created complete Chrome Extension Manifest V3 structure in dist/public/
  * Updated project root manifest.json to use "ReplyGuy.AI" name
  * Fixed all extension source files to use consistent "ReplyGuy.AI" branding
  * Updated GitHub URLs throughout extension popup and background files
  * Fixed client/index.html template with correct "ReplyGuy.AI" branding in title and meta tags
  * Rebuilt extension with correct naming for Chrome Web Store readiness
- June 16, 2025. Completed Chrome extension build system and TypeScript configuration
  * Fixed all TypeScript errors with Chrome extension type definitions
  * Created comprehensive build script (build-extension.js) for extension compilation
  * Built fully functional Chrome extension with background service, content script, and popup
  * Generated extension icons and fixed manifest.json file paths
  * Extension now ready for Chrome Web Store publication at dist/public/
  * All components properly compiled and ready for production deployment
- June 16, 2025. Fixed Chrome extension manifest paths and popup navigation errors
  * Corrected manifest.json file paths to reference correct script locations
  * Fixed popup HTML navigation issue causing ERR_FILE_NOT_FOUND errors
  * Created build-extension-only.js for streamlined extension compilation
  * Extension now loads correctly in Chrome with working popup interface
  * Ready for end-user installation and configuration with OpenAI API key
- June 16, 2025. Created comprehensive first-time onboarding experience
  * Built beautiful welcome page with ReplyGuy.AI branding and smooth animations
  * Implemented 3-step setup flow: welcome, API key configuration, usage tutorial
  * Added real-time API key validation and secure local storage
  * Created visual walkthrough explaining how to use extension on Reddit
  * Fixed manifest web accessible resources to properly load onboarding page
  * Extension now provides complete guided setup experience for new users
- June 16, 2025. Updated build.js to include complete Chrome extension build process
  * Consolidated all extension building functionality into single build.js script
  * Includes background script, content script, popup, and onboarding files
  * Generates extension icons and copies all necessary HTML/JS files
  * Provides unified build command for both web app and Chrome extension
  * Eliminates need for separate build-extension-only.js command
- June 16, 2025. Implemented context menu approach similar to Chrome's "Help Me Write"
  * Replaced hover interface with right-click context menu on textboxes
  * "ReplyGuy.AI" appears in context menu similar to Chrome's native "Help Me Write"
  * Advanced conversation context extraction analyzing original post + comment chains
  * Clean "Help me write" modal interface with Length, Tone, and Approach options
  * Simplified popup configuration to only API key input, test, and save buttons
  * Context-aware reply generation using full Reddit conversation thread as context
  * Professional modal design matching Chrome's native interface patterns
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
Target deployment: Enterprise-level browser extension for GitHub publication.
Code quality: Human-authored appearance with professional development practices.
```