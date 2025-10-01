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
  ChevronDown, 
  ChevronUp, 
  CheckCircle,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ProfileSetupProps {
  userId: string;
  bookId: string;
  bookProfile?: any;
  onProfileUpdate?: (profile: any) => void;
  disableCollapse?: boolean;
}

const PROFILE_QUESTIONS = [
  "What is your full name, and do you have any nicknames?",
  "Where and when were you born?",
  "Describe your family when growing up. Who were the key people in your household?",
  "Share some details about where you grew up. What made that location or community stand out to you?",
  "Walk us through your experiences of school. What schools did you go to?",
  "What were some of your first jobs?",
  "How would you describe your current daily life or routines? What keeps you busy, and what goals or interests are guiding you right now?",
  "Have you had any long-term relationships that have been significant in your life?",
  "What long-term relationships; romantic, friendships, family, or mentors have mattered most to you?",
  "What is your current occupation?"
];

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  userId,
  bookId,
  bookProfile,
  onProfileUpdate,
  disableCollapse = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!bookProfile?.question_1_answer);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<{[key: number]: string}>({});
  const [currentResponse, setCurrentResponse] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const { toast } = useToast();

  // Load existing answers from bookProfile on mount
  useEffect(() => {
    if (bookProfile) {
      const loadedResponses: {[key: number]: string} = {};
      for (let i = 0; i < PROFILE_QUESTIONS.length; i++) {
        const answerKey = `question_${i + 1}_answer` as keyof typeof bookProfile;
        if (bookProfile[answerKey]) {
          loadedResponses[i] = bookProfile[answerKey];
        }
      }
      if (Object.keys(loadedResponses).length > 0) {
        setResponses(loadedResponses);
      }
    }
  }, [bookProfile]);

  const saveQuestionToProfile = async (questionIndex: number, answer: string) => {
    try {
      // Build update object for book_profiles
      const columnName = `question_${questionIndex + 1}_answer`;
      const updateData: any = {
        user_id: userId,
        book_id: bookId,
        [columnName]: answer,
        updated_at: new Date().toISOString()
      };

      // First try to update existing profile
      const { data: existingProfile } = await supabase
        .from('book_profiles')
        .select('id')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('book_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .eq('book_id', bookId);

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('book_profiles')
          .insert(updateData);

        if (error) {
          console.error('Error inserting profile:', error);
          throw error;
        }
      }

      // Also save to audit trail table
      await supabase
        .from('profile_question_responses')
        .upsert({
          user_id: userId,
          book_id: bookId,
          question_index: questionIndex,
          question_text: PROFILE_QUESTIONS[questionIndex],
          answer_text: answer,
          updated_at: new Date().toISOString()
        });

      // Notify parent component
      if (onProfileUpdate) {
        const { data: updatedProfile } = await supabase
          .from('book_profiles')
          .select('*')
          .eq('user_id', userId)
          .eq('book_id', bookId)
          .single();
        
        if (updatedProfile) {
          onProfileUpdate(updatedProfile);
        }
      }

    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "Failed to save your answer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const answeredCount = Object.keys(responses).filter(key => responses[parseInt(key)]?.trim()).length;
  const progress = (answeredCount / PROFILE_QUESTIONS.length) * 100;
  const isComplete = answeredCount === PROFILE_QUESTIONS.length;

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
      await saveQuestionToProfile(currentQuestion, response);
      
      toast({
        title: "Answer Saved",
        description: `Question ${currentQuestion + 1} saved successfully.`,
      });
    }
    
    if (currentQuestion < PROFILE_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setCurrentResponse('');
    } else {
      // All questions complete
      toast({
        title: "Profile Complete!",
        description: "All questions have been answered. You can now start creating your chapters.",
      });
      setIsExpanded(false);
    }
  };


  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      const previousResponse = responses[currentQuestion - 1] || '';
      setCurrentResponse(previousResponse);
    }
  };

  if (disableCollapse) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div className="text-left">
              <CardTitle className="text-lg">Personal Profile Setup</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={progress} className="w-32 h-2" />
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress)}% complete
                </span>
                {isComplete && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  Question {currentQuestion + 1} of {PROFILE_QUESTIONS.length}
                </Badge>
              </div>

              <div className="border-l-4 border-primary pl-4 py-2">
                <h3 className="text-lg font-medium text-foreground mb-4">
                  {PROFILE_QUESTIONS[currentQuestion]}
                </h3>
              </div>
              
              <div className="space-y-3">
                <Textarea
                  value={currentResponse}
                  onChange={(e) => setCurrentResponse(e.target.value)}
                  placeholder="Type your answer here..."
                  className="min-h-[120px] resize-none"
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

              <div className="flex justify-between pt-2">
                <Button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0}
                  variant="outline"
                >
                  Previous
                </Button>
                
                {currentQuestion === PROFILE_QUESTIONS.length - 1 ? (
                  <Button
                    onClick={handleNextQuestion}
                    disabled={!currentResponse.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Profile
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
        </CardContent>
      </Card>
    );
  }

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
                    <Progress value={progress} className="w-32 h-2" />
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress)}% complete
                    </span>
                    {isComplete && (
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
            <div className="space-y-6">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm">
                    Question {currentQuestion + 1} of {PROFILE_QUESTIONS.length}
                  </Badge>
                </div>

                <div className="border-l-4 border-primary pl-4 py-2">
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    {PROFILE_QUESTIONS[currentQuestion]}
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <Textarea
                    value={currentResponse}
                    onChange={(e) => setCurrentResponse(e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-[120px] resize-none"
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

                <div className="flex justify-between pt-2">
                  <Button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestion === 0}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  
                  {currentQuestion === PROFILE_QUESTIONS.length - 1 ? (
                    <Button
                      onClick={handleNextQuestion}
                      disabled={!currentResponse.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Profile
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};