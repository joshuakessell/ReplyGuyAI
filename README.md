# ReplyGuy.AI - Browser Extension

An enterprise-grade browser extension that generates intelligent, customized AI replies for Reddit posts and comments. Built with TypeScript, featuring comprehensive error handling, structured logging, and seamless Reddit integration.

## Features

- **Seamless Integration**: Injects directly into Reddit pages without requiring external APIs
- **Smart Content Detection**: Automatically extracts post and comment data from any Reddit layout
- **Customizable Responses**: Control tone, length, mood, and direction of AI-generated replies
- **Enterprise Logging**: Comprehensive error tracking and debugging capabilities
- **Data Privacy**: All settings and history stored locally in browser
- **Cross-Platform**: Works on all Chromium-based browsers

## Architecture

### Core Components

- **Content Script**: DOM manipulation and UI injection
- **Background Service**: AI API communication and lifecycle management
- **Reddit Extractor**: Multi-layout content parsing engine
- **Storage Service**: Encrypted local data management
- **Error Handler**: Categorized error handling with user feedback

### Technology Stack

- **TypeScript**: Full type safety across all components
- **Chrome Extensions API**: Manifest V3 compliance
- **OpenAI GPT-4o**: Latest AI model for response generation
- **DOM Parser**: Direct content extraction from Reddit pages
- **Structured Logging**: Enterprise-grade debugging and monitoring

## Installation

### From Source

1. Clone the repository:
```bash
git clone https://github.com/joshuakessell/ReplyGuyAI.git
cd ReplyGuyAI
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/public` folder

### Configuration

1. Click the extension icon in your browser toolbar
2. Enter your OpenAI API key (get one at [OpenAI Platform](https://platform.openai.com/api-keys))
3. Configure default preferences for reply generation
4. The extension is now ready to use on Reddit

## Usage

### Basic Usage

1. Navigate to any Reddit post or comment
2. The AI reply generator will automatically appear
3. Click "Analyze Current Reddit Content" to extract content
4. Customize your reply preferences:
   - **Direction**: What approach the reply should take
   - **Length**: Short (~25 words), Medium (~75 words), or Long (~150 words)
   - **Mood**: Supportive, Witty, Analytical, Casual, or Professional
5. Click "Generate Reply" to create your AI response
6. Copy the reply or regenerate with different settings

### Advanced Features

- **Reply History**: Access previous generations in the popup
- **Data Export**: Backup your settings and history
- **Custom Moods**: Define your own tone and style
- **Context Menu**: Right-click to generate replies quickly

## Privacy & Security

- **Local Storage**: All data stored in browser, never sent to external servers
- **API Key Security**: OpenAI key encrypted and stored locally
- **No Tracking**: Extension doesn't collect or transmit usage data
- **Minimal Permissions**: Only accesses Reddit.com domains

## Development

### Project Structure

```
extension/
├── background/         # Service worker and lifecycle management
├── content/           # Content scripts and Reddit integration
├── popup/             # Extension popup interface
├── services/          # Core business logic services
├── types/             # TypeScript type definitions
└── utils/             # Logging, error handling utilities
```

### Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Type checking
npm run check

# Database schema push
npm run db:push
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Comprehensive linting rules
- **Error Handling**: Categorized error codes with user-friendly messages
- **Logging**: Structured logging with configurable levels
- **Testing**: Unit tests for core functionality

## API Documentation

### Background Service Messages

The extension uses a message-passing system for communication between components:

```typescript
// Generate AI reply
chrome.runtime.sendMessage({
  type: 'GENERATE_REPLY',
  data: { post, customization }
});

// Get settings
chrome.runtime.sendMessage({
  type: 'GET_STORED_SETTINGS'
});

// Update settings
chrome.runtime.sendMessage({
  type: 'UPDATE_SETTINGS',
  data: settings
});
```

### Error Codes

- `API_KEY_MISSING`: OpenAI API key not configured
- `API_KEY_INVALID`: Invalid API key format or authentication
- `REDDIT_CONTENT_NOT_FOUND`: Unable to extract Reddit content
- `CONTENT_EXTRACTION_FAILED`: DOM parsing error
- `NETWORK_ERROR`: Connection or timeout issues

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes with proper TypeScript types
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

### Development Guidelines

- Follow TypeScript strict mode requirements
- Add comprehensive error handling for new features
- Include structured logging for debugging
- Update documentation for API changes
- Maintain backward compatibility when possible

## Troubleshooting

### Common Issues

**Extension not appearing on Reddit pages**
- Ensure you're on a reddit.com domain
- Check that the extension is enabled
- Refresh the page after installation

**API key errors**
- Verify your OpenAI API key is valid
- Check your OpenAI account has credits
- Ensure the key has proper permissions

**Content extraction failures**
- Reddit may have updated their layout
- Check browser console for detailed error messages
- Report layout issues with specific URL examples

### Debug Mode

Enable debug logging by setting the log level in extension popup:
1. Open extension popup
2. Go to Advanced Settings
3. Set Log Level to "Debug"
4. Check browser console for detailed logs

## Support

- **Issues**: [GitHub Issues](https://github.com/joshuakessell/ReplyGuyAI/issues)
- **Documentation**: [Wiki](https://github.com/joshuakessell/ReplyGuyAI/wiki)
- **Community**: [Discussions](https://github.com/joshuakessell/ReplyGuyAI/discussions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### Version 2.0.0
- Complete rewrite as browser extension
- Enterprise-grade error handling and logging
- Direct DOM content extraction
- Improved AI prompt engineering
- Comprehensive TypeScript coverage
- Chrome Extension Manifest V3 compliance

---

**Note**: This extension requires an OpenAI API key to function. The extension is not affiliated with Reddit Inc. or OpenAI.