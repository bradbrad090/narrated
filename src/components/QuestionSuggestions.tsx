import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, RefreshCw, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuestionSuggestionsProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  conversationType: 'interview' | 'reflection' | 'brainstorming';
  existingContext?: string;
  onQuestionSelect: (question: string) => void;
  className?: string;
}

const QuestionSuggestions: React.FC<QuestionSuggestionsProps> = ({
  userId,
  bookId,
  chapterId,
  conversationType,
  existingContext,
  onQuestionSelect,
  className = ''
}) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          userId,
          bookId,
          chapterId,
          conversationType,
          existingContext
        }
      });

      if (error) throw error;

      setQuestions(data.questions || []);
      
      if (data.questions?.length > 0) {
        toast({
          title: "Questions generated!",
          description: `Generated ${data.questions.length} personalized questions for you.`,
        });
      } else {
        toast({
          title: "No new questions",
          description: "Unable to generate new questions at this time.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    onQuestionSelect(question);
    toast({
      title: "Question selected",
      description: "The question has been added to your conversation.",
    });
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Question Suggestions</CardTitle>
          </div>
          <Button
            onClick={generateQuestions}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Generating...' : 'Generate'}
          </Button>
        </div>
        <CardDescription>
          AI-powered questions tailored to your story and conversation style
        </CardDescription>
      </CardHeader>
      
      {questions.length > 0 && (
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="text-xs">
              {conversationType}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {questions.length} suggestions
            </span>
          </div>
          
          <div className="space-y-2">
            {questions.map((question, index) => (
              <Button
                key={index}
                onClick={() => handleQuestionClick(question)}
                variant="ghost"
                className="w-full text-left justify-start h-auto p-3 whitespace-normal"
              >
                <div className="flex items-start gap-2 w-full">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{question}</span>
                </div>
              </Button>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted/50 rounded-md">
            💡 These questions are personalized based on your conversation history and story context.
          </div>
        </CardContent>
      )}
      
      {questions.length === 0 && !isLoading && (
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Click "Generate" to get personalized questions based on your story
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default QuestionSuggestions;