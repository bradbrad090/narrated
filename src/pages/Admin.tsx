import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Copy, User, Book, FileText, LogOut } from 'lucide-react';

interface UserData {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface BookData {
  id: string;
  title: string | null;
  user_id: string;
  tier: string;
  status: string | null;
  created_at: string;
}

interface ChapterData {
  id: string;
  book_id: string;
  title: string;
  chapter_number: number;
  content: string | null;
  status: string | null;
  is_submitted: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [books, setBooks] = useState<BookData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user has admin role using the has_role function
      const { data: hasAdminRole, error: roleError } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (roleError || !hasAdminRole) {
        toast.error('Access denied. Admin only.');
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      await loadAllData();
    } catch (error) {
      console.error('Admin check failed:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    // Load all users, books, and chapters in parallel
    const [usersResult, booksResult, chaptersResult] = await Promise.all([
      supabase.from('users').select('id, email, full_name').order('created_at', { ascending: false }),
      supabase.from('books').select('id, title, user_id, tier, status, created_at').order('created_at', { ascending: false }),
      supabase.from('chapters').select('id, book_id, title, chapter_number, content, status, is_submitted').order('chapter_number', { ascending: true })
    ]);

    if (usersResult.data) setUsers(usersResult.data);
    if (booksResult.data) setBooks(booksResult.data);
    if (chaptersResult.data) setChapters(chaptersResult.data);
  };

  const getUserBooks = (userId: string) => books.filter(b => b.user_id === userId);
  const getBookChapters = (bookId: string) => chapters.filter(c => c.book_id === bookId);

  const toggleBook = (bookId: string) => {
    const newExpanded = new Set(expandedBooks);
    if (newExpanded.has(bookId)) {
      newExpanded.delete(bookId);
    } else {
      newExpanded.add(bookId);
    }
    setExpandedBooks(newExpanded);
  };

  const copyContent = (content: string, title: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`Copied "${title}" to clipboard`);
  };

  const copyAllChapters = (bookId: string, bookTitle: string) => {
    const bookChapters = getBookChapters(bookId);
    const fullContent = bookChapters
      .filter(c => c.content)
      .map(c => `--- Chapter ${c.chapter_number}: ${c.title} ---\n\n${c.content}`)
      .join('\n\n\n');
    
    if (fullContent) {
      navigator.clipboard.writeText(fullContent);
      toast.success(`Copied all chapters from "${bookTitle || 'Untitled Book'}" to clipboard`);
    } else {
      toast.error('No content to copy');
    }
  };

  const getWordCount = (content: string | null) => {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{users.length}</span>
                <span className="text-muted-foreground">Users</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{books.length}</span>
                <span className="text-muted-foreground">Books</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{chapters.length}</span>
                <span className="text-muted-foreground">Chapters</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Users Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user.id)}
                    className={`w-full text-left p-3 border-b hover:bg-accent transition-colors ${
                      selectedUser === user.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="font-medium text-sm truncate">
                      {user.full_name || 'No name'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.email || 'No email'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getUserBooks(user.id).length} book(s)
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Books & Chapters */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedUser 
                  ? `Books for ${users.find(u => u.id === selectedUser)?.full_name || users.find(u => u.id === selectedUser)?.email || 'User'}`
                  : 'Select a user to view books'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {selectedUser ? (
                  getUserBooks(selectedUser).length > 0 ? (
                    <div className="space-y-4">
                      {getUserBooks(selectedUser).map(book => (
                        <Card key={book.id} className="border">
                          <Collapsible
                            open={expandedBooks.has(book.id)}
                            onOpenChange={() => toggleBook(book.id)}
                          >
                            <CollapsibleTrigger className="w-full">
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {expandedBooks.has(book.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <CardTitle className="text-base text-left">
                                      {book.title || 'Untitled Book'}
                                    </CardTitle>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-secondary px-2 py-1 rounded">
                                      {book.tier}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {getBookChapters(book.id).length} chapters
                                    </span>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                <div className="flex justify-end mb-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyAllChapters(book.id, book.title || 'Untitled Book');
                                    }}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy All Chapters
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {getBookChapters(book.id).map(chapter => (
                                    <div
                                      key={chapter.id}
                                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">
                                          Ch. {chapter.chapter_number}: {chapter.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                                          <span>{getWordCount(chapter.content)} words</span>
                                          <span className={chapter.is_submitted ? 'text-green-600' : 'text-yellow-600'}>
                                            {chapter.is_submitted ? 'Submitted' : 'Draft'}
                                          </span>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={!chapter.content}
                                        onClick={() => chapter.content && copyContent(chapter.content, chapter.title)}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  {getBookChapters(book.id).length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      No chapters yet
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      This user has no books
                    </p>
                  )
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Select a user from the sidebar to view their books and chapters
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
