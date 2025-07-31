import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Book, LogOut, Save, Sparkles, ArrowLeft, Plus, FileText, Trash2, Edit2, Type, Menu } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";


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
  const [showTextarea, setShowTextarea] = useState(false);
  const [storyIdea, setStoryIdea] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  // Auto-generate story idea when page loads or chapter changes
  useEffect(() => {
    if (currentChapter && (!storyIdea || !loading)) {
      generateStoryIdea();
    }
  }, [currentChapter, loading]);

  // Clear story idea when chapter changes to trigger new generation
  useEffect(() => {
    if (currentChapter) {
      setStoryIdea("");
    }
  }, [currentChapter?.id]);

  const fetchBookAndChapters = async (userId: string) => {
    try {
      // Fetch book
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', userId)
        .maybeSingle();

      if (bookError) throw bookError;
      
      if (!bookData) {
        toast({
          title: "Book not found",
          description: "The requested book could not be found.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      
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
        // Check if chapters need title updates (for existing books)
        const needsUpdate = chaptersData.some(chapter => 
          chapter.title.match(/^Chapter \d+$/) || 
          !chapter.title.includes(':')
        );
        
        if (needsUpdate) {
          await updateChapterTitles(userId, chaptersData);
        } else {
          setChapters(chaptersData);
          setCurrentChapter(chaptersData[0]);
        }
      } else {
        // Create 14 default chapters if none exist
        await createDefaultChapters(userId);
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

  const updateChapterTitles = async (userId: string, existingChapters: Chapter[]) => {
    const defaultTitles = [
      "Chapter 1: Before My Birth",
      "Chapter 2: Birth and Infancy",
      "Chapter 3: Toddler Years", 
      "Chapter 4: Starting School",
      "Chapter 5: Elementary School",
      "Chapter 6: Junior High",
      "Chapter 7: High School",
      "Chapter 8: High School Graduation",
      "Chapter 9: College Years",
      "Chapter 10: Entering the Workforce",
      "Chapter 11: Marriage and Family",
      "Chapter 12: Mid-Career Years",
      "Chapter 13: Empty Nest Phase",
      "Chapter 14: Approaching Retirement"
    ];

    try {
      const updates = existingChapters.map((chapter, index) => {
        const newTitle = defaultTitles[index] || `Chapter ${chapter.chapter_number}`;
        return {
          id: chapter.id,
          title: newTitle
        };
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('chapters')
          .update({ title: update.title })
          .eq('id', update.id)
          .eq('user_id', userId);

        if (error) throw error;
      }

      // Update local state with new titles
      const updatedChapters = existingChapters.map((chapter, index) => ({
        ...chapter,
        title: defaultTitles[index] || `Chapter ${chapter.chapter_number}`
      }));

      setChapters(updatedChapters);
      setCurrentChapter(updatedChapters[0]);

      toast({
        title: "Chapter titles updated!",
        description: "Your chapters now have the new life phase titles.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating chapter titles",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createDefaultChapters = async (userId: string) => {
    const defaultChapters = [
      { title: "Chapter 1: Before My Birth", description: "Exploring family history, parents' lives, and the world events shaping my origins." },
      { title: "Chapter 2: Birth and Infancy", description: "Recounting the moment of arrival, early family bonds, and initial discoveries in a new world." },
      { title: "Chapter 3: Toddler Years", description: "Memories of play, first words, and the simple joys and mishaps of preschool years." },
      { title: "Chapter 4: Starting School", description: "The excitement and nerves of the first day of school, new friends, and adapting to structure." },
      { title: "Chapter 5: Elementary School", description: "Lessons learned in classrooms and on recess, early achievements, and childhood friendships." },
      { title: "Chapter 6: Junior High", description: "Navigating puberty, shifting social dynamics, and the challenges of middle school life." },
      { title: "Chapter 7: High School", description: "Academic pressures, extracurriculars, first romances, and defining teenage rebellions." },
      { title: "Chapter 8: High School Graduation", description: "The bittersweet farewell to youth, final high school moments, and stepping into independence." },
      { title: "Chapter 9: College Years", description: "Intellectual growth, new freedoms, lifelong friendships, and exploring passions in higher education." },
      { title: "Chapter 10: Entering the Workforce", description: "Landing the initial job, career beginnings, workplace lessons, and building professional identity." },
      { title: "Chapter 11: Marriage and Family", description: "Meeting a partner, wedding milestones, starting a home, and the joys of parenthood." },
      { title: "Chapter 12: Mid-Career Years", description: "Professional peaks, promotions, work-life balance struggles, and overcoming mid-career hurdles." },
      { title: "Chapter 13: Empty Nest Phase", description: "Watching kids leave home, reevaluating relationships, and personal reinventions in later adulthood." },
      { title: "Chapter 14: Approaching Retirement", description: "Winding down work, new hobbies, health reflections, and embracing post-career freedom amid global changes." }
    ];

    try {
      // Double-check that chapters don't already exist to prevent duplicates
      const { data: existingChapters } = await supabase
        .from('chapters')
        .select('id')
        .eq('book_id', bookId!)
        .eq('user_id', userId);

      if (existingChapters && existingChapters.length > 0) {
        console.log('Chapters already exist, skipping creation');
        return;
      }

      const chaptersToInsert = defaultChapters.map((chapter, index) => ({
        book_id: bookId!,
        user_id: userId,
        chapter_number: index + 1,
        title: chapter.title,
        content: chapter.description
      }));

      const { data, error } = await supabase
        .from('chapters')
        .insert(chaptersToInsert)
        .select();

      if (error) {
        // If it's a duplicate key error, try to fetch existing chapters instead
        if (error.message.includes('duplicate key')) {
          console.log('Duplicate chapters detected, fetching existing chapters');
          const { data: existingData } = await supabase
            .from('chapters')
            .select('*')
            .eq('book_id', bookId!)
            .eq('user_id', userId)
            .order('chapter_number', { ascending: true });
          
          if (existingData && existingData.length > 0) {
            setChapters(existingData as Chapter[]);
            setCurrentChapter(existingData[0] as Chapter);
            return;
          }
        }
        throw error;
      }

      const newChapters = data as Chapter[];
      setChapters(newChapters);
      setCurrentChapter(newChapters[0]);

      toast({
        title: "Template chapters created!",
        description: "14 default chapters have been added to help you get started.",
      });
    } catch (error: any) {
      console.error('Error in createDefaultChapters:', error);
      toast({
        title: "Error creating chapters",
        description: error.message,
        variant: "destructive",
      });
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

  const generateStoryIdea = async () => {
    if (!currentChapter) return;
    
    try {
      const chapterContext = `The user is currently writing "${currentChapter.title}". `;
      const { data, error } = await supabase.functions.invoke('openai-conversation', {
        body: { 
          prompt: `${chapterContext}You are a creative prompt generator specializing in autobiography and memoir writing. Your task is to generate random questions that prompt users to reflect on specific times, periods, or milestones in their life story that are RELEVANT to the chapter they're currently writing.

Based on the chapter title "${currentChapter.title}", generate a time-specific autobiography prompt that would be appropriate for this life phase or period. The question should be:

1. Time-specific—tied to the particular life stage mentioned in the chapter title
2. Focused on a defined moment or era to encourage vivid, personal narratives  
3. Engaging and introspective, often starting with "Describe," "Reflect on," "What was," "When did," or "Tell about"
4. Concise, 1-2 sentences max
5. Relevant to the themes and life period of the current chapter

Examples based on different chapter types:
- For "Before My Birth": Ask about family history, parents' early relationship, or world events during parents' youth
- For "Birth and Infancy": Ask about early family dynamics, first home, or family traditions around that time
- For "Elementary School": Ask about specific school memories, childhood friendships, or family routines during those years
- For "High School": Ask about teenage experiences, first jobs, or pivotal moments during adolescence
- For "Marriage and Family": Ask about meeting spouse, wedding details, or early parenting experiences

Generate 1 contextually appropriate autobiography prompt question for "${currentChapter.title}".` 
        }
      });

      if (error) throw error;
      
      if (data?.choices?.[0]?.message?.content) {
        setStoryIdea(data.choices[0].message.content);
      } else {
        throw new Error("No content received from AI");
      }
    } catch (error) {
      console.error('Error generating story idea:', error);
      // Fallback to a random prompt if API fails
      const fallbackPrompts = [
        "Describe your first day at a new school and how it shaped your understanding of change.",
        "What was your earliest memory of feeling truly proud of an accomplishment in elementary school?",
        "Reflect on a specific summer during your childhood that taught you something important about family.",
        "When did you first realize you were becoming an adult, and what triggered that moment?",
        "Tell about a tradition from your teenage years that you now understand differently as an adult."
      ];
      const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
      setStoryIdea(randomPrompt);
    }
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
      {/* Header - Fixed position on mobile for better accessibility */}
      <header className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${isMobile ? 'sticky top-0 z-50' : ''}`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="h-full bg-background p-4">
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
                          onClick={() => {
                            setCurrentChapter(chapter);
                            setSidebarOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{chapter.title}</span>
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
                            {(() => {
                              const words = chapter.content.trim() ? chapter.content.split(/\s+/).length : 0;
                              const pages = Math.ceil(words / 300);
                              return `${words} words • ${pages} page${pages !== 1 ? 's' : ''}`;
                            })()}
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
                </SheetContent>
              </Sheet>
            )}
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className={isMobile ? "sr-only" : ""}>Back to Dashboard</span>
            </Button>
            <div className={`flex items-center space-x-2 ${isMobile ? "hidden" : ""}`}>
              <Book className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">{book?.title || "My Autobiography"}</h1>
            </div>
          </div>
          <div className="flex items-center justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={saveCurrentChapter}
              disabled={saving || !currentChapter}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={handleSignOut} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={isMobile ? "min-h-screen" : "h-[calc(100vh-80px)]"}>
        {isMobile ? (
          <div className="h-full pt-20 p-4 overflow-auto">
            {currentChapter ? (
                <div className="max-w-4xl mx-auto space-y-6">
                   {/* Conversational Assistant Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <span>Conversational Assistant</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {showTextarea && (
                        <Textarea
                          placeholder="Example: Write about my childhood growing up in a small town, focusing on summer adventures and family traditions..."
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          className="min-h-[100px]"
                        />
                      )}
                      
                      {storyIdea && (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground font-medium">Story Idea:</p>
                          <p className="mt-1">{storyIdea}</p>
                        </div>
                      )}

                      <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                        <Button 
                          onClick={generateStoryIdea}
                          disabled={generating}
                          variant="outline"
                          className="w-full h-10"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Give me an idea
                        </Button>
                        
                        <div className="w-full h-10">
                          <VoiceRecorder 
                            onTranscription={handleContentTranscription}
                            disabled={generating}
                          />
                        </div>
                        
                        <Button 
                          onClick={() => setShowTextarea(!showTextarea)}
                          variant="outline"
                          className="w-full h-10"
                        >
                          <Type className="h-4 w-4 mr-2" />
                          I'd prefer to type
                        </Button>
                      </div>

                      {(showTextarea && prompt.trim()) && (
                        <div className="flex gap-2">
                          <Button 
                            onClick={generateContent}
                            disabled={!prompt.trim() || generating}
                            className="flex-1"
                            variant="outline"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {generating ? "Generating..." : "Generate Content"}
                          </Button>
                          <Button 
                            onClick={() => {
                              setPrompt("");
                              setShowTextarea(false);
                            }}
                            variant="outline"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      )}
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
                      <div className="mt-4 flex justify-center">
                        <Button 
                          onClick={saveCurrentChapter}
                          disabled={saving || !currentChapter}
                          size="lg"
                          className="shadow-lg"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
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
        ) : (
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
                        {(() => {
                          const words = chapter.content.trim() ? chapter.content.split(/\s+/).length : 0;
                          const pages = Math.ceil(words / 300);
                          return `${words} words • ${pages} page${pages !== 1 ? 's' : ''}`;
                        })()}
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
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={currentChapter.title}
                            onChange={(e) => handleChapterTitleChange(e.target.value)}
                            className="text-2xl font-bold bg-transparent border-none outline-none flex-1"
                            placeholder="Chapter Title"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="bg-yellow-400/20 hover:bg-yellow-400/30 ml-2"
                            onClick={() => {
                              const inputElement = document.querySelector('.text-2xl.font-bold') as HTMLInputElement;
                              if (inputElement) {
                                inputElement.focus();
                                inputElement.select();
                              }
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>


                    {/* Conversational Assistant Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <span>Conversational Assistant</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {showTextarea && (
                          <Textarea
                            placeholder="Example: Write about my childhood growing up in a small town, focusing on summer adventures and family traditions..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="min-h-[100px]"
                          />
                        )}
                        
                        {storyIdea && (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground font-medium">Story Idea:</p>
                            <p className="mt-1">{storyIdea}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                          <Button 
                            onClick={generateStoryIdea}
                            disabled={generating}
                            variant="outline"
                            className="w-full h-10"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Give me an idea
                          </Button>
                          
                          <div className="w-full h-10">
                            <VoiceRecorder 
                              onTranscription={handleContentTranscription}
                              disabled={generating}
                            />
                          </div>
                          
                          <Button 
                            onClick={() => setShowTextarea(!showTextarea)}
                            variant="outline"
                            className="w-full h-10"
                          >
                            <Type className="h-4 w-4 mr-2" />
                            I'd prefer to type
                          </Button>
                        </div>

                        {(showTextarea && prompt.trim()) && (
                          <div className="flex gap-2">
                            <Button 
                              onClick={generateContent}
                              disabled={!prompt.trim() || generating}
                              className="flex-1"
                              variant="outline"
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              {generating ? "Generating..." : "Generate Content"}
                            </Button>
                            <Button 
                              onClick={() => {
                                setPrompt("");
                                setShowTextarea(false);
                              }}
                              variant="outline"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                          </div>
                        )}
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
                        <div className="mt-4 flex justify-center">
                          <Button 
                            onClick={saveCurrentChapter}
                            disabled={saving || !currentChapter}
                            size="lg"
                            className="shadow-lg"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save"}
                          </Button>
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
        )}
      </main>
    </div>
  );
};

export default WriteBook;