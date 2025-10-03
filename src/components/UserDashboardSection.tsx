import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Plus, Book, Trash2, Edit2, Check, X } from "lucide-react";

interface UserDashboardSectionProps {
  user: User;
}

const UserDashboardSection = ({ user }: UserDashboardSectionProps) => {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchBooks(user.id);
    }
  }, [user]);

  const fetchBooks = async (userId: string) => {
    try {
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select(`
          *, 
          book_profiles(id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;

      const booksWithStats = await Promise.all(
        (booksData || []).map(async (book) => {
          const { count } = await supabase
            .from('chapters')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', book.id);

          const { data: wordCountData } = await supabase
            .from('chapters')
            .select('content')
            .eq('book_id', book.id);

          const wordCount = (wordCountData || []).reduce((total, chapter) => {
            const content = chapter.content || '';
            return total + content.split(/\s+/).filter(word => word.length > 0).length;
          }, 0);

          return {
            ...book,
            chapters: { length: count || 0 },
            wordCount
          };
        })
      );

      setBooks(booksWithStats);
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

  const createNewBook = async () => {
    try {
      const existingTitles = books.map(book => book.title);
      const baseTitle = "My New Autobiography";
      
      let newTitle = baseTitle;
      let counter = 2;
      
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
    try {
      const { data, error } = await supabase.rpc('delete_book_and_related_data', {
        target_book_id: bookId
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        toast({
          title: "Book deleted",
          description: "Your book and all related data have been deleted.",
        });
        fetchBooks(user.id);
      } else {
        throw new Error(data?.[0]?.message || "Failed to delete book");
      }
    } catch (error: any) {
      toast({
        title: "Error deleting book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRenameBook = async (bookId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

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

  const getWordCount = (book: any) => book.wordCount || 0;
  const getChapterCount = (book: any) => book.chapters?.length || 0;
  const getEstimatedPages = (wordCount: number) => Math.ceil(wordCount / 250);

  if (loading) {
    return (
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-gradient-subtle py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Easily manage multiple books within a single account.<br />
            
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-center">
                Add Book
              </CardTitle>
              <CardDescription>
                Start a new story, or continue working on an existing story below:
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={createNewBook} size="lg" variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Create New Book
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">Your Books</h3>
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
                        <Badge variant={book.tier as "free" | "basic" | "standard" | "premium"}>
                          {book.tier.charAt(0).toUpperCase() + book.tier.slice(1)} Plan
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(book.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
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
      </div>
    </section>
  );
};

export default UserDashboardSection;