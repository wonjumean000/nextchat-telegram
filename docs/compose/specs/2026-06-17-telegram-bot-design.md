# [S1] Problem

NextChat is a web-based AI chat client. Users want to access AI chat through Telegram, which is more convenient for mobile use and provides a familiar interface. Additionally, Vercel deployment requires authentication to control access.

## [S2] Solution Overview

Implement a Telegram bot that:
1. Connects to existing NextChat API infrastructure
2. Supports all AI providers (OpenAI, Anthropic, Google, etc.)
3. Provides command-based interface (/start, /help, /model, /clear)
4. Handles file uploads (images for Vision models)
5. Includes web search integration for real-time information
6. Supports translation commands

For Vercel deployment:
1. Add NextAuth.js for authentication
2. Protect API routes with session validation
3. Provide login/logout UI

## [S3] Telegram Bot Architecture

### Components
- **Bot Core**: `app/bot/telegram/index.ts` - Main bot entry point
- **Command Handlers**: `app/bot/commands/` - Individual command implementations
- **Message Handler**: `app/bot/handlers/message.ts` - Process user messages
- **File Handler**: `app/bot/handlers/file.ts` - Handle image/document uploads
- **Session Manager**: `app/bot/session.ts` - Per-user session state

### Data Flow
1. User sends message to Telegram bot
2. Bot receives webhook/polling update
3. Session manager retrieves user context (model, history)
4. Message is forwarded to NextChat API
5. Response is streamed back to Telegram

### API Integration
- Reuse existing `ClientApi` class from `app/client/api.ts`
- Leverage provider-specific implementations
- Maintain conversation history per user

## [S4] Web Search Integration

### Architecture
- **Search Handler**: `app/bot/handlers/search.ts`
- **Search Providers**: Google, Bing, DuckDuckGo APIs
- **Context Builder**: Combine search results with user query

### Flow
1. User sends `/search <query>`
2. Bot fetches search results from configured provider
3. Results are summarized and sent to AI with context
4. AI responds with search-aware answer

## [S5] Translation Bot

### Architecture
- **Translation Handler**: `app/bot/handlers/translate.ts`
- **Language Detection**: Auto-detect source language
- **Translation API**: Use AI for translation (no separate API needed)

### Commands
- `/translate <lang> <text>` - Translate to target language
- Reply to message with `/translate <lang>` - Translate replied message

## [S6] Authentication for Vercel

### Architecture
- **Auth Provider**: NextAuth.js with credentials provider
- **Session Strategy**: JWT (stateless, works on Vercel)
- **Protected Routes**: All `/api/*` routes require session
- **Login Page**: `/auth/login` with email/password

### Database
- Use Vercel Postgres or SQLite for user storage
- Store: email, hashed password, user settings

## [S7] File Processing

### Supported Types
- **Images**: jpg, png, gif, webp → Vision model analysis
- **Documents**: txt, pdf, docx → Text extraction + AI analysis

### Flow
1. User uploads file to Telegram
2. Bot downloads file temporarily
3. For images: send to Vision model
4. For documents: extract text, send to AI
5. Return analysis result

## [S8] Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_URL=
TELEGRAM_ALLOWED_USERS=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
DATABASE_URL=

# Web Search
SEARCH_PROVIDER=google
GOOGLE_SEARCH_API_KEY=
BING_SEARCH_API_KEY=
```

## [S9] Testing Strategy

- Unit tests for command handlers
- Integration tests for API calls
- E2E tests with Telegram test bot
- Load testing for concurrent users
