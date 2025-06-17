# Fillo - Intelligent Form Filler Chrome Extension

## Overview
A Chrome extension that detects form fields on localhost development sites and uses LLM providers to generate meaningful content. Features intelligent caching, multiple LLM providers, and a user-friendly creativity control system.

## Project Structure
```
fillo/
├── manifest.json                 # Chrome extension manifest
├── package.json                  # Bun dependencies
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration with SolidJS
├── src/
│   ├── background/
│   │   └── background.ts         # Service worker for extension
│   ├── content/
│   │   ├── content.ts           # Content script (localhost-only activation)
│   │   ├── form-detector.ts     # Form field detection logic
│   │   └── hostname-checker.ts  # Localhost validation
│   ├── popup/
│   │   ├── components/
│   │   │   ├── StatusIndicator.tsx  # Provider connection status
│   │   │   ├── QuickSettings.tsx    # Quick creativity/provider toggle
│   │   │   └── CacheStats.tsx       # Cache hit rate display
│   │   ├── Popup.tsx            # Main popup component
│   │   ├── popup.html           # Popup HTML entry point
│   │   ├── popup.tsx            # Popup entry point
│   │   └── popup.css            # Popup styling
│   ├── options/
│   │   ├── components/
│   │   │   ├── ProviderSettings.tsx  # LLM provider configuration
│   │   │   ├── ApiKeyManager.tsx     # API key input/validation
│   │   │   ├── CreativitySlider.tsx  # Temperature control (0.1-2.0)
│   │   │   ├── ModelSelector.tsx     # Model selection per provider
│   │   │   ├── CacheSettings.tsx     # Cache management options
│   │   │   ├── GeneralSettings.tsx   # General preferences
│   │   │   └── TestConnection.tsx    # Test API connectivity
│   │   ├── Options.tsx          # Main options component with tabs
│   │   ├── options.html         # Options HTML entry point
│   │   ├── options.tsx          # Options entry point
│   │   └── options.css          # Options styling
│   ├── settings/
│   │   ├── provider-config.ts   # Provider configuration types
│   │   ├── settings-manager.ts  # Settings persistence & defaults
│   │   ├── creativity-presets.ts # Creativity level presets
│   │   └── validation.ts        # API key & settings validation
│   ├── database/
│   │   ├── sqlite.ts            # SQLite database setup (sql.js)
│   │   ├── cache.ts             # LLM response caching
│   │   ├── suggestions.ts       # Previous suggestions storage
│   │   └── migrations.ts        # Database schema migrations
│   ├── llm/
│   │   ├── providers/
│   │   │   ├── base-provider.ts # Abstract LLM provider
│   │   │   ├── openai.ts        # OpenAI provider (GPT-3.5/4)
│   │   │   ├── anthropic.ts     # Anthropic provider (Claude)
│   │   │   ├── google.ts        # Google Gemini provider
│   │   │   ├── ollama.ts        # Ollama local provider
│   │   │   └── index.ts         # Provider exports
│   │   ├── field-analyzer.ts    # Analyze form fields with caching
│   │   ├── content-generator.ts # Generate field content with cache
│   │   ├── cache-manager.ts     # Smart cache invalidation
│   │   └── prompt-builder.ts    # Build prompts with creativity context
│   ├── storage/
│   │   ├── storage.ts           # Chrome storage utilities
│   │   └── encryption.ts        # API key encryption
│   ├── ui/
│   │   ├── components/
│   │   │   ├── FormOverlay.tsx  # SolidJS overlay component
│   │   │   ├── FieldButton.tsx  # Generator icon button
│   │   │   ├── SuggestionPanel.tsx # Previous suggestions panel
│   │   │   ├── RegenerateButton.tsx # Regenerate with options
│   │   │   └── CreativityIndicator.tsx # Show current creativity level
│   │   ├── overlay.ts           # Overlay injection logic
│   │   └── overlay.css          # Overlay styling
│   └── types/
│       └── index.ts             # TypeScript type definitions
├── dist/                        # Built extension files
└── public/                      # Static assets
    ├── icons/                   # Extension icons
    │   ├── icon16.png
    │   ├── icon48.png
    │   └── icon128.png
    └── sql-wasm.wasm            # SQLite WebAssembly
```

## Key Features

### Core Functionality
1. **Localhost-Only Operation**: Extension only activates on localhost/127.0.0.1/dev domains
2. **Smart Form Detection**: Detect form fields with context awareness
3. **Multi-Provider LLM Support**: OpenAI, Anthropic, Google, Ollama (local)
4. **SQLite Caching**: Cache responses to minimize API calls

### Settings Panel Features
5. **Provider Selection**: Choose between different LLM providers
6. **API Key Management**: Secure input, validation, and encrypted storage
7. **Creativity Control**: Slider (0.1-2.0 temperature) labeled as "Creativity"
8. **Model Selection**: Choose specific models per provider
9. **Connection Testing**: Validate API keys and connectivity
10. **Cache Management**: Clear cache, set expiration, view statistics

### Creativity Settings
11. **Creativity Slider**: 
    - Low (0.1-0.3): "Predictable" - Conservative, consistent responses
    - Medium (0.4-0.7): "Balanced" - Good mix of accuracy and variation
    - High (0.8-1.2): "Creative" - More varied and creative responses
    - Very High (1.3-2.0): "Experimental" - Highly creative, less predictable
12. **Presets**: Quick buttons for common creativity levels
13. **Per-Field Override**: Different creativity for different field types
14. **Visual Indicator**: Show current creativity level in UI

### UI/UX Features
15. **Generator Icons**: Subtle icons next to form fields
16. **Previous Suggestions**: Show cached suggestions with creativity level used
17. **Regenerate Options**: Multiple generation options with creativity preview
18. **Quick Settings**: Creativity adjustment from popup

## Settings Panel Structure

### Provider Settings Tab
- **Provider Selection**: Radio buttons for OpenAI, Anthropic, Google, Ollama
- **API Key Input**: Masked input with show/hide toggle and validation
- **Model Selection**: Dropdown for available models per provider
- **Custom Endpoint**: For Ollama or self-hosted models
- **Test Connection**: Validate API key with current settings

### Creativity Settings Tab
- **Main Creativity Slider**: 0.1-2.0 with descriptive labels
- **Preset Buttons**: Conservative, Balanced, Creative, Experimental
- **Field-Specific Settings**: Different creativity for name, email, description fields
- **Preview**: Show example outputs at current creativity level
- **Reset to Defaults**: Quick reset button

### Cache Settings Tab
- **Cache Status**: Storage usage, hit rate, creativity distribution
- **Cache Expiration**: Slider for cache lifetime (1-30 days)
- **Clear Cache**: Options to clear by creativity level or field type
- **Auto-cleanup**: Toggle for automatic cache maintenance

### General Settings Tab
- **Field Detection**: Sensitivity slider for form field detection
- **UI Preferences**: Icon size, animation speed, theme
- **Keyboard Shortcuts**: Customizable hotkeys
- **Debug Mode**: Enable logging and creativity tracking

## Implementation Phases

### Phase 1: Project Setup (Days 1-2)
1. Initialize project with Bun
2. Set up Vite with SolidJS and Chrome extension plugin
3. Create basic Chrome extension manifest V3
4. Set up TypeScript configuration
5. Create initial project structure
6. Set up SQLite with sql.js
7. Create hostname validation (localhost-only)

**Deliverables:**
- Working development environment
- Basic extension that loads
- Hostname restriction working
- SQLite database initialized

### Phase 2: Settings Infrastructure (Days 3-4)
8. Build settings storage system with encryption
9. Create provider configuration types and interfaces
10. Implement creativity/temperature management system
11. Design and build settings panel UI components
12. Create API key validation system
13. Build settings persistence layer

**Deliverables:**
- Complete settings panel with all tabs
- Secure API key storage
- Provider configuration system
- Creativity controls working

### Phase 3: LLM Integration (Days 5-6)
14. Build abstract LLM provider base class
15. Implement OpenAI provider with creativity support
16. Implement Anthropic provider
17. Implement Google Gemini provider
18. Implement Ollama provider for local models
19. Create field analysis system
20. Build prompt builder with creativity context
21. Add connection testing functionality

**Deliverables:**
- All LLM providers working
- API key validation for each provider
- Creativity parameter properly integrated
- Field analysis logic completed

### Phase 4: Caching System (Days 7-8)
22. Design SQLite database schema
23. Implement cache manager with smart invalidation
24. Create suggestion storage system
25. Build cache statistics and management
26. Implement creativity-aware caching
27. Add cache cleanup and maintenance

**Deliverables:**
- SQLite caching fully functional
- Cache management UI working
- Smart cache invalidation
- Performance optimizations

### Phase 5: Form Detection & UI (Days 9-10)
28. Build form field detection system
29. Create overlay injection logic
30. Design and implement SolidJS UI components
31. Build generator icons and field buttons
32. Create suggestion panels
33. Implement regenerate functionality
34. Add visual creativity indicators

**Deliverables:**
- Form detection working on localhost
- UI overlay system functional
- Generator icons appearing on fields
- Suggestion system working

### Phase 6: Popup & Integration (Days 11-12)
35. Build popup with status indicators
36. Create quick settings in popup
37. Add cache statistics display
38. Integrate all systems together
39. Add keyboard shortcuts
40. Implement accessibility features

**Deliverables:**
- Complete popup interface
- All systems integrated
- Keyboard shortcuts working
- Accessibility compliance

### Phase 7: Polish & Testing (Days 13-14)
41. Add comprehensive error handling
42. Implement logging and debug mode
43. Create user documentation
44. Test across different providers
45. Test creativity levels thoroughly
46. Performance optimization
47. Security audit
48. Prepare for deployment

**Deliverables:**
- Fully tested extension
- Documentation complete
- Security verified
- Ready for distribution

## Technical Stack

### Core Technologies
- **Bun**: Package management and fast builds
- **Vite**: Development server and building
- **vite-plugin-solid**: SolidJS integration
- **@crxjs/vite-plugin**: Chrome extension development
- **SolidJS**: Reactive UI components
- **TypeScript**: Type safety and better DX

### Database & Storage
- **sql.js**: SQLite in browser for caching
- **Chrome Storage API**: Settings and API key storage
- **Custom encryption**: For sensitive data protection

### LLM Providers
- **OpenAI API**: GPT-3.5-turbo, GPT-4
- **Anthropic API**: Claude models
- **Google AI API**: Gemini models
- **Ollama**: Local model support

### UI & Styling
- **Tailwind CSS**: Utility-first styling (optional)
- **CSS Grid/Flexbox**: Layout
- **CSS Variables**: Theming support

## Security Considerations

### Data Protection
- API keys encrypted using Chrome's storage encryption
- No sensitive data logged or transmitted except to LLM APIs
- Local SQLite database with optional encryption
- HTTPS-only API communications

### Access Control
- Localhost-only restriction prevents accidental activation
- Minimal Chrome permissions requested
- No external script loading
- Content Security Policy compliant

### Privacy
- No user data collected or transmitted
- All processing done locally except LLM API calls
- Cache can be cleared at any time
- No tracking or analytics

## Performance Optimizations

### Caching Strategy
- Cache by field signature (type + label + context + creativity)
- Smart cache invalidation based on similarity
- Automatic cleanup of old entries
- Compression for large cached responses

### UI Performance
- Lazy loading of components
- Debounced field detection
- Virtual scrolling for large suggestion lists
- Minimal DOM manipulation

### Memory Management
- SQLite database size limits
- Automatic cache pruning
- Efficient data structures
- Memory leak prevention

## Development Workflow

### Initial Setup
```bash
cd /home/d2du/code/ug/fillo
bun init
bun add -d vite @crxjs/vite-plugin vite-plugin-solid typescript
bun add solid-js sql.js
```

### Development Commands
```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run test     # Run tests
bun run lint     # Lint code
bun run type     # Type checking
```

### Git Workflow
- Commit after each major feature
- Use conventional commit messages
- Create branches for major features
- Regular commits during development phases

## Testing Strategy

### Unit Tests
- LLM provider implementations
- Field detection logic
- Cache management
- Settings validation

### Integration Tests
- End-to-end form filling
- Provider switching
- Cache hit/miss scenarios
- Settings persistence

### Manual Testing
- Test on various localhost sites
- Test with different form types
- Verify creativity levels work
- Test all provider APIs

## Deployment

### Build Process
1. Run type checking
2. Build with Vite
3. Generate extension package
4. Verify manifest and permissions
5. Test in Chrome developer mode

### Distribution
- Chrome Web Store (future)
- Developer mode installation
- GitHub releases with packaged extension

## Troubleshooting Common Issues

### API Key Issues
- Verify API key format
- Check rate limits
- Validate provider endpoints
- Test connection in settings

### Caching Issues
- Clear cache from settings
- Check SQLite database
- Verify cache expiration
- Monitor cache hit rates

### UI Issues
- Check localhost restriction
- Verify form field detection
- Test overlay injection
- Debug SolidJS components

### Performance Issues
- Monitor memory usage
- Check cache size
- Profile LLM response times
- Optimize database queries

## Extension Permissions Required

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "http://localhost/*",
    "http://127.0.0.1/*",
    "https://localhost/*",
    "https://127.0.0.1/*"
  ]
}
```

## Future Enhancements

### Additional Features
- Custom field type detection
- Form submission preview
- Bulk field filling
- Export/import of generated data
- Integration with popular frameworks
- Custom prompt templates

### Additional Providers
- Cohere
- Hugging Face
- Azure OpenAI
- AWS Bedrock
- Custom API endpoints

### Advanced Caching
- Semantic similarity matching
- Cross-session learning
- Performance analytics
- Smart prefetching

This comprehensive plan provides everything needed to build a production-ready Chrome extension for intelligent form filling with LLM integration.