// Types for question tracking and deduplication system

export interface ConversationQuestion {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id?: string;
  conversation_session_id?: string;
  conversation_type: 'interview' | 'reflection' | 'brainstorming';
  question_text: string;
  question_hash: string;
  semantic_keywords?: string[];
  response_quality?: number; // 1-5 rating
  asked_at: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionExtractionResult {
  questions: string[];
  primaryQuestion?: string; // The main question if multiple detected
}

export interface QuestionDuplicateCheck {
  isDuplicate: boolean;
  similarQuestions?: ConversationQuestion[];
  confidence?: number; // 0-1 confidence score
}

export interface QuestionAnalysis {
  text: string;
  hash: string;
  keywords: string[];
  type: 'direct' | 'implied' | 'followup';
  sentiment?: 'positive' | 'neutral' | 'probing';
}