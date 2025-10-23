# Narrated System State Documentation

## Database Schema (Implemented)

### Core Tables
- **users**: `id, email, full_name, created_at`
- **books**: `id, user_id, title, status, tier, purchase_status, stripe_purchase_id, usage_metrics, created_at`
- **chapters**: `id, book_id, user_id, chapter_number, title, content, summary, status, is_submitted, pdf_url, created_at, updated_at`
- **book_profiles**: `id, book_id, user_id, question_1_answer...question_10_answer, created_at, updated_at`
- **chat_histories**: `id, user_id, chapter_id, session_id, messages, context_snapshot, conversation_type, conversation_medium, created_at, updated_at`
- **conversation_context_cache**: `id, user_id, book_id, chapter_id, context_data, expires_at, created_at`
- **conversation_questions**: `id, user_id, book_id, chapter_id, conversation_session_id, conversation_type, question_text, question_hash, semantic_keywords, response_quality, asked_at, created_at, updated_at`
- **orders**: `id, user_id, book_id, status, total_price, quantity, pod_provider, is_gift_redemption, gift_code_id, created_at`
- **gift_codes**: `id, code, tier, recipient_email, purchaser_email, purchaser_name, gift_message, amount_paid, stripe_payment_status, stripe_session_id, stripe_payment_intent_id, redeemed, redeemed_by, redeemed_at, expires_at, is_test_code, order_id, created_at, updated_at`
- **chapter_photos**: `id, chapter_id, book_id, user_id, storage_path, file_name, file_size, created_at, updated_at`
- **ai_chapter_metadata**: `id, chapter_id, user_id, book_id, conversation_id, profile_id, model_used, prompt_version, source_data, generated_at, created_at, updated_at`
- **profile_question_responses**: `id, user_id, book_id, question_index, question_text, answer_text, created_at, updated_at`
- **chapter_email_logs**: `id, chapter_id, user_id, email_type, email_status, error_message, sent_at, created_at`
- **pdf_jobs**: `id, chapter_id, user_id, status, pdf_url, error_message, processed_at, created_at, updated_at`
- **analytics_sessions**: `id, session_id, user_id, referrer, first_seen_at, last_seen_at, signed_up, created_book, started_profile, started_conversation`
- **analytics_page_views**: `id, session_id, page_path, viewed_at`

## Edge Functions (Implemented)

### Authentication
- **send-password-reset**: Sends password reset emails via Resend API, redirects to `/reset-password` page

### AI Services
- **voice-to-text**: Transcribes audio using OpenAI Whisper API
- **voice-to-autobiography**: Transcribes audio and converts to autobiographical format using GPT-4o
- **openai-conversation**: Handles conversation flow with context awareness
- **ai-conversation-realtime**: Real-time conversation sessions with start/send message actions
- **conversation-context-builder**: Builds conversation context from user/book/chapter data
- **generate-chapter**: Generates chapter content from conversations
- **profile-extractor**: Extracts profile information from conversation text
- **realtime-token**: Creates OpenAI real-time session tokens

### Payment Services
- **create-payment**: Creates Stripe checkout sessions for book upgrades
- **verify-payment**: Verifies payment status and updates book tier
- **create-gift-payment**: Creates Stripe checkout for gift purchases
- **redeem-gift-code**: Validates and redeems gift codes (supports test codes)
- **stripe-webhook**: Handles Stripe webhook events

### Email Services
- **send-chapter-email**: Sends various email notifications via Resend

### Analytics Services
- **analytics-tracker**: Tracks user engagement and page views

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

### Payment System
- Stripe integration for book upgrades
- Multiple tier support (free, paid, premium)
- Secure payment processing with session verification
- Payment status tracking and validation

### State Management
- Centralized conversation state using reducer pattern
- UI state management for loading, typing, speaking states
- Draft management for conversation inputs
- Session persistence and restoration

## Current Limitations
- No PDF generation for final books
- No photo integration
- No professional editing workflow
- No physical book printing integration

## Secrets Configuration
- OPENAI_API_KEY
- XAI_API_KEY
- RESEND_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_SECRET_ACCESS_KEY
- SUPABASE_* keys

## Technology Stack
- Frontend: React + TypeScript + Tailwind CSS + Vite
- Backend: Supabase (PostgreSQL + Edge Functions)
- AI: OpenAI API (GPT models + Whisper)
- Payments: Stripe checkout and verification
- Email: Resend API
- Authentication: Supabase Auth

## Implemented Pages
- **Index**: Landing page with hero, benefits, and pricing
- **Dashboard**: User dashboard with book management
- **WriteBook**: Main writing interface with conversation modes
- **Auth**: Authentication (login/signup)
- **PaymentFlow**: Upgrade flow for book tiers
- **PaymentSuccess**: Payment confirmation and verification
- **Contact**: Contact form
- **FAQ**: Frequently asked questions
- **Pricing**: Pricing plans and features
- **WhatWeDo**: Service description