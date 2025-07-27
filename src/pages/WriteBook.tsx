import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Book, LogOut, Save, Sparkles, ArrowLeft } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";

const WriteBook = () => {
  const { bookId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [book, setBook] = useState<any>(null);
  const [content, setContent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchBook(user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        } else {
          setUser(session.user);
          fetchBook(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, bookId]);

  const fetchBook = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      setBook(data);
      setContent(data.chapters || "");
    } catch (error: any) {
      toast({
        title: "Error fetching book",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateContent = async () => {
    if (!prompt.trim() || !user || !book) return;

    console.log('Starting content generation...', { userId: user.id, bookId: book.id, prompt: prompt.substring(0, 50) + '...' });
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-autobiography', {
        body: {
          prompt: `Write autobiography content based on this prompt: ${prompt}. ${content ? 'Continue from the existing content.' : 'This is the beginning of the autobiography.'}`,
          userId: user.id,
          bookId: book.id
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Error in function response:', data.error);
        throw new Error(data.error);
      }

      if (data?.content) {
        const newContent = content ? content + "\n\n" + data.content : data.content;
        setContent(newContent);
        setPrompt("");
        
        toast({
          title: "Content generated!",
          description: "AI has added new content to your autobiography.",
        });
      } else {
        console.warn('No content in response:', data);
        toast({
          title: "No content generated",
          description: "The AI didn't generate any content. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Full error object:', error);
      toast({
        title: "Error generating content",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveContent = async () => {
    if (!user || !book) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({
          chapters: content,
          status: content.trim() ? 'in_progress' : 'draft'
        })
        .eq('id', book.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Your autobiography has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePromptTranscription = (transcribedText: string) => {
    setPrompt(prev => prev ? prev + " " + transcribedText : transcribedText);
  };

  const handleContentTranscription = (transcribedText: string) => {
    setContent(prev => prev ? prev + " " + transcribedText : transcribedText);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your book...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Book className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">{book?.title || "My Autobiography"}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={saveContent}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* AI Prompt Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>AI Writing Assistant</span>
              </CardTitle>
              <CardDescription>
                Describe what you'd like to write about and AI will help craft your autobiography content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Example: Write about my childhood growing up in a small town, focusing on summer adventures and family traditions..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={generateContent}
                  disabled={!prompt.trim() || generating}
                  className="flex-1"
                  variant="hero"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generating ? "Generating..." : "Generate Content"}
                </Button>
                <VoiceRecorder 
                  onTranscription={handlePromptTranscription}
                  disabled={generating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Writing Area */}
          <Card>
            <CardHeader>
              <CardTitle>Your Autobiography</CardTitle>
              <CardDescription>
                Edit and refine your autobiography content. You can manually edit the AI-generated text or write your own.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Your autobiography content will appear here. You can edit it directly or use the AI assistant above to generate new content..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] text-base leading-relaxed"
              />
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <VoiceRecorder 
                    onTranscription={handleContentTranscription}
                    disabled={saving}
                  />
                  <div className="text-sm text-muted-foreground">
                    <span>{content.length} characters</span>
                    <span className="ml-4">{Math.ceil(content.split(' ').length)} words</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WriteBook;