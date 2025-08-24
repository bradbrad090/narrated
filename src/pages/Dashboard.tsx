import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Plus, Book, LogOut, Trash2, Edit2, Check, X, BarChart3 } from "lucide-react";
import QuestionAnalyticsDashboard from "@/components/QuestionAnalyticsDashboard";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [showQuestionAnalytics, setShowQuestionAnalytics] = useState(false);
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
      fetchBooks(user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        } else {
          setUser(session.user);
          fetchBooks(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchBooks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *, 
          chapters(content),
          book_profiles(id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching books",
        description: error.message,
        variant: "destructive",
      });
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

  const createNewBook = async () => {
    if (!user) return;

    try {
      // Get existing book titles to determine next number
      const existingTitles = books.map(book => book.title);
      const baseTitle = "My New Autobiography";
      
      let newTitle = baseTitle;
      let counter = 2;
      
      // If base title exists, find the next available number
      if (existingTitles.includes(baseTitle)) {
        while (existingTitles.includes(`${baseTitle} ${counter}`)) {
          counter++;
        }
        newTitle = `${baseTitle} ${counter}`;
      }

      const { data, error } = await supabase
        .from('books')
        .insert([
          {
            title: newTitle,
            status: "draft",
            user_id: user.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Book created!",
        description: "Your new autobiography has been created.",
      });

      // Refresh books list
      fetchBooks(user.id);
    } catch (error: any) {
      toast({
        title: "Error creating book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Book deleted",
        description: "Your book has been deleted.",
      });

      // Refresh books list
      fetchBooks(user.id);
    } catch (error: any) {
      toast({
        title: "Error deleting book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRenameBook = async (bookId: string, newTitle: string) => {
    if (!user || !newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('books')
        .update({ title: newTitle.trim() })
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Book renamed",
        description: "Your book title has been updated.",
      });

      // Refresh books list
      fetchBooks(user.id);
      setEditingBookId(null);
      setEditingTitle("");
    } catch (error: any) {
      toast({
        title: "Error renaming book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = (bookId: string, currentTitle: string) => {
    setEditingBookId(bookId);
    setEditingTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingBookId(null);
    setEditingTitle("");
  };

  const getWordCount = (book: any) => {
    if (!book.chapters || book.chapters.length === 0) return 0;
    return book.chapters.reduce((total: number, chapter: any) => {
      const content = chapter.content || '';
      return total + content.split(/\s+/).filter((word: string) => word.length > 0).length;
    }, 0);
  };

  const getChapterCount = (book: any) => {
    return book.chapters ? book.chapters.length : 0;
  };

  const getEstimatedPages = (wordCount: number) => {
    // Assuming approximately 250 words per page
    return Math.ceil(wordCount / 250);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Your Autobiography Projects | Narrated</title>
        <meta name="description" content="Manage your autobiography projects, create new books, and continue writing your life story with AI assistance." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Book className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Narrated</h1>
          </a>
          <div className="flex items-center space-x-4">
            <span className="hidden md:inline text-sm text-muted-foreground">
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Dashboard</h2>
          <p className="text-muted-foreground">
            Easily manage multiple autobiographies within a single account.<br />
            Start a new story for any person by completing a short profile-building quiz to capture key details, or seamlessly continue working on an existing story below:
          </p>
        </div>

        {/* Create New Book Section */}
        <div className="mb-8 flex justify-center">
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Create New Book</span>
              </CardTitle>
              <CardDescription>
                Begin your autobiography journey with a new book
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={createNewBook} size="lg" variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Start Your Autobiography
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Existing Books */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Your Books</h3>
          {books.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  You haven't created any books yet. Start your first autobiography above!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => {
                const wordCount = getWordCount(book);
                const chapterCount = getChapterCount(book);
                const estimatedPages = getEstimatedPages(wordCount);
                
                return (
                  <Card key={book.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      {editingBookId === book.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameBook(book.id, editingTitle);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleRenameBook(book.id, editingTitle)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{book.title}</CardTitle>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEditing(book.id, book.title)}
                            className="bg-yellow-400/20 hover:bg-yellow-400/30"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div className="text-center">
                          <p className="text-2xl font-semibold text-primary">{chapterCount}</p>
                          <p className="text-xs text-muted-foreground">Chapters</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-semibold text-primary">{wordCount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Words</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-semibold text-primary">{estimatedPages}</p>
                          <p className="text-xs text-muted-foreground">Est. Pages</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div></div>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(book.created_at).toLocaleDateString()}
                        </p>
                      </div>
                       <div className="flex gap-2">
                         <Button 
                           variant="outline"
                           size="sm"
                           onClick={() => {
                             setSelectedBook(book.id);
                             setShowQuestionAnalytics(true);
                           }}
                           className="text-blue-600 hover:text-blue-700"
                         >
                           <BarChart3 className="h-4 w-4 mr-1" />
                           Analytics
                         </Button>
                       </div>
                       <div className="flex gap-2 mt-2">
                        {book.book_profiles && book.book_profiles.length > 0 ? (
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => navigate(`/write/${book.id}`)}
                          >
                            Continue Writing
                          </Button>
                        ) : (
                          <Button 
                            variant="hero" 
                            className="flex-1"
                            onClick={() => navigate(`/write/${book.id}?profile=true`)}
                          >
                            Build Your Profile
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleDeleteBook(book.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Question Analytics Modal/Section */}
        {showQuestionAnalytics && selectedBook && user && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">Question Analytics</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowQuestionAnalytics(false);
                    setSelectedBook(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <QuestionAnalyticsDashboard
                  userId={user.id}
                  bookId={selectedBook}
                  onQuestionSelect={(question) => {
                    console.log('Selected question:', question);
                    // You can implement question usage here
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </>
  );
};

export default Dashboard;
