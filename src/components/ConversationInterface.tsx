import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import VoiceInterface from '@/components/VoiceInterface';
import { MessageCircle, Send, Mic, MicOff, Loader2, Sparkles, Edit3, Save, X, User, Bot, Volume2 } from 'lucide-react';
import { useConversationFlow, ConversationMessage } from '@/hooks/useConversationFlow';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ConversationInterfaceProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  className?: string;
  onContentGenerated?: (content: string) => void;
}

export const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  userId,
  bookId,
  chapterId,
  className = "",
  onContentGenerated
}) => {
  // Main interface state
  const [activeTab, setActiveTab] = useState<'self' | 'assisted' | 'voice'>('self');
  const [currentMessage, setCurrentMessage] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [directPrompt, setDirectPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  
  // Self conversation state
  const [selfConversations, setSelfConversations] = useState<ConversationMessage[]>([]);
  const [isLoadingSelfConversations, setIsLoadingSelfConversations] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Assisted mode state
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [assistedPrompt, setAssistedPrompt] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const {
    currentSession,
    conversationHistory,
    context,
    isLoading,
    isTyping,
    startConversation,
    sendMessage,
    endConversation,
    resumeConversation,
    saveDraft,
    loadDraft,
    clearDraft
  } = useConversationFlow(userId, bookId, chapterId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isTyping, selfConversations]);

  // Load self conversations on mount
  useEffect(() => {
    if (activeTab === 'self' && chapterId) {
      loadSelfConversations();
    }
  }, [activeTab, chapterId, userId]);

  // Draft saving with localStorage
  useEffect(() => {
    const draftKey = `draft_${activeTab}_${chapterId || 'general'}`;
    if (activeTab === 'self' && currentMessage) {
      localStorage.setItem(draftKey, currentMessage);
    } else if (activeTab === 'assisted' && assistedPrompt) {
      localStorage.setItem(draftKey, assistedPrompt);
    }
  }, [currentMessage, assistedPrompt, activeTab, chapterId]);

  // Load draft on tab change
  useEffect(() => {
    const draftKey = `draft_${activeTab}_${chapterId || 'general'}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      if (activeTab === 'self') {
        setCurrentMessage(savedDraft);
      } else if (activeTab === 'assisted') {
        setAssistedPrompt(savedDraft);
      }
    }
  }, [activeTab, chapterId]);

  // Load draft on session start
  useEffect(() => {
    if (currentSession) {
      const draft = loadDraft();
      setCurrentMessage(draft);
    }
  }, [currentSession, loadDraft]);

  // Save draft as user types
  useEffect(() => {
    if (currentMessage && currentSession) {
      const timeoutId = setTimeout(() => {
        saveDraft(currentMessage);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentMessage, currentSession, saveDraft]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !currentSession) return;

    await sendMessage(currentMessage);
    setCurrentMessage('');
    clearDraft();
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceTranscription = (text: string) => {
    if (activeTab === 'self') {
      setCurrentMessage(prev => prev + (prev ? ' ' : '') + text);
    } else if (activeTab === 'assisted') {
      setAssistedPrompt(prev => prev + (prev ? ' ' : '') + text);
    } else {
      setCurrentMessage(prev => prev + (prev ? ' ' : '') + text);
    }
    setIsVoiceMode(false);
  };

  // Self conversation functions
  const loadSelfConversations = async () => {
    if (!chapterId) return;
    
    setIsLoadingSelfConversations(true);
    try {
      const { data, error } = await supabase
        .from('chat_histories')
        .select('messages, created_at')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .eq('is_self_conversation', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const allMessages: ConversationMessage[] = [];
      data?.forEach(session => {
        if (session.messages && Array.isArray(session.messages)) {
          const sessionMessages = session.messages as unknown as ConversationMessage[];
          allMessages.push(...sessionMessages);
        }
      });

      setSelfConversations(allMessages);
    } catch (error: any) {
      toast({
        title: "Error loading conversations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSelfConversations(false);
    }
  };

  const saveSelfConversation = async () => {
    if (!currentMessage.trim() || !chapterId) return;

    setIsSaving(true);
    try {
      const newMessage: ConversationMessage = {
        role: 'user',
        content: currentMessage.trim(),
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('chat_histories')
        .insert({
          user_id: userId,
          chapter_id: chapterId,
          is_self_conversation: true,
          conversation_type: 'self',
          messages: [newMessage] as any
        });

      if (error) throw error;

      setSelfConversations(prev => [...prev, newMessage]);
      setCurrentMessage('');
      
      // Clear draft
      const draftKey = `draft_self_${chapterId}`;
      localStorage.removeItem(draftKey);

      toast({
        title: "Saved",
        description: "Your entry has been saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error saving entry",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const editSelfMessage = async (messageIndex: number, newContent: string) => {
    if (!chapterId || !newContent.trim()) return;

    setIsSaving(true);
    try {
      // Update local state immediately for better UX
      const updatedConversations = [...selfConversations];
      updatedConversations[messageIndex] = {
        ...updatedConversations[messageIndex],
        content: newContent.trim()
      };
      setSelfConversations(updatedConversations);

      // Find and update in database
      const { data, error: fetchError } = await supabase
        .from('chat_histories')
        .select('id, messages')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .eq('is_self_conversation', true)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Find the correct session and message
      let targetSessionId = null;
      let targetMessageIndex = 0;
      let currentIndex = 0;

      for (const session of data || []) {
        const sessionMessages = Array.isArray(session.messages) ? session.messages as unknown as ConversationMessage[] : [];
        if (currentIndex + sessionMessages.length > messageIndex) {
          targetSessionId = session.id;
          targetMessageIndex = messageIndex - currentIndex;
          break;
        }
        currentIndex += sessionMessages.length;
      }

      if (targetSessionId) {
        const targetSession = data?.find(s => s.id === targetSessionId);
        const sessionMessages = Array.isArray(targetSession?.messages) ? targetSession.messages as unknown as ConversationMessage[] : [];
        const updatedMessages = [...sessionMessages];
        updatedMessages[targetMessageIndex] = {
          ...updatedMessages[targetMessageIndex],
          content: newContent.trim()
        };

        const { error: updateError } = await supabase
          .from('chat_histories')
          .update({ messages: updatedMessages as any })
          .eq('id', targetSessionId);

        if (updateError) throw updateError;
      }

      setEditingMessage(null);
      setEditText('');

      toast({
        title: "Updated",
        description: "Your entry has been updated successfully",
      });
    } catch (error: any) {
      // Revert local state on error
      loadSelfConversations();
      toast({
        title: "Error updating entry",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Assisted mode functions
  const generateAISuggestions = async () => {
    if (!assistedPrompt.trim()) return;

    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('conversation-context-builder', {
        body: {
          userId,
          bookId,
          chapterId,
          prompt: assistedPrompt,
          generateSuggestions: true
        }
      });

      if (error) throw error;

      setAiSuggestions(data?.suggestions || [
        "Expand on the emotions you felt during this experience",
        "Describe the setting and atmosphere in more detail",
        "Explain how this event shaped your perspective",
        "Share what you learned from this situation"
      ]);
    } catch (error: any) {
      toast({
        title: "Error generating suggestions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const applyAssistedWriting = async () => {
    if (!assistedPrompt.trim()) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-autobiography', {
        body: {
          prompt: `Write autobiography content based on this prompt: ${assistedPrompt}. Make it personal and engaging, incorporating the user's context and style.`,
          userId: userId,
          bookId: bookId,
          chapterId: chapterId
        }
      });

      if (error) throw error;

      if (data?.content && onContentGenerated) {
        onContentGenerated(data.content);
        setAssistedPrompt("");
        
        // Clear draft
        const draftKey = `draft_assisted_${chapterId || 'general'}`;
        localStorage.removeItem(draftKey);
        
        toast({
          title: "Content generated!",
          description: "AI has generated new content for your chapter.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error generating content",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateDirectContent = async () => {
    if (!directPrompt.trim() || !userId || !bookId) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-autobiography', {
        body: {
          prompt: `Write autobiography content based on this prompt: ${directPrompt}. Make it personal and engaging.`,
          userId: userId,
          bookId: bookId
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.content && onContentGenerated) {
        onContentGenerated(data.content);
        setDirectPrompt("");
        
        toast({
          title: "Content generated!",
          description: "AI has generated new content for your chapter.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error generating content",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const formatMessage = (content: string) => {
    // Simple formatting for better readability
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Render tabbed interface
  return (
    <div className={`${className} w-full max-w-6xl mx-auto`}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="self" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Self Conversation
          </TabsTrigger>
          <TabsTrigger value="assisted" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Text-Assisted
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Voice-to-Voice
          </TabsTrigger>
        </TabsList>

        {/* Self Conversation Mode */}
        <TabsContent value="self" className="space-y-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Self Conversation Mode
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Record your thoughts and memories. Edit and organize your entries.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input Area */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Share your thoughts, memories, or reflections..."
                    className="min-h-[120px] resize-none"
                    aria-label="Self conversation input"
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setIsVoiceMode(!isVoiceMode)}
                      variant="outline"
                      size="icon"
                      aria-label={isVoiceMode ? "Stop voice input" : "Start voice input"}
                    >
                      {isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {isVoiceMode && (
                  <VoiceRecorder
                    onTranscription={handleVoiceTranscription}
                    disabled={isSaving}
                    selfMode={true}
                  />
                )}
                
                <Button
                  onClick={saveSelfConversation}
                  disabled={!currentMessage.trim() || isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Entry
                    </>
                  )}
                </Button>
              </div>

              {/* Self Conversations Display */}
              {isLoadingSelfConversations ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading your conversations...</span>
                </div>
              ) : (
                <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                  {selfConversations.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No self-conversations yet. Start by sharing your thoughts above.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selfConversations.map((message, index) => (
                        <div key={`${message.timestamp}-${index}`} className="border rounded-lg p-4 bg-muted/30">
                          {editingMessage === `${message.timestamp}-${index}` ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="min-h-[100px]"
                                aria-label="Edit message"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => editSelfMessage(index, editText)}
                                  disabled={isSaving}
                                  size="sm"
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                  Save
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingMessage(null);
                                    setEditText('');
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  <X className="h-4 w-4" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start mb-2">
                                <div className="text-xs text-muted-foreground">
                                  {new Date(message.timestamp).toLocaleString()}
                                </div>
                                <Button
                                  onClick={() => {
                                    setEditingMessage(`${message.timestamp}-${index}`);
                                    setEditText(message.content);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Edit entry"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-sm">
                                {formatMessage(message.content)}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Text-Assisted Mode */}
        <TabsContent value="assisted" className="space-y-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Assisted Writing
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Get AI suggestions and generate content based on your prompts
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Input Section */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea
                      value={assistedPrompt}
                      onChange={(e) => setAssistedPrompt(e.target.value)}
                      placeholder="Example: Write about my childhood growing up in a small town, focusing on summer adventures and family traditions..."
                      className="min-h-[120px] resize-none"
                      aria-label="AI-assisted writing prompt"
                    />
                    <Button
                      onClick={() => setIsVoiceMode(!isVoiceMode)}
                      variant="outline"
                      size="icon"
                      aria-label="Voice input"
                    >
                      {isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {isVoiceMode && (
                    <VoiceRecorder
                      onTranscription={handleVoiceTranscription}
                      disabled={generating}
                      selfMode={false}
                    />
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={generateAISuggestions}
                      disabled={!assistedPrompt.trim() || isLoadingSuggestions}
                      variant="outline"
                    >
                      {isLoadingSuggestions ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mr-2" />
                      )}
                      Get Suggestions
                    </Button>
                    <Button
                      onClick={applyAssistedWriting}
                      disabled={!assistedPrompt.trim() || generating}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate Content
                    </Button>
                  </div>
                </div>

                {/* AI Suggestions */}
                <div className="space-y-3">
                  <h4 className="font-medium">AI Suggestions</h4>
                  {aiSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      {aiSuggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="h-auto p-3 text-left justify-start whitespace-normal"
                          onClick={() => {
                            setAssistedPrompt(prev => prev + (prev ? '\n\n' : '') + suggestion);
                          }}
                        >
                          <Bot className="h-4 w-4 mr-2 flex-shrink-0" />
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8 border rounded-lg">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Click "Get Suggestions" to receive AI-powered writing prompts</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice-to-Voice Mode */}
        <TabsContent value="voice" className="space-y-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Voice-to-Voice AI Conversation
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Have a real-time voice conversation with the AI assistant
              </p>
            </CardHeader>
            <CardContent>
              {!currentSession ? (
                <div className="space-y-6">
                  {/* Voice Interface */}
                  <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-4">
                      <Volume2 className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">Real-time Voice Conversation</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start a natural voice conversation with the AI assistant
                    </p>
                    {isAISpeaking && (
                      <div className="flex items-center justify-center gap-1 text-sm text-green-600 mb-4">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        AI Speaking
                      </div>
                    )}
                    <VoiceInterface 
                      onSpeakingChange={setIsAISpeaking}
                      context={context}
                      conversationType="interview"
                      userId={userId}
                      bookId={bookId}
                      chapterId={chapterId}
                      onConversationUpdate={() => {
                        window.location.reload();
                      }}
                    />
                  </div>

                  {/* Text Conversation Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={() => startConversation('interview')}
                      disabled={isLoading}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      variant="outline"
                    >
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <MessageCircle className="h-6 w-6" />
                      )}
                      <div className="text-center">
                        <div className="font-medium">Text Interview</div>
                        <div className="text-sm text-muted-foreground">
                          Structured Q&A about your life
                        </div>
                      </div>
                    </Button>

                    <Button
                      onClick={() => startConversation('reflection')}
                      disabled={isLoading}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      variant="outline"
                    >
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <MessageCircle className="h-6 w-6" />
                      )}
                      <div className="text-center">
                        <div className="font-medium">Text Reflection</div>
                        <div className="text-sm text-muted-foreground">
                          Deep exploration of meanings
                        </div>
                      </div>
                    </Button>

                    <Button
                      onClick={() => startConversation('brainstorming')}
                      disabled={isLoading}
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      variant="outline"
                    >
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <MessageCircle className="h-6 w-6" />
                      )}
                      <div className="text-center">
                        <div className="font-medium">Text Brainstorming</div>
                        <div className="text-sm text-muted-foreground">
                          Generate creative story ideas
                        </div>
                      </div>
                    </Button>
                  </div>

                  {/* Recent Conversations */}
                  {conversationHistory.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Recent Conversations</h3>
                      <div className="space-y-2">
                        {conversationHistory.slice(0, 3).map((session) => (
                          <div key={session.sessionId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {session.conversationType}
                                </Badge>
                                <Badge 
                                  variant={session.conversationMedium === 'voice' ? 'default' : 'secondary'}
                                  className={session.conversationMedium === 'voice' ? 'bg-green-100 text-green-800' : ''}
                                >
                                  {session.conversationMedium === 'voice' ? '🎤 Voice' : '💬 Text'}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {session.messages.length} messages
                              </span>
                            </div>
                            <Button
                              onClick={() => resumeConversation(session)}
                              size="sm"
                              variant="ghost"
                              disabled={session.conversationMedium === 'voice'}
                            >
                              {session.conversationMedium === 'voice' ? 'View Transcript' : 'Resume'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Active voice conversation (existing UI)
                <div className="flex flex-col h-[500px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {currentSession.conversationType}
                      </Badge>
                      {isAISpeaking && (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          AI Speaking
                        </div>
                      )}
                    </div>
                    <Button onClick={endConversation} variant="outline" size="sm">
                      End Session
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 p-4 border rounded-md">
                    <div className="space-y-4">
                      {currentSession.messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground ml-4'
                                : 'bg-muted mr-4'
                            }`}
                          >
                            <div className="text-sm">
                              {formatMessage(message.content)}
                            </div>
                            <div className="text-xs opacity-70 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3 mr-4">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-muted-foreground">
                                Thinking...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="mt-4 p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Share your thoughts, ask questions, or tell a story..."
                        className="min-h-[80px] resize-none"
                        disabled={isTyping}
                        aria-label="Message input"
                      />
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleSendMessage}
                          disabled={!currentMessage.trim() || isTyping}
                          size="icon"
                          aria-label="Send message"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          onClick={() => setIsVoiceMode(!isVoiceMode)}
                          variant="outline"
                          size="icon"
                          aria-label={isVoiceMode ? "Stop voice input" : "Start voice input"}
                        >
                          {isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {isVoiceMode && (
                      <div className="mt-2">
                        <VoiceRecorder
                          onTranscription={handleVoiceTranscription}
                          disabled={isTyping}
                          selfMode={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // This code is now part of the tabbed interface above
};