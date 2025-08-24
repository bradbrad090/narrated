import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Book, LogOut, Save, Sparkles, ArrowLeft, Plus, FileText, Trash2, Edit2, Type, Menu, Eye, EyeOff } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ConversationInterface } from "@/components/ConversationInterface";
import { ConversationContext } from "@/components/ConversationContext";
import { ProfileSetup } from "@/components/ProfileSetup";
import PaymentButton from "@/components/PaymentButton";
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
  summary?: string;
  created_at: string;
  updated_at: string;
}

const WriteBook = () => {
  const { bookId: paramBookId } = useParams();
  const [searchParams] = useSearchParams();
  const bookId = paramBookId || searchParams.get('book_id');
  const [user, setUser] = useState<User | null>(null);
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChapterRefinement, setShowChapterRefinement] = useState(true);
  const [bookProfile, setBookProfile] = useState<any>(null);
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

      // Fetch book profile
      const { data: profileData, error: profileError } = await supabase
        .from('book_profiles')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching book profile:', profileError);
      } else {
        setBookProfile(profileData);
      }

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


  const handleContentTranscription = async (transcribedText: string) => {
    if (!currentChapter) return;
    const updatedContent = currentChapter.content ? currentChapter.content + " " + transcribedText : transcribedText;
    const updatedChapter = { ...currentChapter, content: updatedContent };
    setCurrentChapter(updatedChapter);
    setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
    
    // Auto-save after voice transcription
    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          content: updatedContent,
          title: updatedChapter.title
        })
        .eq('id', updatedChapter.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Voice transcription saved!",
        description: "Your spoken content has been automatically saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error auto-saving transcription",
        description: error.message,
        variant: "destructive",
      });
    }
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

  const handleGenerateChapter = async () => {
    if (!user || !currentChapter || !book) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-chapter', {
        body: {
          userId: user.id,
          bookId: book.id,
          chapterId: currentChapter.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate chapter');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate chapter');
      }

      // Update the current chapter with the generated content
      const updatedChapter = { 
        ...currentChapter, 
        content: data.content,
        updated_at: new Date().toISOString()
      };
      setCurrentChapter(updatedChapter);
      setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));

      toast({
        title: "Chapter generated successfully!",
        description: "Your autobiography chapter has been created using AI.",
      });

      // Show the chapter refinement section if it's hidden
      setShowChapterRefinement(true);

    } catch (error: any) {
      console.error('Generate chapter error:', error);
      toast({
        title: "Error generating chapter",
        description: error.message || "Failed to generate chapter content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!user || !currentChapter || !book) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          userId: user.id,
          bookId: book.id,
          chapterId: currentChapter.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate summary');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      // Update the current chapter with the generated summary
      const updatedChapter = { 
        ...currentChapter, 
        summary: data.summary,
        updated_at: new Date().toISOString()
      };
      setCurrentChapter(updatedChapter);
      setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));

      toast({
        title: "Summary generated successfully!",
        description: "A concise summary has been created for your chapter.",
      });

    } catch (error: any) {
      console.error('Generate summary error:', error);
      toast({
        title: "Error generating summary",
        description: error.message || "Failed to generate chapter summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
    <>
      <Helmet>
        <title>{book?.title ? `${book.title} - Write Your Book` : 'Write Your Autobiography'} | Narrated</title>
        <meta name="description" content="Write and edit your autobiography with AI assistance. Voice recording, chapter management, and intelligent content generation." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
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
          {/* Profile Setup Section for Mobile */}
          {user && book && (
            <div className="max-w-4xl mx-auto mb-6">
              <ProfileSetup
                userId={user.id}
                bookId={book.id}
                bookProfile={bookProfile}
                onProfileUpdate={setBookProfile}
              />
            </div>
          )}
          
          {/* Payment Section for Mobile */}
          {user && book && (
            <div className="max-w-4xl mx-auto mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Book Tier</CardTitle>
                  <CardDescription>
                    Choose the tier that best fits your needs. Upgrade to unlock advanced features.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentButton
                    bookId={book.id}
                    currentTier={book.tier as 'free' | 'paid' | 'premium'}
                    purchaseStatus={book.purchase_status}
                    onPaymentStart={() => {
                      toast({
                        title: "Processing payment...",
                        description: "You'll be redirected to complete your payment.",
                      });
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
          
          {currentChapter ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Conversation Section - Mobile */}
                  {user && book && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Conversation Assistant</CardTitle>
                        <CardDescription>
                          Have a natural conversation to explore your memories and generate content for your autobiography.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ConversationInterface
                          userId={user.id}
                          bookId={book.id}
                          chapterId={currentChapter?.id}
                          onContentGenerated={(content) => {
                            if (currentChapter) {
                              const newContent = currentChapter.content ? currentChapter.content + "\n\n" + content : content;
                              const updatedChapter = { ...currentChapter, content: newContent };
                              setCurrentChapter(updatedChapter);
                              setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
                            }
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}
                  
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
              <div className="h-full bg-background border-r p-4 overflow-auto">
                <div className="space-y-4">
                   {/* Profile Setup Section */}
                   {user && book && (
                     <ProfileSetup
                       userId={user.id}
                       bookId={book.id}
                       bookProfile={bookProfile}
                       onProfileUpdate={setBookProfile}
                     />
                   )}
                   
                   {/* Payment Section */}
                   {user && book && (
                     <Card className="mt-6">
                       <CardHeader>
                         <CardTitle>Book Tier</CardTitle>
                         <CardDescription>
                           Choose the tier that best fits your needs. Upgrade to unlock advanced features and unlimited content.
                         </CardDescription>
                       </CardHeader>
                       <CardContent>
                         <PaymentButton
                           bookId={book.id}
                           currentTier={book.tier as 'free' | 'paid' | 'premium'}
                           purchaseStatus={book.purchase_status}
                           onPaymentStart={() => {
                             toast({
                               title: "Processing payment...",
                               description: "You'll be redirected to complete your payment.",
                             });
                           }}
                         />
                       </CardContent>
                     </Card>
                   )}
                  
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
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Side - Content Editor */}
            <ResizablePanel defaultSize={75}>
              <div className="h-full p-6 overflow-auto">
                {currentChapter ? (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Conversation Section */}
                    {user && book && (
                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle>Conversation Assistant</CardTitle>
                          <CardDescription>
                            Have a natural conversation to explore your memories and generate content for your autobiography.
                          </CardDescription>
                        </CardHeader>
                         <CardContent>
                           <ConversationInterface
                             userId={user.id}
                             bookId={book.id}
                             chapterId={currentChapter?.id}
                             onContentGenerated={(content) => {
                               if (currentChapter) {
                                 const newContent = currentChapter.content ? currentChapter.content + "\n\n" + content : content;
                                 const updatedChapter = { ...currentChapter, content: newContent };
                                 setCurrentChapter(updatedChapter);
                                 setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
                               }
                             }}
                           />
                         </CardContent>
                      </Card>
                      )}

                      {/* Chapter Summary Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Chapter Summary</CardTitle>
                          <CardDescription>
                            A brief summary of this chapter will appear here to help you understand the key themes and content.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            placeholder="Chapter summary will be generated here..."
                            value={currentChapter.summary || ""}
                            readOnly
                            className="min-h-[120px] text-base leading-relaxed bg-muted/50"
                          />
                        </CardContent>
                      </Card>

                      {/* Generate Chapter Button */}
                      <div className="flex justify-center gap-4 mb-4">
                      <Button
                        variant="default"
                        onClick={handleGenerateChapter}
                        disabled={saving || !currentChapter || !user}
                        size="lg"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {saving ? "Generating..." : "Generate Chapter with AI"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleGenerateSummary}
                        disabled={saving || !currentChapter || !user || !currentChapter.content.trim()}
                        size="lg"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {saving ? "Generating..." : "Generate Summary"}
                      </Button>
                    </div>

                     {/* Toggle Button for Chapter Refinement Window */}
                    <div className="flex justify-center my-6">
                      <Button
                        onClick={() => setShowChapterRefinement(!showChapterRefinement)}
                        variant={showChapterRefinement ? "secondary" : "default"}
                        size="lg"
                        className="shadow-lg"
                      >
                        {showChapterRefinement ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Hide my story
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            See my story so far
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Chapter Refinement Window */}
                    {showChapterRefinement && (
                      <Card>
                        <CardHeader>
                          <CardTitle>{currentChapter.title}</CardTitle>
                          <CardDescription>
                            Edit and refine your chapter content in the chapter refinement window below. You can manually edit the AI-generated text or write your own.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            placeholder="Your chapter content will appear here. You can edit it directly or use the conversation assistant above to generate new content..."
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
                    )}
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
    </>
  );
};

export default WriteBook;