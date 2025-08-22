# Narrated System State Documentation

## Database Schema (Implemented)

### Core Tables
- **users**: `id, email, full_name, age, completed_signup, created_at`
- **books**: `id, user_id, title, status, chapters, is_paid, trial_words_used, created_at`
- **chapters**: `id, book_id, user_id, chapter_number, title, content, created_at, updated_at`
- **book_profiles**: `id, book_id, user_id, full_name, birth_year, birthplace, current_location, occupation, education, family_background, cultural_background, languages_spoken, hobbies_interests, personality_traits, career_highlights, key_life_events, challenges_overcome, relationships_family, life_philosophy, values_beliefs, life_themes, memorable_quotes, writing_style_preference, created_at, updated_at`
- **chat_histories**: `id, user_id, session_id, messages, context_snapshot, conversation_goals, chapter_id, is_self_conversation, conversation_type, conversation_medium, created_at, updated_at`
- **conversation_context_cache**: `id, user_id, book_id, chapter_id, context_data, expires_at, created_at`
- **orders**: `id, user_id, book_id, status, total_price, quantity, pod_provider, created_at`

## Edge Functions (Implemented)

### Authentication
- **send-password-reset**: Sends password reset emails via Resend API, redirects to `/reset-password` page

### AI Services
- **voice-to-text**: Transcribes audio using OpenAI Whisper API
- **voice-to-autobiography**: Transcribes audio and converts to autobiographical format using GPT-4o
- **openai-conversation**: Handles conversation flow with context awareness
- **ai-conversation-realtime**: Real-time conversation sessions with start/send message actions
- **conversation-context-builder**: Builds conversation context from user/book/chapter data
- **generate-autobiography**: Generates autobiography content from conversations
- **profile-extractor**: Extracts profile information from conversation text
- **realtime-token**: Creates OpenAI real-time session tokens

## Authentication Flow
- Supabase Auth with email/password
- Auto-creates user profile on signup via `handle_new_user()` trigger
- Session persistence in localStorage
- Password reset via email with secure tokens

## Key Types

### Conversation System
- **ConversationType**: `'interview' | 'reflection' | 'brainstorming'`
- **ConversationMedium**: `'text' | 'voice' | 'self'`
- **ConversationMessage**: `{ role: 'user' | 'assistant', content: string, timestamp: Date }`
- **ConversationSession**: Full session with messages, context, metadata

### API Responses
- **ApiResponse<T>**: Standardized response format with success/error states
- **ConversationStartResponse**: `{ sessionId, response, goals, conversationType }`
- **ConversationMessageResponse**: `{ response, sessionId, messageCount, updated }`

## Core Functionality (Working)

### User Management
- Email signup/login
- Password reset flow
- User profile management

### Book Creation
- Create new book projects
- Chapter management (create, edit, reorder)
- Book profile setup with detailed user information

### Conversation System
- Text-based conversations with AI
- Voice recording and transcription
- Self-conversation mode (personal reflection)
- Context-aware questioning based on user profile
- Session management and persistence

### Content Generation
- Convert conversations to autobiography content
- Profile extraction from conversation text
- Multiple conversation types with different strategies

## Current Limitations
- No payment processing implemented
- No PDF generation for final books
- No photo integration
- No professional editing workflow
- No physical book printing integration

## Secrets Configuration
- OPENAI_API_KEY
- XAI_API_KEY
- RESEND_API_KEY
- SUPABASE_* keys

## Technology Stack
- Frontend: React + TypeScript + Tailwind CSS + Vite
- Backend: Supabase (PostgreSQL + Edge Functions)
- AI: OpenAI API (GPT models + Whisper)
- Email: Resend API
- Authentication: Supabase Auth