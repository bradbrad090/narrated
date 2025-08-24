import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import QuestionAnalyticsDashboard from '@/components/QuestionAnalyticsDashboard';
import { ArrowLeft, Book } from 'lucide-react';

const QuestionAnalytics = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication and load book data
    const loadData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          navigate('/auth');
          return;
        }

        setUser(user);

        if (bookId) {
          // Load book details
          const { data: bookData, error: bookError } = await supabase
            .from('books')
            .select('*')
            .eq('id', bookId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (bookError) {
            console.error('Error loading book:', bookError);
            toast({
              title: "Error loading book",
              description: "Failed to load book details",
              variant: "destructive",
            });
            navigate('/dashboard');
            return;
          }

          if (!bookData) {
            toast({
              title: "Book not found",
              description: "The requested book could not be found",
              variant: "destructive",
            });
            navigate('/dashboard');
            return;
          }

          setBook(bookData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load page data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [bookId, navigate, toast]);

  const handleQuestionSelect = (question: any) => {
    // Navigate to the writing page with the selected question
    navigate(`/write/${bookId}?question=${encodeURIComponent(question.question_text)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user || !book) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Question Analytics - {book.title} | Narrated</title>
        <meta name="description" content={`View and analyze conversation questions for ${book.title}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5 text-primary" />
                <div>
                  <h1 className="font-semibold">{book.title}</h1>
                  <p className="text-sm text-muted-foreground">Question Analytics</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <QuestionAnalyticsDashboard
            userId={user.id}
            bookId={bookId!}
            onQuestionSelect={handleQuestionSelect}
          />
        </main>
      </div>
    </>
  );
};

export default QuestionAnalytics;