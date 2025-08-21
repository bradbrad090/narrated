// Strategy pattern implementation for different conversation types

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

export class ReflectionConversationStrategy implements ConversationStrategy {
  type: ConversationType = 'reflection';

  generateGoals(): string[] {
    return [
      'Explore deeper meanings and life lessons',
      'Understand personal values and beliefs',
      'Reflect on life changes and transformations', 
      'Connect past experiences to current wisdom'
    ];
  }

  buildInitialPrompt(context: ConversationContext, styleInstructions?: string): string {
    const basePrompt = `You are a thoughtful reflection guide helping someone explore the deeper meanings in their life experiences. Your role is to facilitate introspection and help them connect past events to current wisdom.

Context about the person:
${JSON.stringify(context, null, 2)}

Conversation Type: Reflection - Focus on deeper meanings and life lessons

Guidelines:
- Encourage introspection and self-discovery
- Ask questions that help them see patterns and connections
- Guide them to explore the "why" behind their experiences
- Help them articulate their values and beliefs
- Keep responses thoughtful and philosophical (2-3 sentences)
- Always end with a reflective question

${styleInstructions ? `RESPONSE STYLE OVERRIDE: ${styleInstructions}` : ''}

Start the conversation by ${styleInstructions ? 'asking a direct question about their life philosophy or values' : 'inviting them to reflect on what has shaped who they are today'}.`;

    return basePrompt;
  }

  buildConversationPrompt(
    context: ConversationContext, 
    messages: ConversationMessage[], 
    styleInstructions?: string
  ): string {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    return `You are a reflection guide helping explore deeper life meanings and lessons.

Context: ${JSON.stringify(context, null, 2)}
Type: Reflection - Focus on introspection and connecting experiences to wisdom
Last user message: "${lastUserMessage}"

${styleInstructions ? `RESPONSE STYLE OVERRIDE: ${styleInstructions}` : 'Respond thoughtfully and help them explore deeper meanings. Keep responses reflective and philosophical (2-3 sentences). Always end with a question that encourages introspection.'}`;
  }
}

export class BrainstormingConversationStrategy implements ConversationStrategy {
  type: ConversationType = 'brainstorming';

  generateGoals(): string[] {
    return [
      'Generate creative story ideas and themes',
      'Identify unique personal experiences',
      'Explore different narrative perspectives',
      'Develop compelling chapter concepts'
    ];
  }

  buildInitialPrompt(context: ConversationContext, styleInstructions?: string): string {
    const basePrompt = `You are a creative writing coach helping someone brainstorm compelling stories and themes for their autobiography. Your role is to spark creativity and help them see their experiences from fresh perspectives.

Context about the person:
${JSON.stringify(context, null, 2)}

Conversation Type: Brainstorming - Focus on creative story development

Guidelines:
- Be energetic and enthusiastic about their experiences
- Suggest creative angles and narrative approaches
- Help them identify unique or unusual aspects of their stories
- Encourage them to think about themes and connections
- Keep responses creative and inspiring (2-3 sentences)
- Always end with a brainstorming question

${styleInstructions ? `RESPONSE STYLE OVERRIDE: ${styleInstructions}` : ''}

Start the conversation by ${styleInstructions ? 'asking a direct question about what story they want to explore' : 'encouraging them to think creatively about their most interesting experiences'}.`;

    return basePrompt;
  }

  buildConversationPrompt(
    context: ConversationContext, 
    messages: ConversationMessage[], 
    styleInstructions?: string
  ): string {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    return `You are a creative writing coach helping brainstorm autobiography stories and themes.

Context: ${JSON.stringify(context, null, 2)}
Type: Brainstorming - Focus on creative story development and themes
Last user message: "${lastUserMessage}"

${styleInstructions ? `RESPONSE_STYLE OVERRIDE: ${styleInstructions}` : 'Respond creatively and help them explore new story angles. Keep responses inspiring and energetic (2-3 sentences). Always end with a brainstorming question.'}`;
  }
}

// Strategy factory
export class ConversationStrategyFactory {
  private static strategies: Map<ConversationType, ConversationStrategy> = new Map([
    ['interview', new InterviewConversationStrategy()],
    ['reflection', new ReflectionConversationStrategy()],
    ['brainstorming', new BrainstormingConversationStrategy()]
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