// Consolidated state management for conversations using reducer pattern

import { ConversationState, ConversationAction, UIState } from '@/types/conversation';

// Initial state
export const initialConversationState: ConversationState = {
  currentSession: null,
  history: [],
  context: null,
  ui: {
    isLoading: false,
    isTyping: false,
    isSpeaking: false,
    isConnecting: false,
    error: null
  },
  drafts: {}
};

// Initial UI state
export const initialUIState: UIState = {
  isLoading: false,
  isTyping: false,
  isSpeaking: false,
  isConnecting: false,
  error: null
};

// Reducer function
export function conversationReducer(
  state: ConversationState, 
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        ui: { ...state.ui, isLoading: action.payload }
      };

    case 'SET_TYPING':
      return {
        ...state,
        ui: { ...state.ui, isTyping: action.payload }
      };

    case 'SET_SPEAKING':
      return {
        ...state,
        ui: { ...state.ui, isSpeaking: action.payload }
      };

    case 'SET_CONNECTING':
      return {
        ...state,
        ui: { ...state.ui, isConnecting: action.payload }
      };

    case 'SET_ERROR':
      return {
        ...state,
        ui: { ...state.ui, error: action.payload }
      };

    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSession: action.payload
      };

    case 'SET_HISTORY':
      return {
        ...state,
        history: action.payload
      };

    case 'ADD_TO_HISTORY':
      return {
        ...state,
        history: [action.payload, ...state.history]
      };

    case 'UPDATE_SESSION':
      const updatedHistory = state.history.map(session =>
        session.sessionId === action.payload.sessionId ? action.payload : session
      );
      
      return {
        ...state,
        currentSession: state.currentSession?.sessionId === action.payload.sessionId 
          ? action.payload 
          : state.currentSession,
        history: updatedHistory
      };

    case 'SET_CONTEXT':
      return {
        ...state,
        context: action.payload
      };

    case 'SET_DRAFT':
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.payload.sessionId]: action.payload.draft
        }
      };

    case 'CLEAR_DRAFT':
      const { [action.payload]: removed, ...remainingDrafts } = state.drafts;
      return {
        ...state,
        drafts: remainingDrafts
      };

    case 'RESET_STATE':
      return initialConversationState;

    default:
      return state;
  }
}

// Action creators for better type safety
export const conversationActions = {
  setLoading: (loading: boolean): ConversationAction => ({
    type: 'SET_LOADING',
    payload: loading
  }),

  setTyping: (typing: boolean): ConversationAction => ({
    type: 'SET_TYPING', 
    payload: typing
  }),

  setSpeaking: (speaking: boolean): ConversationAction => ({
    type: 'SET_SPEAKING',
    payload: speaking  
  }),

  setConnecting: (connecting: boolean): ConversationAction => ({
    type: 'SET_CONNECTING',
    payload: connecting
  }),

  setError: (error: ConversationState['ui']['error']): ConversationAction => ({
    type: 'SET_ERROR',
    payload: error
  }),

  setCurrentSession: (session: ConversationState['currentSession']): ConversationAction => ({
    type: 'SET_CURRENT_SESSION',
    payload: session
  }),

  setHistory: (history: ConversationState['history']): ConversationAction => ({
    type: 'SET_HISTORY',
    payload: history
  }),

  addToHistory: (session: ConversationState['history'][0]): ConversationAction => ({
    type: 'ADD_TO_HISTORY',
    payload: session
  }),

  updateSession: (session: ConversationState['history'][0]): ConversationAction => ({
    type: 'UPDATE_SESSION', 
    payload: session
  }),

  setContext: (context: ConversationState['context']): ConversationAction => ({
    type: 'SET_CONTEXT',
    payload: context
  }),

  setDraft: (sessionId: string, draft: string): ConversationAction => ({
    type: 'SET_DRAFT',
    payload: { sessionId, draft }
  }),

  clearDraft: (sessionId: string): ConversationAction => ({
    type: 'CLEAR_DRAFT',
    payload: sessionId
  }),

  resetState: (): ConversationAction => ({
    type: 'RESET_STATE'
  })
};