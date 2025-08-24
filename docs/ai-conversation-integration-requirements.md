# AI Conversation Integration Requirements

## Current Infrastructure Assessment

### Existing Components
- **WriteBook Component**: Main interface with chapter management, AI content generation
- **VoiceRecorder Component**: Audio transcription via `voice-to-text` edge function  
- **Edge Functions**: `generate-chapter`, `openai-conversation`, `voice-to-text`
- **Database Tables**: `users`, `books`, `chapters`, `book_profiles`, `chat_histories`

### API Constraints
- **OpenAI/xAI Rate Limits**: Document specific limits per model/tier
- **Retry Logic**: Exponential backoff with jitter, max 3 retries
- **Frontend Build Tools**: Vite with React, TypeScript, Tailwind CSS
- **State Management**: React hooks, Supabase client state
- **Authentication**: Supabase Auth with token refresh, session persistence in localStorage

### Available Context Data
- **User Profile**: Name, age, location, occupation, cultural background
- **Book Profile**: Life themes, writing style, memorable quotes, key events
- **Chapter Data**: Existing content, chapter themes, progress status
- **Chat History**: Previous conversation turns, generated content

## Missing Infrastructure Requirements

### Backend Infrastructure

#### Real-time Conversation Engine
- **WebSocket Edge Function**: `ai-conversation-realtime`
  - Handle persistent connections for multi-turn conversations
  - Stream responses in real-time chunks
  - Maintain conversation state per session
- **Scalability**: Support 100+ concurrent users, connection pooling
- **Error Handling**: Fallback for missing data, generic prompts when context unavailable
- **Rate Limiting**: Per-user conversation limits, queue management

#### Context Aggregation Service
- **Edge Function**: `conversation-context-builder`
  - Aggregate user/book/chapter data into conversation context
  - Generate contextual conversation starters
  - Cache frequently accessed data
- **Caching**: Redis/Supabase table for context data (1-hour TTL)
- **Error Responses**: Define fallbacks for missing profile/chapter data

#### Conversation State Management
- **Session Storage**: Store active conversation state in `chat_histories`
- **Conversation Persistence**: Save/resume conversations across sessions  
- **Retention**: 90-day cleanup policy, export conversations as JSON
- **State Sync**: Real-time sync across multiple browser tabs

### Frontend Infrastructure

#### Conversation Interface Component
- **Real-time Chat**: WebSocket connection, message streaming
- **Voice Integration**: Record/transcribe user responses
- **WCAG 2.1 Compliance**: Screen reader support, keyboard navigation
- **Responsive Design**: 320px-1920px viewport support
- **Offline Drafts**: IndexedDB storage for conversation drafts

#### Context Panel Component  
- **Profile Display**: Show relevant user/book context during conversation
- **Dynamic Updates**: Real-time context refresh as conversation evolves
- **Collapsible Mobile Layout**: Overlay/drawer for mobile screens
- **Context Controls**: Allow users to edit/update context mid-conversation

#### Conversation Management
- **Session List**: View/resume previous conversations
- **Export Options**: Download conversations as PDF/text
- **Conversation Analytics**: Track engagement, completion rates

## API Integration Requirements

### Primary API Calls

#### 1. Start Conversation Session
- **Endpoint**: `POST /functions/v1/ai-conversation-realtime`
- **Purpose**: Initialize conversation with full context
- **Response Schema**: 
  ```json
  {
    "sessionId": "string",
    "response": "string", 
    "questions": ["string"],
    "context": "object"
  }
  ```
- **Validation**: Enforce non-empty userId, bookId; return 400 for missing fields
- **Resilience**: 30s timeout, exponential backoff

#### 2. Context Builder API
- **Endpoint**: `POST /functions/v1/conversation-context-builder`
- **Purpose**: Aggregate and format conversation context
- **Response Schema**:
  ```json
  {
    "context": "string",
    "seeds": ["string"],
    "errors": ["string"]
  }
  ```
- **Validation**: Handle missing profile/chapter data gracefully
- **Resilience**: Retry on transient failures, fallback to generic context

#### 3. Enhanced Message API
- **Endpoint**: WebSocket `/functions/v1/ai-conversation-realtime`
- **Purpose**: Send/receive conversation messages with context awareness
- **Features**: Real-time streaming, context updates, conversation branching

## Data Flow Requirements

### Context Assembly Process
1. **Profile Context**: User demographics, preferences, writing style
2. **Chapter Context**: Current chapter content, themes, related chapters
3. **Conversation History**: Previous turns, established topics
4. **Priority**: Recent chapters first, limit total context to 10,000 characters
5. **Relevance Scoring**: Weight context by recency and topical relevance

### Dynamic Question Generation
1. **Context Analysis**: Identify gaps in user's story
2. **Question Types**: Open-ended, follow-up, clarifying, emotional
3. **Personalization**: Adapt questions to user's communication style
4. **Progressive Depth**: Start broad, drill down based on responses

### Content Integration Workflow
1. **Response Processing**: Extract key narrative elements from conversation
2. **Content Suggestion**: Generate chapter content based on discussion
3. **User Review**: Allow editing before integration
4. **Chapter Update**: Merge approved content into current chapter

## Conversation Features Specification

### Context-Aware Capabilities
- **Profile Integration**: Reference user's background, experiences naturally
- **Chapter Awareness**: Connect current discussion to existing content
- **Multilingual Support**: Via AI API language detection/translation features
- **Memory Persistence**: Remember details across conversation sessions

### Adaptive Conversation Flow
- **Response Analysis**: Detect when user gives shallow responses (<10 words)
- **Fallback Prompts**: Simpler, more direct questions for brief responses  
- **Engagement Monitoring**: Adjust conversation style based on user participation
- **Natural Transitions**: Smoothly move between topics and chapters

### Conversation Types
1. **Interview Mode**: Structured Q&A about specific life periods
2. **Reflection Mode**: Deeper exploration of emotions, meanings
3. **Brainstorming Mode**: Generate ideas for chapter content/themes

## Technical Implementation Priorities

### Phase 1: Foundation (Weeks 1-2)
- Create conversation database schema
- Build basic conversation interface component  
- Implement context aggregation service
- **Testing**: Unit tests with Deno.test for edge functions
- **Monitoring**: Basic Supabase logging setup

### Phase 2: Real-time Integration (Weeks 3-4)
- Develop WebSocket conversation engine
- Add voice recording integration
- Implement conversation state management
- **Testing**: Integration tests for API endpoints
- **Monitoring**: Engagement metrics (turns/session, completion rates)

### Phase 3: Advanced Features (Weeks 5-6) 
- Build context panel and management UI
- Add conversation analytics and export
- Implement adaptive conversation flow
- **Testing**: End-to-end tests with real user scenarios
- **Monitoring**: Performance metrics, error tracking, user satisfaction

### Quality Assurance
- **Unit Tests**: All edge functions, utility functions
- **Integration Tests**: API endpoints, database operations
- **End-to-End Tests**: Complete conversation flows
- **Performance Tests**: Concurrent user load, response times
- **Accessibility Tests**: WCAG 2.1 compliance verification

### Monitoring & Analytics
- **Supabase Logs**: Function execution, errors, performance
- **Engagement Metrics**: Sessions per user, message count, completion rates
- **Context Quality**: Track context relevance scores, user satisfaction
- **Performance Monitoring**: Response times, concurrent connections, error rates