# CLAUDE.md - Instructions for Implementation

## 🚨 CRITICAL SAFETY CONSTRAINTS

### Directory Restriction
- **NEVER** leave the `/home/d2du/code/ug/fillo` directory
- **NEVER** access files outside this directory
- **NEVER** run commands that could affect the broader system
- **ONLY** work within this project directory
- If you need to install global tools, ASK THE USER FIRST

### Git Commit Guidelines
- **COMMIT REGULARLY** - After each major feature or at least daily
- Use conventional commit messages (feat:, fix:, docs:, etc.)
- Commit before making risky changes
- Never commit sensitive data (API keys, secrets)

## 🎯 Project Overview

You are implementing **Fillo**, a Chrome extension that:
- Detects form fields on localhost development sites ONLY
- Uses multiple LLM providers (OpenAI, Anthropic, Google, Ollama) to generate meaningful content
- Features intelligent SQLite caching to reduce API calls
- Provides a user-friendly "Creativity" slider (temperature control)
- Has a comprehensive settings panel for API key management

## 📋 Implementation Checklist

### Phase 1: Project Setup ✅
- [ ] Initialize Bun project with `bun init`
- [ ] Install dependencies: Vite, SolidJS, Chrome extension plugins
- [ ] Set up TypeScript configuration
- [ ] Create Chrome extension manifest V3
- [ ] Set up basic project structure
- [ ] **COMMIT: "feat: initial project setup with Bun and Vite"**

### Phase 2: Core Infrastructure ✅
- [ ] Set up SQLite with sql.js for caching
- [ ] Create hostname validation (localhost-only)
- [ ] Build settings storage with encryption
- [ ] Create provider configuration system
- [ ] **COMMIT: "feat: add SQLite caching and hostname validation"**

### Phase 3: Settings Panel ✅
- [ ] Build comprehensive settings UI with SolidJS
- [ ] Create Creativity slider (0.1-2.0 temperature)
- [ ] Implement API key management with validation
- [ ] Add provider selection and model configuration
- [ ] **COMMIT: "feat: complete settings panel with creativity controls"**

### Phase 4: LLM Integration ✅
- [ ] Create abstract LLM provider base class
- [ ] Implement OpenAI provider
- [ ] Implement Anthropic provider  
- [ ] Implement Google Gemini provider
- [ ] Implement Ollama provider
- [ ] Add connection testing for all providers
- [ ] Enhance LLM prompts with page context (title, meta tags, parent elements)
- [ ] **COMMIT: "feat: implement all LLM providers with creativity support and enhanced context"**

### Phase 5: Form Detection & UI ✅
- [ ] Build form field detection system
- [ ] Create overlay injection for form fields
- [ ] Build SolidJS UI components for overlay
- [ ] Add generator icons next to fields
- [ ] Implement suggestion panels
- [ ] **COMMIT: "feat: add form detection and overlay UI"**

### Phase 6: Integration & Polish ✅
- [ ] Build popup with quick settings
- [ ] Integrate caching with LLM responses
- [ ] Add regenerate functionality
- [ ] Implement keyboard shortcuts
- [ ] Add error handling and logging
- [ ] **COMMIT: "feat: complete integration and polish features"**

## 🛠 Technical Implementation Notes

### Key Dependencies to Install
```bash
# Core dependencies
bun add solid-js
bun add sql.js
bun add @types/chrome

# Development dependencies  
bun add -d vite
bun add -d vite-plugin-solid
bun add -d @crxjs/vite-plugin
bun add -d typescript
bun add -d @types/sql.js
```

### Chrome Extension Manifest V3 Structure
```json
{
  "manifest_version": 3,
  "name": "Fillo - Intelligent Form Filler",
  "version": "1.0.0",
  "description": "AI-powered form filling for localhost development",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "http://localhost/*",
    "http://127.0.0.1/*", 
    "https://localhost/*",
    "https://127.0.0.1/*"
  ],
  "background": {
    "service_worker": "src/background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["http://localhost/*", "https://localhost/*"],
      "js": ["src/content/content.js"]
    }
  ],
  "action": {
    "default_popup": "src/popup/popup.html"
  },
  "options_page": "src/options/options.html"
}
```

### Vite Configuration Template
```typescript
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    solidPlugin(),
    crx({ manifest })
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html',
        options: 'src/options/options.html'
      }
    }
  }
})
```

### SQLite Setup Pattern
```typescript
import initSqlJs from 'sql.js'

// Initialize SQLite
const SQL = await initSqlJs({
  locateFile: file => `/sql-wasm.wasm`
})

// Create database with tables for caching
const db = new SQL.Database()
db.run(`
  CREATE TABLE IF NOT EXISTS field_cache (
    id INTEGER PRIMARY KEY,
    field_signature TEXT UNIQUE,
    field_type TEXT,
    creativity_level REAL,
    generated_content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
  )
`)
```

### Creativity Levels Mapping
```typescript
const creativityLevels = {
  0.1: 'Very Predictable',
  0.3: 'Predictable', 
  0.5: 'Balanced',
  0.7: 'Balanced',
  0.9: 'Creative',
  1.1: 'Very Creative',
  1.5: 'Experimental',
  2.0: 'Highly Experimental'
}
```

## 🔐 Security Requirements

### API Key Storage
- Use Chrome's storage.local with encryption
- Never log API keys
- Validate keys before storage
- Clear keys on uninstall

### Localhost Restriction
```typescript
function isLocalhost(url: string): boolean {
  const hostname = new URL(url).hostname
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' ||
         hostname.endsWith('.localhost')
}
```

### Content Security Policy
- No inline scripts
- No eval() usage
- HTTPS-only API calls
- Minimal permissions

## 🎨 UI/UX Guidelines

### Creativity Slider Design
- Use descriptive labels instead of numbers
- Color-code creativity levels (blue=predictable, green=balanced, orange=creative)
- Show real-time preview of creativity level
- Provide preset buttons for common levels

### Form Field Detection
- Only show generator icons on hover
- Use subtle, non-intrusive design
- Provide clear visual feedback
- Show previous suggestions when available

### Settings Panel Tabs
1. **Providers**: API keys, model selection, connection testing
2. **Creativity**: Main slider, presets, field-specific settings  
3. **Cache**: Statistics, management, cleanup options
4. **General**: UI preferences, shortcuts, debug mode

## 🚀 Development Workflow

### Daily Development Process
1. Pull latest changes (if any)
2. Run `bun run dev` for development server
3. Load extension in Chrome developer mode
4. Test changes on localhost sites
5. Make incremental commits throughout the day
6. End with comprehensive commit message

### Testing Checklist
- [ ] Extension loads without errors
- [ ] Hostname restriction works (only activates on localhost)
- [ ] Settings panel opens and saves correctly
- [ ] API key validation works for all providers
- [ ] Creativity slider affects LLM outputs
- [ ] Form fields are detected properly
- [ ] Caching reduces API calls
- [ ] Generated content is contextually appropriate

### Build Commands
```bash
bun run dev          # Development with hot reload
bun run build        # Production build
bun run type-check   # TypeScript validation
bun run preview      # Preview built extension
```

## 🐛 Common Issues & Solutions

### Extension Won't Load
- Check manifest.json syntax
- Verify all required files exist
- Check Chrome developer console for errors
- Ensure permissions are correct

### API Calls Failing
- Verify API keys are valid
- Check rate limits
- Ensure CORS is handled properly
- Test connection in settings panel

### Caching Not Working
- Check SQLite database initialization
- Verify cache key generation
- Test cache hit/miss logic
- Monitor cache statistics

### UI Components Not Rendering
- Check SolidJS syntax
- Verify component imports
- Test outside extension context first
- Check for CSP violations

## 📊 Performance Targets

### Response Times
- Form field detection: < 100ms
- Cache lookup: < 10ms
- LLM API call: < 3s
- UI rendering: < 50ms

### Memory Usage
- SQLite database: < 50MB
- Extension memory: < 100MB
- Cache entries: Limit to 10,000

### API Efficiency
- Cache hit rate: > 70%
- Reduce duplicate calls by 90%
- Smart cache invalidation

## 📝 Commit Message Guidelines

Use conventional commits:
- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation update`
- `style: formatting changes`
- `refactor: code refactoring`
- `test: add tests`
- `chore: maintenance tasks`

Examples:
- `feat: implement OpenAI provider with creativity support`
- `fix: resolve form detection on complex layouts`
- `docs: add API key setup instructions`
- `refactor: optimize SQLite caching performance`

## 🎯 Success Criteria

### Functional Requirements
- ✅ Works only on localhost domains
- ✅ Supports 4+ LLM providers
- ✅ Creativity slider affects output quality
- ✅ Caches responses to reduce API calls
- ✅ Secure API key management
- ✅ Intuitive settings panel

### Quality Requirements
- ✅ No security vulnerabilities
- ✅ Responsive UI on all screen sizes
- ✅ Comprehensive error handling
- ✅ Performance within targets
- ✅ Accessible design
- ✅ Clean, maintainable code

## 🚨 Red Flags - Stop and Ask

If you encounter any of these, STOP and ask the user:
- Need to install global packages
- Want to access files outside project directory
- Security concerns with API integrations
- Major architectural decisions
- Need to modify Chrome extension permissions
- Performance issues that require significant changes

## 🎉 Final Deliverables

When complete, ensure:
1. **Working extension** that can be loaded in Chrome
2. **Complete settings panel** with all features
3. **All LLM providers** implemented and tested
4. **SQLite caching** working efficiently
5. **Comprehensive documentation** (README.md)
6. **Clean git history** with meaningful commits
7. **Security audit** passed
8. **Performance targets** met

Remember: Focus on creating a polished, secure, and user-friendly extension that developers will love using on their localhost development sites!