import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Copy, LogOut, Search, Filter, Home, Image, Download } from 'lucide-react';

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

interface PhotoData {
  id: string;
  book_id: string;
  chapter_id: string;
  storage_path: string;
  file_name: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [books, setBooks] = useState<BookData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);

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
    // Load all users, books, chapters, and photos in parallel
    const [usersResult, booksResult, chaptersResult, photosResult] = await Promise.all([
      supabase.from('users').select('id, email, full_name').order('created_at', { ascending: false }),
      supabase.from('books').select('id, title, user_id, tier, status, created_at').order('created_at', { ascending: false }),
      supabase.from('chapters').select('id, book_id, title, chapter_number, content, status, is_submitted').order('chapter_number', { ascending: true }),
      supabase.from('chapter_photos').select('id, book_id, chapter_id, storage_path, file_name')
    ]);

    if (usersResult.data) setUsers(usersResult.data);
    if (booksResult.data) setBooks(booksResult.data);
    if (chaptersResult.data) setChapters(chaptersResult.data);
    if (photosResult.data) setPhotos(photosResult.data);
  };

  // Filter out free tier books - they shouldn't be submitted for delivery
  const getUserBooks = (userId: string) => books.filter(b => b.user_id === userId && b.tier !== 'free');
  const getBookChapters = (bookId: string) => chapters.filter(c => c.book_id === bookId);
  const getBookPhotos = (bookId: string) => photos.filter(p => p.book_id === bookId);

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const downloadAllPhotos = async (bookId: string, bookTitle: string) => {
    const bookPhotos = getBookPhotos(bookId);
    if (bookPhotos.length === 0) {
      toast.error('No photos to download');
      return;
    }

    toast.info(`Downloading ${bookPhotos.length} photo(s)...`);
    
    for (const photo of bookPhotos) {
      try {
        const url = getPhotoUrl(photo.storage_path);
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = photo.file_name;
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error('Failed to download:', photo.file_name, error);
      }
    }
    
    toast.success(`Downloaded ${bookPhotos.length} photo(s) from "${bookTitle || 'Untitled Book'}"`);
  };

  // Check if a user has any completed books (all chapters submitted)
  const hasCompletedBook = (userId: string) => {
    const userBooks = getUserBooks(userId);
    return userBooks.some(book => {
      const bookChapters = getBookChapters(book.id);
      return bookChapters.length > 0 && bookChapters.every(c => c.is_submitted);
    });
  };

  // Filter users based on search, completion filter, and having books
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Hide users with no paid books
      const userBooks = getUserBooks(user.id);
      if (userBooks.length === 0) return false;
      
      const matchesSearch = !searchQuery || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = !filterCompleted || hasCompletedBook(user.id);
      
      return matchesSearch && matchesFilter;
    });
  }, [users, books, chapters, searchQuery, filterCompleted]);

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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Users Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Users</CardTitle>
              <div className="space-y-2 mt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  variant={filterCompleted ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setFilterCompleted(!filterCompleted)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {filterCompleted ? 'Showing Completed' : 'Filter Completed'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredUsers.map(user => (
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
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      {getUserBooks(user.id).length} book(s)
                      {hasCompletedBook(user.id) && (
                        <span className="text-green-600 font-medium">✓ Completed</span>
                      )}
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found
                  </p>
                )}
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
                                <div className="flex justify-end gap-2 mb-3">
                                  {getBookPhotos(book.id).length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadAllPhotos(book.id, book.title || 'Untitled Book');
                                      }}
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download Photos ({getBookPhotos(book.id).length})
                                    </Button>
                                  )}
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
                                {/* Photos Grid */}
                                {getBookPhotos(book.id).length > 0 && (
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Image className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">Photos</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                      {getBookPhotos(book.id).map(photo => (
                                        <a
                                          key={photo.id}
                                          href={getPhotoUrl(photo.storage_path)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                                        >
                                          <img
                                            src={getPhotoUrl(photo.storage_path)}
                                            alt={photo.file_name}
                                            className="w-full h-full object-cover"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
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
