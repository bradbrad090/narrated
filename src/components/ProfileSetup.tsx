import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  MessageCircle, 
  Mic, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ProfileSetupProps {
  userId: string;
  bookId: string;
  bookProfile?: any;
  onProfileUpdate?: (profile: any) => void;
}

const PROFILE_QUESTIONS = [
  "What's your full name and where were you born?",
  "Tell me about your family background and childhood.",
  "What's your occupation or career path?",
  "Where do you currently live and what places have been important to you?",
  "What are your main hobbies, interests, and passions?",
  "What languages do you speak and what's your cultural background?",
  "What are the most important themes or values in your life?",
  "What personality traits would people use to describe you?",
  "What are some memorable quotes or sayings that resonate with you?",
  "What major life events, challenges, or achievements have shaped you?"
];

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  userId,
  bookId,
  bookProfile,
  onProfileUpdate
}) => {
  const [isExpanded, setIsExpanded] = useState(!bookProfile?.full_name);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (bookProfile) {
      setExtractedProfile(bookProfile);
    }
  }, [bookProfile]);

  const progress = ((currentQuestion + responses.length) / PROFILE_QUESTIONS.length) * 100;
  const isComplete = responses.length === PROFILE_QUESTIONS.length;

  const handleVoiceTranscription = (text: string) => {
    setCurrentResponse(prev => prev + (prev ? ' ' : '') + text);
    setIsVoiceMode(false);
  };

  const handleNextQuestion = () => {
    if (currentResponse.trim()) {
      const newResponses = [...responses, currentResponse.trim()];
      setResponses(newResponses);
      setCurrentResponse('');
      
      if (currentQuestion < PROFILE_QUESTIONS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setCurrentResponse(responses[currentQuestion - 1] || '');
      setResponses(responses.slice(0, -1));
    }
  };

  const processConversation = async () => {
    if (responses.length === 0) return;

    setIsProcessing(true);
    try {
      // Combine all responses into a conversation text
      const conversationText = PROFILE_QUESTIONS.map((question, index) => {
        const response = responses[index] || '';
        return `Q: ${question}\nA: ${response}`;
      }).join('\n\n');

      console.log('Processing conversation:', conversationText);

      const { data, error } = await supabase.functions.invoke(
        'profile-extractor',
        {
          body: {
            conversationText,
            userId,
            bookId
          }
        }
      );

      if (error) {
        throw error;
      }

      setExtractedProfile(data.profile);
      onProfileUpdate?.(data.profile);

      toast({
        title: "Profile Updated!",
        description: "Your personal information has been extracted and saved.",
      });

    } catch (error) {
      console.error('Error processing conversation:', error);
      toast({
        title: "Error",
        description: "Failed to process your conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const completionPercentage = extractedProfile ? 100 : Math.min((responses.length / PROFILE_QUESTIONS.length) * 100, 95);

  return (
    <Card className="mb-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center justify-between p-0 h-auto w-full">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <CardTitle className="text-lg">Personal Profile Setup</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={completionPercentage} className="w-32 h-2" />
                    <span className="text-sm text-muted-foreground">
                      {Math.round(completionPercentage)}% complete
                    </span>
                    {extractedProfile?.full_name && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            {!extractedProfile?.full_name ? (
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Let's gather some basic information about you to personalize your autobiography. 
                    You can type your answers or use voice recording.
                  </p>
                </div>

                {/* Current Question */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      Question {currentQuestion + 1} of {PROFILE_QUESTIONS.length}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {responses.length} answered
                      </span>
                    </div>
                  </div>

                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <h3 className="font-medium mb-3">
                        {PROFILE_QUESTIONS[currentQuestion]}
                      </h3>
                      
                      <div className="space-y-3">
                        <Textarea
                          value={currentResponse}
                          onChange={(e) => setCurrentResponse(e.target.value)}
                          placeholder="Share your story here... You can speak naturally as if talking to a friend."
                          className="min-h-[120px]"
                          rows={4}
                        />
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setIsVoiceMode(!isVoiceMode)}
                            variant="outline"
                            size="sm"
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            {isVoiceMode ? 'Stop Recording' : 'Voice Input'}
                          </Button>
                          
                          {isVoiceMode && (
                            <VoiceRecorder
                              onTranscription={handleVoiceTranscription}
                              disabled={false}
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between">
                    <Button
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestion === 0}
                      variant="outline"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex gap-2">
                      {currentQuestion === PROFILE_QUESTIONS.length - 1 && responses.length === PROFILE_QUESTIONS.length - 1 && currentResponse.trim() ? (
                        <Button
                          onClick={async () => {
                            handleNextQuestion();
                            setTimeout(() => processConversation(), 100);
                          }}
                          disabled={!currentResponse.trim() || isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Finish & Process
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNextQuestion}
                          disabled={!currentResponse.trim()}
                        >
                          {currentQuestion === PROFILE_QUESTIONS.length - 1 ? 'Finish' : 'Next'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Process All Responses Button */}
                {responses.length > 0 && (
                  <div className="border-t pt-4">
                    <Button
                      onClick={processConversation}
                      disabled={isProcessing || responses.length === 0}
                      variant="outline"
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing Your Information...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Process Current Responses ({responses.length} answers)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Profile Summary */
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <h3 className="font-medium">Profile Complete!</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  {extractedProfile.full_name && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Name:</span>
                      <p className="text-sm">{extractedProfile.full_name}</p>
                    </div>
                  )}
                  {extractedProfile.birthplace && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Birthplace:</span>
                      <p className="text-sm">{extractedProfile.birthplace}</p>
                    </div>
                  )}
                  {extractedProfile.occupation && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Occupation:</span>
                      <p className="text-sm">{extractedProfile.occupation}</p>
                    </div>
                  )}
                  {extractedProfile.current_location && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Location:</span>
                      <p className="text-sm">{extractedProfile.current_location}</p>
                    </div>
                  )}
                </div>

                {extractedProfile.life_themes && extractedProfile.life_themes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground mb-2 block">Life Themes:</span>
                    <div className="flex flex-wrap gap-2">
                      {extractedProfile.life_themes.map((theme: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    setExtractedProfile(null);
                    setResponses([]);
                    setCurrentQuestion(0);
                    setCurrentResponse('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Update Profile
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};