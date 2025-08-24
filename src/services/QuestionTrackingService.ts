// Service for tracking and managing conversation questions

import { supabase } from '@/integrations/supabase/client';
import { 
  ConversationQuestion, 
  QuestionExtractionResult, 
  QuestionDuplicateCheck,
  QuestionAnalysis 
} from '@/types/questionTracking';
import { ConversationType } from '@/types/conversation';

export class QuestionTrackingService {
  
  /**
   * Extract questions from AI response text using database function
   */
  async extractQuestionsFromText(responseText: string): Promise<QuestionExtractionResult> {
    try {
      const { data, error } = await supabase.rpc('extract_questions_from_text', {
        response_text: responseText
      });

      if (error) {
        console.error('Error extracting questions:', error);
        return { questions: [] };
      }

      const questions = data || [];
      
      return {
        questions,
        primaryQuestion: questions.length > 0 ? questions[0] : undefined
      };
    } catch (error) {
      console.error('Failed to extract questions:', error);
      return { questions: [] };
    }
  }

  /**
   * Check if a question is a duplicate using database function
   */
  async checkQuestionDuplicate(
    userId: string,
    bookId: string,
    conversationType: ConversationType,
    questionText: string
  ): Promise<QuestionDuplicateCheck> {
    try {
      const { data: isDuplicate, error } = await supabase.rpc('is_question_duplicate', {
        p_user_id: userId,
        p_book_id: bookId,
        p_conversation_type: conversationType,
        p_question_text: questionText
      });

      if (error) {
        console.error('Error checking duplicate:', error);
        return { isDuplicate: false };
      }

      // If it's a duplicate, fetch similar questions for context
      let similarQuestions: ConversationQuestion[] = [];
      if (isDuplicate) {
        similarQuestions = await this.getSimilarQuestions(userId, bookId, conversationType, questionText);
      }

      return {
        isDuplicate: isDuplicate || false,
        similarQuestions,
        confidence: isDuplicate ? 0.9 : 0.1
      };
    } catch (error) {
      console.error('Failed to check duplicate:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Analyze question text and extract metadata
   */
  async analyzeQuestion(questionText: string): Promise<QuestionAnalysis> {
    try {
      // Generate hash using database function
      const { data: hash, error: hashError } = await supabase.rpc('generate_question_hash', {
        question_text: questionText
      });

      // Extract keywords using database function  
      const { data: keywords, error: keywordsError } = await supabase.rpc('extract_question_keywords', {
        question_text: questionText
      });

      if (hashError || keywordsError) {
        console.error('Error analyzing question:', hashError || keywordsError);
      }

      // Determine question type based on patterns
      const type = this.determineQuestionType(questionText);
      const sentiment = this.determineSentiment(questionText);

      return {
        text: questionText,
        hash: hash || '',
        keywords: keywords || [],
        type,
        sentiment
      };
    } catch (error) {
      console.error('Failed to analyze question:', error);
      return {
        text: questionText,
        hash: '',
        keywords: [],
        type: 'direct'
      };
    }
  }

  /**
   * Save a question to the tracking database
   */
  async saveQuestion(
    userId: string,
    bookId: string,
    conversationType: ConversationType,
    questionText: string,
    sessionId?: string,
    chapterId?: string
  ): Promise<ConversationQuestion | null> {
    try {
      // Analyze the question first
      const analysis = await this.analyzeQuestion(questionText);

      const { data, error } = await supabase
        .from('conversation_questions')
        .insert({
          user_id: userId,
          book_id: bookId,
          chapter_id: chapterId,
          conversation_session_id: sessionId,
          conversation_type: conversationType,
          question_text: questionText,
          question_hash: analysis.hash,
          semantic_keywords: analysis.keywords
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving question:', error);
        return null;
      }

      return data as ConversationQuestion;
    } catch (error) {
      console.error('Failed to save question:', error);
      return null;
    }
  }

  /**
   * Get question history for a user/book/conversation type
   */
  async getQuestionHistory(
    userId: string,
    bookId: string,
    conversationType?: ConversationType,
    limit: number = 50
  ): Promise<ConversationQuestion[]> {
    try {
      let query = supabase
        .from('conversation_questions')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .order('asked_at', { ascending: false })
        .limit(limit);

      if (conversationType) {
        query = query.eq('conversation_type', conversationType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching question history:', error);
        return [];
      }

      return (data || []) as ConversationQuestion[];
    } catch (error) {
      console.error('Failed to fetch question history:', error);
      return [];
    }
  }

  /**
   * Rate the quality of a question's response
   */
  async rateQuestionResponse(questionId: string, rating: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversation_questions')
        .update({ response_quality: rating })
        .eq('id', questionId);

      if (error) {
        console.error('Error rating question:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to rate question:', error);
      return false;
    }
  }

  /**
   * Get statistics about question usage
   */
  async getQuestionStats(userId: string, bookId: string): Promise<{
    totalQuestions: number;
    uniqueQuestions: number;
    questionsByType: Record<ConversationType, number>;
    averageQuality: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('conversation_questions')
        .select('conversation_type, response_quality')
        .eq('user_id', userId)
        .eq('book_id', bookId);

      if (error || !data) {
        console.error('Error fetching stats:', error);
        return {
          totalQuestions: 0,
          uniqueQuestions: 0,
          questionsByType: { interview: 0, reflection: 0, brainstorming: 0 },
          averageQuality: 0
        };
      }

      const totalQuestions = data.length;
      const questionsByType = data.reduce((acc, q) => {
        acc[q.conversation_type as ConversationType] = (acc[q.conversation_type as ConversationType] || 0) + 1;
        return acc;
      }, {} as Record<ConversationType, number>);

      const qualityRatings = data.filter(q => q.response_quality !== null).map(q => q.response_quality);
      const averageQuality = qualityRatings.length > 0 
        ? qualityRatings.reduce((sum, rating) => sum + rating, 0) / qualityRatings.length 
        : 0;

      return {
        totalQuestions,
        uniqueQuestions: totalQuestions, // TODO: Implement proper unique counting
        questionsByType: {
          interview: questionsByType.interview || 0,
          reflection: questionsByType.reflection || 0,
          brainstorming: questionsByType.brainstorming || 0
        },
        averageQuality
      };
    } catch (error) {
      console.error('Failed to fetch question stats:', error);
      return {
        totalQuestions: 0,
        uniqueQuestions: 0,
        questionsByType: { interview: 0, reflection: 0, brainstorming: 0 },
        averageQuality: 0
      };
    }
  }

  // Private helper methods

  private async getSimilarQuestions(
    userId: string,
    bookId: string,
    conversationType: ConversationType,
    questionText: string,
    limit: number = 5
  ): Promise<ConversationQuestion[]> {
    try {
      // Get keywords from the question
      const { data: keywords } = await supabase.rpc('extract_question_keywords', {
        question_text: questionText
      });

      if (!keywords || keywords.length === 0) {
        return [];
      }

      // Find questions with overlapping keywords
      const { data, error } = await supabase
        .from('conversation_questions')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('conversation_type', conversationType)
        .overlaps('semantic_keywords', keywords)
        .order('asked_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching similar questions:', error);
        return [];
      }

      return (data || []) as ConversationQuestion[];
    } catch (error) {
      console.error('Failed to fetch similar questions:', error);
      return [];
    }
  }

  private determineQuestionType(questionText: string): 'direct' | 'implied' | 'followup' {
    const lowerText = questionText.toLowerCase();
    
    // Direct questions - explicit question words
    if (/^(what|when|where|who|why|how|can|could|would|do|does|did|is|are|was|were|will|have|has|had)/.test(lowerText)) {
      return 'direct';
    }
    
    // Follow-up questions - reference previous context
    if (/(tell me more|can you elaborate|what about|speaking of|regarding)/.test(lowerText)) {
      return 'followup';
    }
    
    // Implied questions - statements that expect responses
    return 'implied';
  }

  private determineSentiment(questionText: string): 'positive' | 'neutral' | 'probing' {
    const lowerText = questionText.toLowerCase();
    
    // Positive sentiment
    if (/(happy|joy|proud|success|achievement|love|wonderful|amazing|great)/.test(lowerText)) {
      return 'positive';
    }
    
    // Probing sentiment - deeper questions
    if (/(difficult|challenge|struggle|fear|regret|mistake|hard|tough)/.test(lowerText)) {
      return 'probing';
    }
    
    return 'neutral';
  }
}

// Singleton instance
export const questionTrackingService = new QuestionTrackingService();