// Strategy pattern implementation for interview conversation type

import { ConversationType, ConversationStrategy, ConversationContext, ConversationMessage } from '@/types/conversation';

export class InterviewConversationStrategy implements ConversationStrategy {
  type: ConversationType = 'interview';

  generateGoals(): string[] {
    return [
      'Gather specific life stories and experiences',
      'Explore key relationships and influences', 
      'Document important life events chronologically',
      'Capture personal growth and learning moments'
    ];
  }

  buildInitialPrompt(context: ConversationContext, styleInstructions?: string): string {
    const basePrompt = `You are a compassionate life coach and autobiography assistant helping someone document their life story. Your role is to engage in thoughtful conversation that draws out meaningful stories and experiences.

Context about the person:
${JSON.stringify(context, null, 2)}

Conversation Type: Interview - Focus on gathering specific stories and experiences

Guidelines:
- Be warm, empathetic, and genuinely interested
- Ask open-ended questions that encourage storytelling
- Build on previous responses naturally
- Help the person explore emotions and meanings behind events
- Keep responses conversational and personal (2-3 sentences)
- Always end with a thoughtful follow-up question

${styleInstructions ? `RESPONSE STYLE OVERRIDE: ${styleInstructions}` : ''}

Start the conversation with ${styleInstructions ? 'a direct, engaging question based on their profile' : 'a warm greeting and an engaging question based on their profile'}.`;

    return basePrompt;
  }

  buildConversationPrompt(
    context: ConversationContext, 
    messages: ConversationMessage[], 
    styleInstructions?: string
  ): string {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    return `You are a compassionate life coach helping document life stories through interviews.

Context: ${JSON.stringify(context, null, 2)}
Type: Interview - Focus on extracting specific stories and experiences
Last user message: "${lastUserMessage}"

${styleInstructions ? `RESPONSE STYLE OVERRIDE: ${styleInstructions}` : 'Respond naturally and ask engaging follow-up questions. Keep responses warm and conversational (2-3 sentences). Always end with a question that encourages more storytelling.'}`;
  }
}

// Strategy factory
export class ConversationStrategyFactory {
  private static strategies: Map<ConversationType, ConversationStrategy> = new Map([
    ['interview', new InterviewConversationStrategy()]
  ]);

  static getStrategy(type: ConversationType): ConversationStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Unknown conversation type: ${type}`);
    }
    return strategy;
  }

  static getAllStrategies(): ConversationStrategy[] {
    return Array.from(this.strategies.values());
  }
}