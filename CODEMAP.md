# Narrated - Code Map for Review

## Critical Files Index

### 🔥 High Priority - Core Business Logic

#### `src/hooks/useConversationState.ts`
**What to check:**
- State consistency across conversation modes (interview, self-reflection, text-assisted)
- Error handling in `sendMessage()` function (lines 240-300)
- Race condition prevention in async operations
- Memory management for long conversation histories
- Proper cleanup in `useEffect` hooks

**Key concerns:**
- Complex state updates with multiple async operations
- WebSocket connection management
- Context caching implementation

#### `src/components/ConversationInterface.tsx`
**What to check:**
- Component lifecycle management
- Error boundary implementation
- Real-time state updates
- Audio interface integration
- User input validation

**Key concerns:**
- Performance with large conversation histories
- Memory leaks in event listeners
- Proper cleanup on unmount

#### `src/utils/RealtimeAudio.ts`
**What to check:**
- Audio encoding/decoding accuracy (PCM16 at 24kHz)
- Buffer management and memory leaks
- WebSocket connection stability
- Error recovery mechanisms
- Audio queue management

**Key concerns:**
- Audio quality degradation
- Memory accumulation in long sessions
- Browser compatibility issues

### 🛡️ Security Critical - Edge Functions

#### `supabase/functions/ai-conversation-realtime/index.ts`
**What to check:**
- API key exposure prevention
- Input validation and sanitization
- CORS configuration (lines 15-20)
- Error handling that doesn't leak sensitive info
- Rate limiting implementation

**Key concerns:**
- OpenAI API key security
- User data isolation
- Function timeout handling

#### `supabase/functions/openai-conversation/index.ts`
**What to check:**
- Secure API key usage
- Input sanitization
- Response filtering
- Error message sanitization
- Function authentication

**Key concerns:**
- Prompt injection vulnerabilities
- API response handling

#### `supabase/functions/voice-to-text/index.ts`
**What to check:**
- File upload security
- Audio format validation
- Memory management for large files
- Proper cleanup of temporary files
- Error handling

**Key concerns:**
- File size limits
- Malicious file upload prevention

### 📊 Database & State Management

#### `src/integrations/supabase/client.ts`
**What to check:**
- Client configuration
- Connection pooling
- Error handling
- Authentication setup

**Key concerns:**
- Connection stability
- Proper error propagation

#### `src/repositories/ConversationRepository.ts`
**What to check:**
- Query optimization
- Data validation
- Error handling
- Caching implementation
- RLS policy compliance

**Key concerns:**
- SQL injection prevention
- Data consistency
- Performance bottlenecks

#### `src/state/conversationReducer.ts`
**What to check:**
- State mutation patterns
- Action type safety
- Performance optimizations
- Memory management

**Key concerns:**
- Immutability violations
- State bloat

### 🎨 UI/UX Components

#### `src/pages/Dashboard.tsx`
**What to check:**
- Data fetching patterns
- Loading states
- Error handling
- Performance with large datasets
- Responsive design

**Key concerns:**
- Memory leaks in data fetching
- Poor user experience during loading

#### `src/components/VoiceInterface.tsx`
**What to check:**
- Audio permission handling
- Microphone access management
- Real-time audio processing
- Error recovery

**Key concerns:**
- Browser permission handling
- Audio feedback loops

#### `src/components/SavedConversations.tsx`
**What to check:**
- Virtual scrolling implementation
- Data pagination
- Search functionality
- Performance optimizations

**Key concerns:**
- Memory usage with large lists
- Search performance

### ⚡ Performance Critical

#### `src/hooks/usePerformanceOptimizations.ts`
**What to check:**
- Memoization strategies
- Effect dependencies
- Cleanup implementations
- Resource management

**Key concerns:**
- Over-optimization
- Dependency array issues

#### `src/components/VirtualizedConversationList.tsx`
**What to check:**
- Virtual scrolling implementation
- Item height calculations
- Scroll performance
- Memory management

**Key concerns:**
- Scroll jank
- Memory leaks

#### `src/services/ContextCacheService.ts`
**What to check:**
- Cache invalidation logic
- Memory management
- Cache hit/miss ratios
- Expiration handling

**Key concerns:**
- Cache memory bloat
- Stale data issues

### 🔧 Utility Functions

#### `src/hooks/useDebounce.ts`
**What to check:**
- Debounce implementation correctness
- Memory leak prevention
- Cleanup on unmount

#### `src/hooks/useRequestDeduplication.ts`
**What to check:**
- Request deduplication logic
- Memory management
- Error handling across duplicate requests

#### `src/lib/utils.ts`
**What to check:**
- Input validation functions
- Type safety
- Error handling
- Performance of utility functions

### 🗄️ Configuration Files

#### `tailwind.config.ts`
**What to check:**
- Design system consistency
- Performance optimizations
- Unused styles
- Theme configuration

#### `src/index.css`
**What to check:**
- Global styles impact
- CSS custom properties usage
- Performance implications
- Accessibility considerations

#### `vite.config.ts`
**What to check:**
- Build optimization
- Bundle analysis
- Development server configuration
- Plugin configuration

## Review Checklist by Category

### 🔒 Security Review
- [ ] No hardcoded API keys or secrets
- [ ] Proper input validation in all edge functions
- [ ] RLS policies correctly implemented
- [ ] CORS properly configured
- [ ] Authentication properly enforced
- [ ] No SQL injection vulnerabilities
- [ ] Proper error message sanitization

### 🚀 Performance Review
- [ ] Efficient database queries
- [ ] Proper React optimizations (useMemo, useCallback)
- [ ] Lazy loading implemented
- [ ] Bundle size optimization
- [ ] Memory leak prevention
- [ ] Proper cleanup in useEffect hooks
- [ ] Virtual scrolling for large lists

### 🛠️ Code Quality Review
- [ ] TypeScript types properly defined
- [ ] Error handling comprehensive
- [ ] Code follows consistent patterns
- [ ] Proper separation of concerns
- [ ] No circular dependencies
- [ ] Proper abstraction levels
- [ ] Documentation adequacy

### 🎯 Business Logic Review
- [ ] Conversation state management robust
- [ ] AI integration error handling
- [ ] Audio processing reliability
- [ ] Data persistence integrity
- [ ] User experience consistency
- [ ] Feature completeness

## Common Anti-Patterns to Look For

1. **Direct state mutation** in React components
2. **Missing dependency arrays** in useEffect hooks
3. **Memory leaks** in event listeners and timers
4. **Unhandled promise rejections** in async operations
5. **Inefficient re-renders** due to object recreation
6. **Prop drilling** instead of proper state management
7. **Missing error boundaries** around critical components
8. **Hardcoded values** that should be configurable
9. **Inconsistent error handling** patterns
10. **Poor TypeScript usage** (any types, missing interfaces)

## Architecture Red Flags

1. **Tight coupling** between unrelated components
2. **God components** doing too many things
3. **Circular dependencies** between modules
4. **Missing abstraction layers** for external APIs
5. **Inconsistent data flow** patterns
6. **Poor separation** of concerns
7. **Overly complex** state management
8. **Missing fallback mechanisms** for critical features
9. **Inadequate error recovery** strategies
10. **Poor scalability** considerations

## Performance Bottlenecks to Check

1. **Large bundle sizes** from unused imports
2. **Excessive API calls** due to poor caching
3. **Inefficient database queries** with N+1 problems
4. **Memory leaks** in long-running processes
5. **Blocking operations** on the main thread
6. **Poor virtualization** for large datasets
7. **Unnecessary re-renders** in React components
8. **Inefficient audio processing** algorithms
9. **Missing request deduplication**
10. **Poor error handling** causing retry storms