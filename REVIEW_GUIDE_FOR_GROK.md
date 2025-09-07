# Independent Code Review Guide for Grok

## Project Overview
Narrated is a SaaS platform that helps users create personalized autobiographies through AI-powered conversations. The platform uses React/TypeScript frontend with Supabase backend and OpenAI integration for intelligent conversation generation.

## Review Goals

### Primary Objectives
1. **Code Quality Assessment**: Evaluate overall code structure, maintainability, and adherence to best practices
2. **Architecture Review**: Assess system design, component organization, and data flow patterns
3. **Security Analysis**: Identify potential vulnerabilities, especially around API integrations and user data handling
4. **Performance Optimization**: Spot bottlenecks, inefficient patterns, and scalability concerns
5. **Integration Stability**: Review OpenAI API usage, Supabase configuration, and edge function implementations

### Specific Focus Areas
- **Conversation State Management**: Complex state handling across multiple conversation modes
- **Real-time Audio Processing**: WebSocket connections and audio streaming implementation
- **Edge Function Security**: API key handling and data validation in Supabase functions
- **Database Design**: RLS policies, data relationships, and query optimization
- **User Experience**: Error handling, loading states, and responsive design

## Key System Components

### Frontend Architecture
- **Main App**: `src/App.tsx` - Root component with routing
- **Pages**: `src/pages/` - Individual route components
- **Components**: `src/components/` - Reusable UI components
- **Hooks**: `src/hooks/` - Custom React hooks for state and API management
- **State Management**: `src/state/` - Conversation reducer and state patterns

### Backend Integration
- **Supabase Client**: `src/integrations/supabase/client.ts`
- **Edge Functions**: `supabase/functions/` - Server-side API endpoints
- **Database Schema**: See Supabase tables section below

### Critical Files to Review

#### Core Business Logic
- `src/hooks/useConversationState.ts` - Central conversation management
- `src/hooks/useConversationFlow.ts` - Conversation flow orchestration
- `src/components/ConversationInterface.tsx` - Main conversation UI
- `src/utils/RealtimeAudio.ts` - Audio processing utilities

#### Backend Functions
- `supabase/functions/ai-conversation-realtime/index.ts` - Main AI conversation handler
- `supabase/functions/openai-conversation/index.ts` - OpenAI API integration
- `supabase/functions/voice-to-text/index.ts` - Speech-to-text processing
- `supabase/functions/generate-chapter/index.ts` - Content generation

#### Security & Auth
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/pages/Auth.tsx` - Authentication handling
- All edge functions (API key management)

## Database Schema Overview

### Core Tables
- **users**: User profiles and authentication data
- **books**: User's autobiography projects
- **chapters**: Individual book chapters
- **chat_histories**: Conversation records
- **book_profiles**: Detailed user profile data for personalization
- **conversation_questions**: Question tracking and deduplication
- **ai_chapter_metadata**: AI generation tracking

### Security Considerations
- All tables use Row-Level Security (RLS)
- User isolation through `auth.uid()` policies
- API keys stored as Supabase secrets

## Ready-to-Use Grok Prompt

```
You are an expert code reviewer conducting an independent analysis of a SaaS application codebase. This is "Narrated" - an AI-powered autobiography creation platform.

## Your Mission
Provide a comprehensive code review focusing on:
1. Code quality and maintainability
2. Architecture and design patterns
3. Security vulnerabilities
4. Performance optimization opportunities
5. Integration stability (OpenAI, Supabase)

## Context
- **Tech Stack**: React + TypeScript + Vite, Supabase (PostgreSQL + Edge Functions), OpenAI API
- **Core Feature**: AI-powered conversational interviews that generate autobiography chapters
- **Key Integrations**: Real-time audio processing, WebSocket connections, payment processing

## Review Focus Areas

### 1. Conversation State Management
Examine `src/hooks/useConversationState.ts` and related files:
- State consistency across different conversation modes
- Error handling and recovery
- Memory management for long conversations
- Race condition prevention

### 2. Real-time Audio Implementation
Review `src/utils/RealtimeAudio.ts` and voice components:
- WebSocket connection stability
- Audio encoding/decoding accuracy
- Buffer management and memory leaks
- Error recovery mechanisms

### 3. Backend Security
Analyze edge functions in `supabase/functions/`:
- API key exposure risks
- Input validation and sanitization
- Rate limiting implementation
- CORS configuration
- Database query injection prevention

### 4. Database Design
Evaluate schema and RLS policies:
- Data relationship integrity
- Query performance optimization
- RLS policy completeness
- Data isolation effectiveness

### 5. Frontend Architecture
Assess component organization and patterns:
- Component reusability and separation of concerns
- Hook dependencies and circular imports
- Error boundary coverage
- Performance optimization (memoization, lazy loading)

## Specific Questions to Answer
1. Are there any obvious security vulnerabilities?
2. What are the biggest performance bottlenecks?
3. How robust is the error handling?
4. Are the abstractions appropriate for the complexity?
5. What technical debt needs immediate attention?
6. How well does the code handle edge cases?
7. Are there any anti-patterns or code smells?

## Deliverables
Provide:
1. Executive summary of overall code quality
2. Critical issues requiring immediate attention
3. Performance optimization recommendations
4. Security concerns and mitigation strategies
5. Architecture improvement suggestions
6. Technical debt assessment with priority rankings

Be specific with file references and line numbers where possible. Focus on actionable feedback that improves system reliability, security, and maintainability.
```

## Expected Review Timeline
- **Initial Assessment**: 30-45 minutes for high-level overview
- **Deep Dive Analysis**: 1-2 hours for detailed component review
- **Security Audit**: 30 minutes focused on vulnerability assessment
- **Report Generation**: 30 minutes for structured feedback compilation

## Additional Context Files
- `deployment.md` - Deployment process and infrastructure
- `system-state.md` - Current system status and known issues
- `todo.md` - Planned improvements and feature roadmap
- `Instructions.md` - Development guidelines and conventions