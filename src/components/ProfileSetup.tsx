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
  "What is your full name and any nicknames?",
  "When and where were you born?",
  "How many siblings do you have?",
  "What did your parents do for work?",
  "Where did you grow up primarily?",
  "What was your highest level of education?",
  "What was your first job?",
  "Are you married or in a long-term relationship?",
  "Do you have any children?",
  "What is your current occupation?"
];

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  userId,
  bookId,
  bookProfile,
  onProfileUpdate
}) => {
  const [isExpanded, setIsExpanded] = useState(!bookProfile?.full_name);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<{[key: number]: string}>({});
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

  const saveQuestionResponse = async (questionIndex: number, answer: string) => {
    try {
      const { error } = await supabase
        .from('profile_question_responses')
        .upsert({
          user_id: userId,
          book_id: bookId,
          question_index: questionIndex,
          question_text: PROFILE_QUESTIONS[questionIndex],
          answer_text: answer,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving question response:', error);
      }
    } catch (error) {
      console.error('Error saving question response:', error);
    }
  };

  const progress = ((currentQuestion + Object.keys(responses).length) / PROFILE_QUESTIONS.length) * 100;

  const handleVoiceTranscription = (text: string) => {
    setCurrentResponse(prev => prev + (prev ? ' ' : '') + text);
    setIsVoiceMode(false);
  };

  const handleNextQuestion = async () => {
    if (currentResponse.trim()) {
      const response = currentResponse.trim();
      setResponses(prev => ({
        ...prev,
        [currentQuestion]: response
      }));
      
      // Save the response to the database
      await saveQuestionResponse(currentQuestion, response);
    }
    
    if (currentQuestion < PROFILE_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setCurrentResponse('');
    } else {
      processConversation();
    }
  };

  const handleSkipQuestion = async () => {
    // Save empty response if skipped
    await saveQuestionResponse(currentQuestion, '');
    
    if (currentQuestion < PROFILE_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setCurrentResponse('');
    } else {
      processConversation();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      const previousResponse = responses[currentQuestion - 1] || '';
      setCurrentResponse(previousResponse);
    }
  };

  const processConversation = async () => {
    setIsProcessing(true);
    
    try {
      // Convert responses to conversation text for processing
      const conversationText = Object.entries(responses)
        .map(([index, response]) => `Q: ${PROFILE_QUESTIONS[parseInt(index)]}\nA: ${response}`)
        .join('\n\n');

      // Also prepare structured Q&A data for the new storage system
      const structuredQA = Object.entries(responses).map(([index, response]) => ({
        question: PROFILE_QUESTIONS[parseInt(index)],
        answer: response
      }));

      const { data, error } = await supabase.functions.invoke('profile-extractor', {
        body: {
          conversationText: structuredQA, // Send structured data for new storage
          conversationTextForProcessing: conversationText, // Keep original text for AI processing
          userId,
          bookId
        }
      });

      if (error) {
        console.error('Error processing profile:', error);
        toast({
          title: "Error",
          description: "Failed to process your profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data && data.profile) {
        setExtractedProfile(data.profile);
        toast({
          title: "Profile Processed",
          description: "Your profile has been successfully extracted and saved.",
        });
        
        // Call the callback to notify parent component
        onProfileUpdate?.(data.profile);
      }
    } catch (error) {
      console.error('Error processing profile:', error);
      toast({
        title: "Error",
        description: "Failed to process your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const completionPercentage = extractedProfile ? 100 : Math.min((Object.keys(responses).length / PROFILE_QUESTIONS.length) * 100, 95);

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
                    You can type your answers or use voice recording. Your progress is saved automatically.
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
                        {Object.keys(responses).length} answered
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
                      {currentQuestion !== PROFILE_QUESTIONS.length - 1 && (
                        <Button
                          onClick={handleSkipQuestion}
                          variant="outline"
                        >
                          Skip
                        </Button>
                      )}
                      
                      {currentQuestion === PROFILE_QUESTIONS.length - 1 ? (
                        <Button
                          onClick={async () => {
                            if (currentResponse.trim()) {
                              await handleNextQuestion();
                            } else {
                              await handleSkipQuestion();
                            }
                          }}
                          disabled={isProcessing}
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
                          Next
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

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
                  {extractedProfile.nicknames && extractedProfile.nicknames.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Nicknames:</span>
                      <p className="text-sm">{extractedProfile.nicknames.join(', ')}</p>
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
                  {extractedProfile.first_job && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">First Job:</span>
                      <p className="text-sm">{extractedProfile.first_job}</p>
                    </div>
                  )}
                  {extractedProfile.current_location && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Location:</span>
                      <p className="text-sm">{extractedProfile.current_location}</p>
                    </div>
                  )}
                  {extractedProfile.siblings_count !== null && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Siblings:</span>
                      <p className="text-sm">{extractedProfile.siblings_count}</p>
                    </div>
                  )}
                  {extractedProfile.marital_status && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Marital Status:</span>
                      <p className="text-sm">{extractedProfile.marital_status}</p>
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
                    setResponses({});
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