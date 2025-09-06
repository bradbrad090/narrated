// Enhanced conversation flow with smart features
import { useState, useEffect, useCallback } from 'react';
import { ConversationSession, ConversationMessage } from '@/types/conversation';
import { smartSuggestionService } from '@/services/SmartSuggestionService';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';

interface UseSmartConversationFlowProps {
  currentSession: ConversationSession | null;
  conversationHistory: ConversationSession[];
}

export const useSmartConversationFlow = ({
  currentSession,
  conversationHistory
}: UseSmartConversationFlowProps) => {
  const [conversationInsights, setConversationInsights] = useState<{
    averageResponseLength: number;
    emotionalTone: 'positive' | 'neutral' | 'negative';
    topicsDiscussed: string[];
    suggestedNextTopics: string[];
    conversationHealth: number; // 1-5 scale
  } | null>(null);

  // Analyze conversation patterns
  const analyzeConversation = useCallback((session: ConversationSession) => {
    const userMessages = session.messages.filter(m => m.role === 'user');
    
    if (userMessages.length === 0) return null;

    // Calculate average response length
    const totalWords = userMessages.reduce((sum, msg) => {
      return sum + msg.content.split(/\s+/).length;
    }, 0);
    const averageResponseLength = Math.round(totalWords / userMessages.length);

    // Analyze emotional tone
    const emotionalTone = analyzeEmotionalTone(userMessages);

    // Extract topics discussed
    const topicsDiscussed = extractTopics(userMessages);

    // Generate suggested next topics
    const suggestedNextTopics = generateNextTopics(topicsDiscussed, conversationHistory);

    // Calculate conversation health (engagement level)
    const conversationHealth = calculateConversationHealth(session);

    return {
      averageResponseLength,
      emotionalTone,
      topicsDiscussed,
      suggestedNextTopics,
      conversationHealth
    };
  }, [conversationHistory]);

  // Update insights when session changes
  useEffect(() => {
    if (currentSession && currentSession.messages.length > 2) {
      const insights = analyzeConversation(currentSession);
      setConversationInsights(insights);
    } else {
      setConversationInsights(null);
    }
  }, [currentSession, analyzeConversation]);

  // Detect conversation patterns
  const getConversationPattern = useCallback(() => {
    if (!currentSession || currentSession.messages.length < 4) return null;

    const userMessages = currentSession.messages.filter(m => m.role === 'user');
    const lastThreeMessages = userMessages.slice(-3);

    // Check if responses are getting shorter (user losing interest)
    const wordCounts = lastThreeMessages.map(m => m.content.split(/\s+/).length);
    const isLosingInterest = wordCounts.every((count, i) => 
      i === 0 || count <= wordCounts[i - 1]
    ) && wordCounts[wordCounts.length - 1] < 10;

    // Check if responses are getting longer (user getting engaged)
    const isGettingEngaged = wordCounts.every((count, i) => 
      i === 0 || count >= wordCounts[i - 1]
    ) && wordCounts[wordCounts.length - 1] > 20;

    return {
      isLosingInterest,
      isGettingEngaged,
      needsEncouragement: isLosingInterest,
      canGoDeeper: isGettingEngaged
    };
  }, [currentSession]);

  // Get optimal conversation style based on patterns
  const getOptimalStyle = useCallback(() => {
    const pattern = getConversationPattern();
    
    if (!pattern || !currentSession) {
      return smartSuggestionService.getOptimalStyle(currentSession?.messages || []);
    }

    if (pattern.needsEncouragement) {
      return 'CONVERSATIONAL'; // More supportive
    } else if (pattern.canGoDeeper) {
      return 'DEEP_DIVE'; // Ask deeper questions
    } else {
      return 'CONCISE'; // Keep it focused
    }
  }, [currentSession, getConversationPattern]);

  // Smart continuation suggestions
  const getContinuationSuggestions = useCallback(() => {
    if (!currentSession || !conversationInsights) return [];

    const suggestions = [];

    // Based on conversation health
    if (conversationInsights.conversationHealth < 3) {
      suggestions.push({
        type: 'encourage',
        text: "Tell me more about what that experience meant to you",
        reason: "Low engagement detected"
      });
    }

    // Based on emotional tone
    if (conversationInsights.emotionalTone === 'negative') {
      suggestions.push({
        type: 'support',
        text: "How did you get through that difficult time?",
        reason: "Supporting through difficult topics"
      });
    }

    // Based on topics discussed
    if (conversationInsights.suggestedNextTopics.length > 0) {
      suggestions.push({
        type: 'explore',
        text: `Let's explore ${conversationInsights.suggestedNextTopics[0]}`,
        reason: "New topic suggestion"
      });
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }, [currentSession, conversationInsights]);

  return {
    conversationInsights,
    conversationPattern: getConversationPattern(),
    optimalStyle: getOptimalStyle(),
    continuationSuggestions: getContinuationSuggestions(),
    isHealthyConversation: conversationInsights ? conversationInsights.conversationHealth >= 3 : true
  };
};

// Helper functions
function analyzeEmotionalTone(messages: ConversationMessage[]): 'positive' | 'neutral' | 'negative' {
  const content = messages.map(m => m.content.toLowerCase()).join(' ');
  
  const positiveWords = ['happy', 'joy', 'love', 'excited', 'proud', 'grateful', 'wonderful', 'amazing'];
  const negativeWords = ['sad', 'angry', 'hurt', 'difficult', 'painful', 'lost', 'worried', 'scared'];
  
  const positiveCount = positiveWords.filter(word => content.includes(word)).length;
  const negativeCount = negativeWords.filter(word => content.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function extractTopics(messages: ConversationMessage[]): string[] {
  const content = messages.map(m => m.content.toLowerCase()).join(' ');
  
  const topicKeywords = {
    'family': ['family', 'mother', 'father', 'brother', 'sister', 'children', 'parent'],
    'work': ['job', 'work', 'career', 'colleague', 'boss', 'business', 'office'],
    'relationships': ['friend', 'partner', 'spouse', 'relationship', 'marriage', 'dating'],
    'education': ['school', 'college', 'university', 'teacher', 'student', 'learn'],
    'health': ['health', 'doctor', 'hospital', 'illness', 'recovery', 'medical'],
    'travel': ['travel', 'trip', 'vacation', 'journey', 'visit', 'destination'],
    'hobbies': ['hobby', 'sport', 'music', 'art', 'reading', 'cooking', 'gardening']
  };
  
  const foundTopics: string[] = [];
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      foundTopics.push(topic);
    }
  }
  
  return foundTopics;
}

function generateNextTopics(currentTopics: string[], conversationHistory: ConversationSession[]): string[] {
  const allPossibleTopics = [
    'childhood memories', 'career milestones', 'travel experiences', 
    'family traditions', 'personal growth', 'challenges overcome',
    'important relationships', 'life lessons learned', 'future dreams'
  ];
  
  // Filter out topics that might have been discussed before
  const discussedContent = conversationHistory
    .flatMap(session => session.messages)
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.toLowerCase())
    .join(' ');
  
  return allPossibleTopics.filter(topic => 
    !discussedContent.includes(topic.toLowerCase()) &&
    !currentTopics.some(ct => topic.includes(ct))
  ).slice(0, 3);
}

function calculateConversationHealth(session: ConversationSession): number {
  const userMessages = session.messages.filter(m => m.role === 'user');
  
  if (userMessages.length === 0) return 1;
  
  // Factors that contribute to conversation health
  const avgLength = userMessages.reduce((sum, msg) => sum + msg.content.split(/\s+/).length, 0) / userMessages.length;
  const hasQuestions = userMessages.some(msg => msg.content.includes('?'));
  const hasEmotionalWords = userMessages.some(msg => {
    const emotional = ['feel', 'felt', 'emotion', 'heart', 'soul', 'love', 'hate', 'joy', 'sad'];
    return emotional.some(word => msg.content.toLowerCase().includes(word));
  });
  const recentEngagement = userMessages.slice(-3).every(msg => msg.content.split(/\s+/).length > 5);
  
  let score = 1;
  if (avgLength > 15) score++; // Detailed responses
  if (hasQuestions) score++; // User is asking questions
  if (hasEmotionalWords) score++; // Emotional engagement
  if (recentEngagement) score++; // Recent engagement
  
  return Math.min(score, 5);
}