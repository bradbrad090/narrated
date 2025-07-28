import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Book, LogOut, Save, Sparkles, ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ConversationalInterface from "@/components/ConversationalInterface";

interface Chapter {
  id: string;
  book_id: string;
  user_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const WriteBook = () => {
  const { bookId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
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
      fetchBookAndChapters(user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        } else {
          setUser(session.user);
          fetchBookAndChapters(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, bookId]);

  const fetchBookAndChapters = async (userId: string) => {
    try {
      // Fetch book
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', userId)
        .single();

      if (bookError) throw bookError;
      setBook(bookData);

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .order('chapter_number', { ascending: true });

      if (chaptersError) throw chaptersError;

      if (chaptersData && chaptersData.length > 0) {
        setChapters(chaptersData);
        setCurrentChapter(chaptersData[0]);
      } else {
        // Create first chapter if none exist
        await createNewChapter(userId, 1, "Chapter 1");
      }
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

  const createNewChapter = async (userId: string, chapterNumber: number, title: string) => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .insert({
          book_id: bookId!,
          user_id: userId,
          chapter_number: chapterNumber,
          title: title,
          content: ""
        })
        .select()
        .single();

      if (error) throw error;

      const newChapter = data as Chapter;
      setChapters(prev => [...prev, newChapter].sort((a, b) => a.chapter_number - b.chapter_number));
      setCurrentChapter(newChapter);

      toast({
        title: "Chapter created!",
        description: `${title} has been added to your book.`,
      });
    } catch (error: any) {
      toast({
        title: "Error creating chapter",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddChapter = () => {
    if (!user) return;
    // Find the highest chapter number and add 1 to avoid duplicates
    const maxChapterNumber = Math.max(...chapters.map(c => c.chapter_number), 0);
    const nextChapterNumber = maxChapterNumber + 1;
    createNewChapter(user.id, nextChapterNumber, `Chapter ${nextChapterNumber}`);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (chapters.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one chapter.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;

      const updatedChapters = chapters.filter(c => c.id !== chapterId);
      setChapters(updatedChapters);
      
      // Select a different chapter if current was deleted
      if (currentChapter?.id === chapterId) {
        setCurrentChapter(updatedChapters[0] || null);
      }

      toast({
        title: "Chapter deleted",
        description: "The chapter has been removed from your book.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting chapter",
        description: error.message,
        variant: "destructive",
      });
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
    if (!prompt.trim() || !user || !book || !currentChapter) return;

    console.log('Starting content generation...', { userId: user.id, bookId: book.id, prompt: prompt.substring(0, 50) + '...' });
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-autobiography', {
        body: {
          prompt: `Write autobiography content for ${currentChapter.title} based on this prompt: ${prompt}. ${currentChapter.content ? 'Continue from the existing content.' : 'This is the beginning of this chapter.'}`,
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
        const newContent = currentChapter.content ? currentChapter.content + "\n\n" + data.content : data.content;
        
        // Update current chapter state
        const updatedChapter = { ...currentChapter, content: newContent };
        setCurrentChapter(updatedChapter);
        
        // Update chapters array
        setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
        
        setPrompt("");
        
        toast({
          title: "Content generated!",
          description: "AI has added new content to your chapter.",
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

  const saveCurrentChapter = async () => {
    if (!user || !currentChapter) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          content: currentChapter.content,
          title: currentChapter.title
        })
        .eq('id', currentChapter.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Chapter saved!",
        description: `${currentChapter.title} has been saved.`,
      });
    } catch (error: any) {
      toast({
        title: "Error saving chapter",
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
    if (!currentChapter) return;
    const updatedContent = currentChapter.content ? currentChapter.content + " " + transcribedText : transcribedText;
    const updatedChapter = { ...currentChapter, content: updatedContent };
    setCurrentChapter(updatedChapter);
    setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
  };

  const handleChapterContentChange = (newContent: string) => {
    if (!currentChapter) return;
    const updatedChapter = { ...currentChapter, content: newContent };
    setCurrentChapter(updatedChapter);
    setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
  };

  const handleChapterTitleChange = (newTitle: string) => {
    if (!currentChapter) return;
    const updatedChapter = { ...currentChapter, title: newTitle };
    setCurrentChapter(updatedChapter);
    setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
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
              onClick={saveCurrentChapter}
              disabled={saving || !currentChapter}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Chapter"}
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
      <main className="h-[calc(100vh-80px)]">
        <ResizablePanelGroup direction="horizontal" className="w-full">
          {/* Left Sidebar - Chapter List */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full bg-background border-r p-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold mb-4">Chapters</h2>
                
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                      currentChapter?.id === chapter.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setCurrentChapter(chapter)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{chapter.title}</span>
                      </div>
                      {chapters.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(chapter.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {chapter.content.length} characters
                    </p>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleAddChapter}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chapter
                </Button>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Side - Content Editor */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full p-6 overflow-auto">
              {currentChapter ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Chapter Title Editor */}
                  <Card>
                    <CardHeader>
                      <input
                        type="text"
                        value={currentChapter.title}
                        onChange={(e) => handleChapterTitleChange(e.target.value)}
                        className="text-2xl font-bold bg-transparent border-none outline-none w-full"
                        placeholder="Chapter Title"
                      />
                    </CardHeader>
                  </Card>

                  {/* Conversational AI Section */}
                  <ConversationalInterface
                    onContentUpdate={(content, action) => {
                      if (!currentChapter) return;
                      
                      let newContent;
                      if (action === 'append') {
                        newContent = currentChapter.content 
                          ? currentChapter.content + "\n\n" + content 
                          : content;
                      } else {
                        newContent = content;
                      }
                      
                      const updatedChapter = { ...currentChapter, content: newContent };
                      setCurrentChapter(updatedChapter);
                      setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
                    }}
                    disabled={saving || !currentChapter}
                  />

                  {/* Traditional AI Prompt Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <span>Traditional AI Assistant</span>
                      </CardTitle>
                      <CardDescription>
                        Or use the traditional prompt-based approach to generate content.
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
                          variant="outline"
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

                  {/* Chapter Content Editor */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{currentChapter.title}</CardTitle>
                      <CardDescription>
                        Edit and refine your chapter content. You can manually edit the AI-generated text or write your own.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Your chapter content will appear here. You can edit it directly or use the AI assistant above to generate new content..."
                        value={currentChapter.content}
                        onChange={(e) => handleChapterContentChange(e.target.value)}
                        className="min-h-[500px] text-base leading-relaxed"
                      />
                      <div className="mt-4 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <VoiceRecorder 
                            onTranscription={handleContentTranscription}
                            disabled={saving}
                          />
                          <div className="text-sm text-muted-foreground">
                            <span>{currentChapter.content.length} characters</span>
                            <span className="ml-4">{Math.ceil(currentChapter.content.split(' ').length)} words</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Select a chapter to start writing</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
};

export default WriteBook;