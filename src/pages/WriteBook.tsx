import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Book, LogOut, Save, Sparkles, ArrowLeft, Plus, FileText, Trash2, Edit2, Type, Menu, Eye, EyeOff, ChevronDown, ChevronUp, Clock, CheckCircle2, Circle, MoreVertical, GripVertical } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ConversationInterface } from "@/components/ConversationInterface";
import { SavedConversations } from "@/components/SavedConversations";
import { useConversationState } from "@/hooks/useConversationState";
import { isFeatureEnabled } from "@/config/environment";
import { ConversationContext } from "@/components/ConversationContext";
import { ProfileSetup } from "@/components/ProfileSetup";
import { DeleteChapterDialog } from "@/components/DeleteChapterDialog";
import { ChapterCard } from "@/components/ChapterCard";
import PaymentButton from "@/components/PaymentButton";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { updateChapterOrder } from '@/services/chapterService';


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
  is_submitted?: boolean;
}

const WriteBook = () => {
  const { bookId: paramBookId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookId = paramBookId || searchParams.get('book_id');
  const profileMode = searchParams.get('profile') === 'true';
  const [user, setUser] = useState<User | null>(null);
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChapterRefinement, setShowChapterRefinement] = useState(false);
  const [bookProfile, setBookProfile] = useState<any>(null);
  const [isBookTierCollapsed, setIsBookTierCollapsed] = useState(true);
  const [isSavedConversationsCollapsed, setIsSavedConversationsCollapsed] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [chapterConversations, setChapterConversations] = useState<Map<string, number>>(new Map());
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Add conversation state for SavedConversations
  const {
    history: conversationHistory,
    deleteConversation,
    deletingSessionIds,
  } = useConversationState({
    userId: user?.id || null,
    bookId: book?.id || null,
    chapterId: currentChapter?.id || null
  });

  // Fetch conversation counts for all chapters
  const fetchChapterConversations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_histories')
        .select('chapter_id')
        .eq('user_id', userId)
        .not('chapter_id', 'is', null);

      if (error) throw error;

      const conversationCounts = new Map<string, number>();
      data?.forEach(record => {
        if (record.chapter_id) {
          const count = conversationCounts.get(record.chapter_id) || 0;
          conversationCounts.set(record.chapter_id, count + 1);
        }
      });

      setChapterConversations(conversationCounts);
    } catch (error) {
      console.error('Error fetching chapter conversations:', error);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchBookAndChapters(user.id);
      fetchChapterConversations(user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        } else {
          setUser(session.user);
          fetchBookAndChapters(session.user.id);
          fetchChapterConversations(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, bookId]);

  // Check for profile requirement on load
  useEffect(() => {
    if (book && user && profileMode && !bookProfile?.full_name) {
      setShowProfileModal(true);
    }
  }, [book, user, profileMode, bookProfile]);

  // Handle profile completion
  const handleProfileUpdate = (profile: any) => {
    setBookProfile(profile);
    // Always close the modal when profile is processed, regardless of specific fields
    if (profileMode && profile) {
      // Profile is complete, remove profile parameter and show success
      setSearchParams(new URLSearchParams());
      setShowProfileModal(false);
      toast({
        title: "Profile Complete!",
        description: "You can now start writing your autobiography.",
      });
    }
    // Force update to ensure profile setup is hidden
    if (profile && (profile.full_name || profile.processed)) {
      setBookProfile(prev => ({ ...prev, ...profile, full_name: profile.full_name || 'Completed' }));
    }
  };



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
        // Error fetching book profile, continuing without it
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
      { title: "Chapter 1", description: "" }
    ];

    try {
      // Double-check that chapters don't already exist to prevent duplicates
      const { data: existingChapters } = await supabase
        .from('chapters')
        .select('id')
        .eq('book_id', bookId!)
        .eq('user_id', userId);

      if (existingChapters && existingChapters.length > 0) {
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
        title: "Chapter created!",
        description: "Your first chapter has been created. Click 'Add Chapter' to create more.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error creating chapters",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const createNewChapter = async (userId: string, chapterNumber: number, title: string) => {
    try {
      // Check tier limits for free accounts
      if (book?.tier === 'free' && chapters.length >= 1) {
        setShowUpgrade(true);
        return;
      }

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

  const handleDeleteChapter = (chapter: Chapter) => {
    if (chapters.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one chapter.",
        variant: "destructive",
      });
      return;
    }

    setChapterToDelete(chapter);
    setShowDeleteDialog(true);
  };

  const confirmDeleteChapter = async (chapterId: string) => {
    setIsDeleting(true);
    
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
      
      setShowDeleteDialog(false);
      setChapterToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error deleting chapter",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameChapter = async (chapterId: string, newTitle: string) => {
    if (!user || !newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('chapters')
        .update({ title: newTitle.trim() })
        .eq('id', chapterId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setChapters(prev => 
        prev.map(ch => ch.id === chapterId ? { ...ch, title: newTitle.trim() } : ch)
      );

      // Update current chapter if it's the one being renamed
      if (currentChapter?.id === chapterId) {
        setCurrentChapter(prev => prev ? { ...prev, title: newTitle.trim() } : null);
      }

      toast({
        title: "Chapter renamed",
        description: "The chapter title has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error renaming chapter",
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

  const saveCurrentConversationAndSwitchChapter = async (newChapter: Chapter) => {
    try {
      // Find the ConversationInterface element and trigger save and end
      const conversationInterface = document.querySelector('[data-conversation-interface]');
      if (conversationInterface) {
        const event = new CustomEvent('saveAndEndConversation');
        conversationInterface.dispatchEvent(event);
        
        // Give it time to save and close
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Now switch chapters
      setCurrentChapter(newChapter);
      setSidebarOpen(false);
    } catch (error: any) {
      console.error('Error saving conversation before chapter switch:', error);
      // Still switch chapter even if save fails
      setCurrentChapter(newChapter);
      setSidebarOpen(false);
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

      // Update the current chapter with the generated content and mark as submitted
      const updatedChapter = { 
        ...currentChapter, 
        content: data.content,
        is_submitted: true,
        updated_at: new Date().toISOString()
      };
      
      // Update in database
      const { error: updateError } = await supabase
        .from('chapters')
        .update({ 
          content: data.content,
          is_submitted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentChapter.id)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setCurrentChapter(updatedChapter);
      setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));

      // Mark this chapter as completed
      setCompletedChapters(prev => new Set(prev).add(currentChapter.id));
      setShowSubmitConfirmation(false);

      // Send chapter submission email
      try {
        await supabase.functions.invoke('send-chapter-email', {
          body: {
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email,
            chapter_title: currentChapter.title,
            chapter_number: currentChapter.chapter_number,
            chapter_content: data.content,
            is_first_submission: !completedChapters.has(currentChapter.id)
          }
        });
      } catch (emailError) {
        console.log('Email sending failed (non-critical):', emailError);
      }

      toast({
        title: "Chapter submitted successfully!",
        description: "Your chapter has been finalized and can no longer be modified.",
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveChapterId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveChapterId(null);
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = chapters.findIndex(chapter => chapter.id === active.id);
    const newIndex = chapters.findIndex(chapter => chapter.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Optimistically update the UI
    const reorderedChapters = arrayMove(chapters, oldIndex, newIndex);
    const updatedChapters = reorderedChapters.map((chapter, index) => ({
      ...chapter,
      chapter_number: index + 1
    }));
    
    setChapters(updatedChapters);
    
    // Update database
    if (user) {
      const result = await updateChapterOrder(
        updatedChapters.map(ch => ({ id: ch.id, chapter_number: ch.chapter_number })),
        user.id
      );
      
      if (!result.success) {
        // Rollback on failure
        setChapters(chapters);
        toast({
          title: "Failed to reorder chapters",
          description: "Changes have been reverted. Please try again.",
          variant: "destructive",
        });
      }
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
                          onClick={() => saveCurrentConversationAndSwitchChapter(chapter)}
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
                                className="hover:bg-yellow-100 hover:text-yellow-800 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChapter(chapter);
                                }}
                              >
                                <MoreVertical className="h-3 w-3" />
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
              onClick={() => navigate("/")}
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
          {user && book && !bookProfile?.full_name && (
            <div className="max-w-4xl mx-auto mb-6">
              <ProfileSetup
                userId={user.id}
                bookId={book.id}
                bookProfile={bookProfile}
                onProfileUpdate={handleProfileUpdate}
              />
            </div>
          )}

          {/* Payment Section for Mobile */}
          {user && book && (
            <div className="max-w-4xl mx-auto mb-6">
              <Card>
                <Collapsible open={!isBookTierCollapsed} onOpenChange={(open) => setIsBookTierCollapsed(!open)}>
                  <CardHeader className={isBookTierCollapsed ? "py-4" : "pb-3"}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="flex items-center justify-between p-0 h-auto w-full min-h-[2.5rem]">
                        <div className="text-left">
                          <CardTitle>Book Tier</CardTitle>
                          {!isBookTierCollapsed && (
                            <CardDescription>
                              Choose the tier that best fits your needs.<br />
                              Upgrade to unlock advanced features.
                            </CardDescription>
                          )}
                          {isBookTierCollapsed && (
                            <CardDescription>
                              {book.tier === 'free' ? 'Free (1 chapter)' : book.tier === 'paid' ? 'Paid (Unlimited)' : 'Premium (Unlimited)'}
                            </CardDescription>
                          )}
                        </div>
                        {isBookTierCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </Collapsible>
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
                           isChapterComplete={currentChapter ? completedChapters.has(currentChapter.id) : false}
                           onContentGenerated={(content) => {
                             if (currentChapter) {
                               const newContent = currentChapter.content ? currentChapter.content + "\n\n" + content : content;
                               const updatedChapter = { ...currentChapter, content: newContent };
                               setCurrentChapter(updatedChapter);
                               setChapters(prev => prev.map(c => c.id === currentChapter.id ? updatedChapter : c));
                             }
                           }}
                           onConversationUpdate={() => {
                             // Refresh conversation counts when conversations change
                             if (user) {
                               fetchChapterConversations(user.id);
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
                           disabled={saving || !currentChapter || (currentChapter && completedChapters.has(currentChapter.id))}
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
            <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
              <div className="h-full bg-background border-r p-4 overflow-auto">
                <div className="space-y-4">
                
                   {/* Profile Setup Section - Only show if profile is incomplete */}
                   {user && book && !bookProfile?.full_name && (
                     <ProfileSetup
                       userId={user.id}
                       bookId={book.id}
                       bookProfile={bookProfile}
                       onProfileUpdate={handleProfileUpdate}
                     />
                   )}

                   {/* Payment Section - Collapsed by default to save space */}
                   {user && book && (
                     <Card className="mb-4">
                       <Collapsible open={!isBookTierCollapsed} onOpenChange={(open) => setIsBookTierCollapsed(!open)}>
                         <CardHeader className="py-3">
                           <CollapsibleTrigger asChild>
                             <Button variant="ghost" className="flex items-center justify-between p-0 h-auto w-full">
                                <div className="text-left">
                                  <CardTitle className="text-sm">Book Tier</CardTitle>
                                  <CardDescription className="text-xs">
                                    {book.tier === 'free' ? 'Free (1 chapter)' : book.tier === 'paid' ? 'Paid (Unlimited)' : 'Premium (Unlimited)'}
                                  </CardDescription>
                                </div>
                               {isBookTierCollapsed ? (
                                 <ChevronDown className="h-4 w-4" />
                               ) : (
                                 <ChevronUp className="h-4 w-4" />
                               )}
                             </Button>
                           </CollapsibleTrigger>
                         </CardHeader>
                         <CollapsibleContent>
                           <CardContent className="pt-0">
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
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    )}
                  
                   <div className="space-y-3">
                     <div className="flex items-center justify-between">
                       <h2 className="text-lg font-semibold">Chapters</h2>
                       <div className="text-xs text-muted-foreground">
                         {chapters.length} of 14 chapters
                       </div>
                     </div>
                   
                   <DndContext 
                     collisionDetection={closestCenter}
                     onDragStart={handleDragStart}
                     onDragEnd={handleDragEnd}
                   >
                     <SortableContext 
                       items={chapters.map(ch => ch.id)}
                       strategy={verticalListSortingStrategy}
                     >
                         {chapters.map((chapter) => (
                           <ChapterCard
                             key={chapter.id}
                             chapter={chapter}
                             isActive={currentChapter?.id === chapter.id}
                             onSelect={() => saveCurrentConversationAndSwitchChapter(chapter)}
                             onDelete={() => handleDeleteChapter(chapter)}
                             onRename={(newTitle) => handleRenameChapter(chapter.id, newTitle)}
                             canDelete={chapters.length > 1}
                             hasConversations={(chapterConversations.get(chapter.id) || 0) > 0}
                           />
                         ))}
                     </SortableContext>
                     
                     <DragOverlay>
                       {activeChapterId ? (
                         <div className="p-4 rounded-lg border bg-background shadow-xl opacity-90">
                           <div className="flex items-center gap-2">
                             <div className="h-3 w-3 rounded-full bg-primary/20" />
                             <h3 className="font-medium text-sm">
                               {chapters.find(ch => ch.id === activeChapterId)?.title}
                             </h3>
                           </div>
                         </div>
                       ) : null}
                     </DragOverlay>
                   </DndContext>
                  
                   <div className="space-y-2 mt-4">
                     <Button
                       variant="outline"
                       className="w-full hover:bg-primary/5 hover:border-primary/30 transition-colors"
                       onClick={handleAddChapter}
                     >
                       <Plus className="h-4 w-4 mr-2" />
                       Add New Chapter
                     </Button>
                   </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Side - Content Editor */}
            <ResizablePanel defaultSize={65}>
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
                            isChapterComplete={currentChapter ? completedChapters.has(currentChapter.id) : false}
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
                       <Card className="mt-6">
                         <CardHeader>
                           <div className="flex items-center justify-between">
                             <div>
                               <CardTitle>Chapter Summary</CardTitle>
                               <CardDescription>
                                 A brief summary of this chapter will appear here to help you understand the key themes and content.
                               </CardDescription>
                             </div>
                             {/* Generate Summary Button */}
                             <Button
                               variant="default"
                               onClick={handleGenerateSummary}
                               disabled={saving || !currentChapter || !user || !currentChapter.content.trim()}
                               size="sm"
                               className="px-6 py-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg border border-primary/20"
                             >
                               {saving ? "Generating..." : "Review what I've shared so far"}
                             </Button>
                           </div>
                         </CardHeader>
                         <CardContent>
                            <Textarea
                              placeholder="Chapter summary will be generated here..."
                              value={currentChapter.summary || ""}
                              readOnly
                              className="min-h-[550px] text-base leading-relaxed bg-muted/50 resize-y"
                              style={{ resize: 'vertical' }}
                            />
                         </CardContent>
                        </Card>

                       {/* Saved Conversations Section */}
                      {isFeatureEnabled('conversationHistory') && user && book && (
                        <Card className="mt-6">
                          <Collapsible open={!isSavedConversationsCollapsed} onOpenChange={(open) => setIsSavedConversationsCollapsed(!open)}>
                            <CardHeader className={isSavedConversationsCollapsed ? "py-4" : "pb-3"}>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="flex items-center justify-between p-0 h-auto w-full min-h-[2.5rem]">
                                  <div className="text-left">
                                    <CardTitle>Saved Conversations</CardTitle>
                                    <CardDescription>
                                      View and manage your previous conversations for this chapter.
                                    </CardDescription>
                                  </div>
                                  {isSavedConversationsCollapsed ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </CardHeader>
                            <CollapsibleContent>
                              <CardContent>
                                <SavedConversations 
                                  conversations={conversationHistory}
                                  onDeleteConversation={deleteConversation}
                                  deletingSessionIds={deletingSessionIds}
                                />
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                       )}

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

                        {/* Generate Chapter Button */}
                        <div className="flex justify-center gap-4 mb-4 mt-8">
                          <Button
                           variant="default"
                           onClick={() => setShowSubmitConfirmation(true)}
                           disabled={saving || !currentChapter || !user || (currentChapter && completedChapters.has(currentChapter.id))}
                           size="lg"
                           className={`px-12 py-6 text-xl font-semibold shadow-xl transition-all duration-300 rounded-xl border-2 min-w-[400px] ${
                             currentChapter && completedChapters.has(currentChapter.id)
                               ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-muted'
                               : 'hover:shadow-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border-primary/20'
                           }`}
                         >
                           {currentChapter && completedChapters.has(currentChapter.id)
                             ? "Chapter Submitted"
                             : saving 
                               ? "Generating..." 
                               : "Confirm & Submit"
                           }
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
                            Preview Chapter: TESTING: REMOVE LATER
                          </>
                        )}
                      </Button>
                    </div>
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

      {/* Profile Setup Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Before you can start writing your autobiography, please complete your personal profile. This helps us personalize your writing experience.
            </DialogDescription>
          </DialogHeader>
          {user && book && (
            <ProfileSetup
              userId={user.id}
              bookId={book.id}
              bookProfile={bookProfile}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Chapter Dialog */}
      <DeleteChapterDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        chapter={chapterToDelete}
        onConfirmDelete={confirmDeleteChapter}
        isDeleting={isDeleting}
      />

      {/* Chapter Submission Confirmation Dialog */}
      <AlertDialog open={showSubmitConfirmation} onOpenChange={setShowSubmitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Chapter Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this chapter? Once submitted for editing, you will no longer be able to modify your chapter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateChapter}>
              Yes, Submit Chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              You've reached the limit of 1 chapter for free accounts. Upgrade to add unlimited chapters to your book.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => {
              setShowUpgrade(false);
              setIsBookTierCollapsed(false);
            }}>
              View Upgrade Options
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </>
  );
};

export default WriteBook;