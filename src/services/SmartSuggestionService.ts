// Smart suggestion service for conversation enhancement
import { ConversationMessage } from '@/types/conversation';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';

export interface SmartSuggestion {
  type: 'continue' | 'deepen' | 'clarify' | 'connect';
  text: string;
  priority: number; // 1-5, higher is more important
  category: keyof typeof CONVERSATION_CONFIG.CONTINUATION_PROMPTS;
}

export class SmartSuggestionService {
  private readonly MAX_SUGGESTIONS = 3;
  
  generateSuggestions(messages: ConversationMessage[]): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const lastUserMessage = this.getLastUserMessage(messages);
    const messageCount = messages.filter(m => m.role === 'user').length;
    
    if (!lastUserMessage) return suggestions;
    
    // Analyze message patterns and generate contextual suggestions
    const analysisResult = this.analyzeMessageContent(lastUserMessage.content, messageCount);
    
    // Generate suggestions based on analysis
    if (analysisResult.needsMoreDetail) {
      suggestions.push(this.createSuggestion('deepen', 'SENSORY_DETAILS', 4));
    }
    
    if (analysisResult.mentionsPeople) {
      suggestions.push(this.createSuggestion('connect', 'RELATIONSHIP_FOCUS', 3));
    }
    
    if (analysisResult.isEmotional) {
      suggestions.push(this.createSuggestion('deepen', 'EMOTIONAL_DEPTH', 5));
    }
    
    if (analysisResult.hasTimeGaps) {
      suggestions.push(this.createSuggestion('clarify', 'STORY_GAPS', 4));
    }
    
    // Always suggest continuation if conversation is getting long
    if (messageCount > 3) {
      suggestions.push(this.createSuggestion('continue', 'STORY_GAPS', 2));
    }
    
    // Sort by priority and return top suggestions
    return suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.MAX_SUGGESTIONS);
  }
  
  private getLastUserMessage(messages: ConversationMessage[]): ConversationMessage | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i];
      }
    }
    return null;
  }
  
  private analyzeMessageContent(content: string, messageCount: number) {
    const lowercaseContent = content.toLowerCase();
    const wordCount = content.split(/\s+/).length;
    
    return {
      needsMoreDetail: wordCount < 20 || this.hasVagueLanguage(lowercaseContent),
      mentionsPeople: this.mentionsPeople(lowercaseContent),
      isEmotional: this.containsEmotionalWords(lowercaseContent),
      hasTimeGaps: this.hasTimeIndicators(lowercaseContent),
      isShort: wordCount < 15,
      isLong: wordCount > 100,
      messageCount
    };
  }
  
  private hasVagueLanguage(content: string): boolean {
    const vagueWords = ['maybe', 'sort of', 'kind of', 'i guess', 'i think', 'probably'];
    return vagueWords.some(word => content.includes(word));
  }
  
  private mentionsPeople(content: string): boolean {
    const peopleWords = ['he', 'she', 'they', 'friend', 'family', 'mother', 'father', 'brother', 'sister', 'colleague', 'boss'];
    return peopleWords.some(word => content.includes(word));
  }
  
  private containsEmotionalWords(content: string): boolean {
    const emotionalWords = ['felt', 'feel', 'emotional', 'sad', 'happy', 'angry', 'excited', 'nervous', 'worried', 'loved', 'hurt', 'proud'];
    return emotionalWords.some(word => content.includes(word));
  }
  
  private hasTimeIndicators(content: string): boolean {
    const timeWords = ['then', 'next', 'after', 'before', 'later', 'earlier', 'meanwhile', 'suddenly'];
    return timeWords.some(word => content.includes(word));
  }
  
  private createSuggestion(
    type: SmartSuggestion['type'], 
    category: keyof typeof CONVERSATION_CONFIG.CONTINUATION_PROMPTS,
    priority: number
  ): SmartSuggestion {
    const prompts = CONVERSATION_CONFIG.CONTINUATION_PROMPTS[category];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    return {
      type,
      text: randomPrompt,
      priority,
      category
    };
  }
  
  // Get style instruction based on conversation analysis
  getOptimalStyle(messages: ConversationMessage[]): keyof typeof CONVERSATION_CONFIG.STYLE_PROMPTS {
    const userMessages = messages.filter(m => m.role === 'user');
    const avgLength = userMessages.reduce((sum, msg) => sum + msg.content.split(/\s+/).length, 0) / userMessages.length;
    
    if (avgLength < 15) {
      return 'CONCISE'; // User gives short responses, be more direct
    } else if (avgLength > 50) {
      return 'DEEP_DIVE'; // User is verbose, ask deeper questions
    } else {
      return 'CONVERSATIONAL'; // Balanced approach
    }
  }
}

// Singleton instance
export const smartSuggestionService = new SmartSuggestionService();