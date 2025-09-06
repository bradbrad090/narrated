// Voice interface types
import { ConversationContext } from '@/types/conversation';

export interface VoiceEvent {
  type: 'response.audio.delta' | 'response.audio.done' | 'session.created' | 'error' | string;
  delta?: string;
  message?: string;
  error?: { message: string };
}

export interface VoiceInterfaceProps {
  onSpeakingChange: (speaking: boolean) => void;
  context?: ConversationContext;
  conversationType?: string;
  userId: string;
  bookId: string;
  chapterId?: string;
  onConversationUpdate?: () => void;
}