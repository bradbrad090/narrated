# Narrated - System Architecture

## High-Level Architecture

<lov-mermaid>
graph TB
    subgraph "Frontend (React + TypeScript)"
        UI[User Interface]
        ConvInterface[ConversationInterface]
        VoiceInterface[VoiceInterface]
        Dashboard[Dashboard]
        Auth[Authentication]
    end

    subgraph "State Management"
        ConvState[useConversationState]
        ConvFlow[useConversationFlow]
        ConvSession[useConversationSession]
        ContextCache[ContextCacheService]
    end

    subgraph "Supabase Backend"
        DB[(PostgreSQL Database)]
        EdgeFunctions[Edge Functions]
        Storage[File Storage]
        AuthSvc[Auth Service]
    end

    subgraph "Edge Functions"
        AIRealtime[ai-conversation-realtime]
        OpenAIConv[openai-conversation]
        VoiceToText[voice-to-text]
        GenerateChapter[generate-chapter]
        ContextBuilder[conversation-context-builder]
    end

    subgraph "External APIs"
        OpenAI[OpenAI API]
        Stripe[Stripe API]
    end

    UI --> ConvInterface
    ConvInterface --> ConvState
    ConvState --> ConvFlow
    ConvFlow --> ConvSession
    ConvSession --> ContextCache

    ConvInterface --> EdgeFunctions
    VoiceInterface --> AIRealtime
    
    EdgeFunctions --> DB
    EdgeFunctions --> OpenAI
    EdgeFunctions --> Stripe
    
    AIRealtime --> OpenAI
    OpenAIConv --> OpenAI
    VoiceToText --> OpenAI
    GenerateChapter --> OpenAI
    ContextBuilder --> DB
</lov-mermaid>

## Data Flow Architecture

<lov-mermaid>
sequenceDiagram
    participant User
    participant ConvInterface
    participant ConvState
    participant EdgeFunction
    participant OpenAI
    participant Database

    User->>ConvInterface: Start conversation
    ConvInterface->>ConvState: initializeSession()
    ConvState->>Database: Fetch user profile
    Database-->>ConvState: Profile data
    ConvState->>EdgeFunction: ai-conversation-realtime
    EdgeFunction->>OpenAI: Initialize session
    OpenAI-->>EdgeFunction: Session created
    EdgeFunction-->>ConvState: Session ready

    User->>ConvInterface: Send message
    ConvInterface->>ConvState: sendMessage()
    ConvState->>EdgeFunction: continue_conversation
    EdgeFunction->>OpenAI: Chat completion
    OpenAI-->>EdgeFunction: AI response
    EdgeFunction->>Database: Save conversation
    EdgeFunction-->>ConvState: Response data
    ConvState-->>ConvInterface: Update UI
    ConvInterface-->>User: Display response
</lov-mermaid>

## Core Components

### Frontend Hooks

#### `useConversationState.ts`
**Purpose**: Central state management for all conversation functionality
**Key Functions**:
- `initializeSession()`: Creates new conversation sessions
- `sendMessage()`: Handles message sending with full conversation history
- `startSelfConversationMode()`: Initiates self-reflection conversations
- `updateContext()`: Manages conversation context and caching

**Data Flow**: 
- Receives user input → Updates local state → Calls edge functions → Processes AI responses → Updates UI

#### `useConversationFlow.ts`
**Purpose**: Orchestrates conversation progression and chapter generation
**Key Functions**:
- `processConversationForChapter()`: Converts conversations to chapter content
- `generateChapterFromConversation()`: Triggers chapter creation
- `handleConversationEnd()`: Manages conversation completion

#### `useConversationSession.ts`
**Purpose**: Manages individual conversation session lifecycle
**Key Functions**:
- Session initialization and cleanup
- WebSocket connection management for real-time features
- Session persistence and recovery

### Backend Edge Functions

#### `ai-conversation-realtime/index.ts`
**Purpose**: Main AI conversation orchestrator with WebSocket support
**Key Features**:
- Handles multiple conversation types (interview, self-reflection, text-assisted)
- Manages real-time audio streaming
- Implements conversation context building
- Processes function calls from AI

**API Endpoints**:
- `start_conversation`: Initialize new conversation session
- `continue_conversation`: Process ongoing conversation messages
- `end_conversation`: Complete and summarize conversation

#### `openai-conversation/index.ts`
**Purpose**: Direct OpenAI API integration for text-based conversations
**Key Features**:
- Text-only conversation processing
- Conversation history management
- Profile-based personalization
- Response optimization

#### `voice-to-text/index.ts`
**Purpose**: Speech-to-text processing using OpenAI Whisper
**Key Features**:
- Audio file processing
- Multiple audio format support
- Transcription accuracy optimization
- Error handling for audio quality issues

#### `generate-chapter/index.ts`
**Purpose**: Converts conversation data into formatted autobiography chapters
**Key Features**:
- Conversation analysis and summarization
- Chapter structure generation
- Writing style consistency
- Content quality optimization

#### `conversation-context-builder/index.ts`
**Purpose**: Builds comprehensive context for AI conversations
**Key Features**:
- User profile integration
- Previous conversation history
- Chapter content awareness
- Context caching for performance

### Database Schema

#### Core Tables Relationships

<lov-mermaid>
erDiagram
    users ||--o{ books : creates
    books ||--o{ chapters : contains
    books ||--o{ chat_histories : has
    books ||--|| book_profiles : profiles
    chat_histories ||--o{ conversation_questions : tracks
    chapters ||--o{ ai_chapter_metadata : metadata
    users ||--o{ orders : places

    users {
        uuid id PK
        text email
        text full_name
        boolean completed_signup
        timestamp created_at
    }

    books {
        uuid id PK
        uuid user_id FK
        text title
        text status
        jsonb usage_metrics
        text tier
    }

    chapters {
        uuid id PK
        uuid book_id FK
        uuid user_id FK
        integer chapter_number
        text title
        text content
        text summary
    }

    chat_histories {
        uuid id PK
        uuid user_id FK
        uuid chapter_id FK
        text session_id
        jsonb messages
        text conversation_type
        text conversation_medium
    }

    book_profiles {
        uuid id PK
        uuid book_id FK
        uuid user_id FK
        text full_name
        date birth_date
        text occupation
        text education
        text[] personality_traits
        text[] key_life_events
    }
</lov-mermaid>

## Security Architecture

### Row-Level Security (RLS)
All tables implement RLS policies ensuring users can only access their own data:
```sql
-- Example policy structure
CREATE POLICY "Users can manage their own books" 
ON books FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### API Security
- **Edge Functions**: Use Supabase service role for database access
- **API Keys**: Stored as Supabase secrets, never exposed to frontend
- **Authentication**: JWT-based auth with Supabase Auth
- **CORS**: Configured for specific origins in production

## Performance Optimizations

### Frontend
- **Context Caching**: `ContextCacheService` reduces redundant API calls
- **Request Deduplication**: `useRequestDeduplication` prevents duplicate requests
- **Virtual Scrolling**: Large conversation lists use `VirtualizedConversationList`
- **Lazy Loading**: Components and routes loaded on demand

### Backend
- **Database Indexing**: Optimized queries on user_id, book_id, session_id
- **Context Caching**: Conversation context cached for 1 hour
- **Connection Pooling**: Supabase handles database connection optimization
- **Function Warming**: Edge functions kept warm through strategic calls

## Error Handling Strategy

### Frontend Error Boundaries
- **ErrorBoundary**: Catches and displays component errors gracefully
- **Toast Notifications**: User-friendly error messages
- **Retry Logic**: Automatic retry for failed API calls
- **Fallback States**: Graceful degradation when features fail

### Backend Error Handling
- **Structured Logging**: Comprehensive error logging in edge functions
- **Circuit Breakers**: Prevent cascade failures
- **Timeout Management**: Proper timeout handling for external API calls
- **Graceful Degradation**: Fallback responses when AI services fail

## Monitoring and Observability

### Logging
- **Frontend**: Error tracking and user interaction logging
- **Backend**: Structured logging in all edge functions
- **Database**: Query performance monitoring
- **External APIs**: Request/response logging for debugging

### Metrics
- **Conversation Success Rate**: Track completed conversations
- **AI Response Quality**: Monitor response generation times
- **User Engagement**: Track session duration and completion rates
- **System Performance**: Monitor edge function execution times

## Scalability Considerations

### Horizontal Scaling
- **Supabase**: Auto-scaling database and edge functions
- **Stateless Design**: Edge functions designed for horizontal scaling
- **CDN Integration**: Static assets served via CDN
- **Caching Strategy**: Multi-layer caching reduces database load

### Vertical Scaling
- **Database**: Supabase Pro tier for increased capacity
- **Edge Functions**: Memory and timeout optimizations
- **API Rate Limits**: Intelligent rate limiting for external APIs
- **Resource Optimization**: Efficient memory usage in audio processing