import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { PhotoUploadModal } from './PhotoUploadModal';
import { supabase } from '@/integrations/supabase/client';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Trash2, 
  Edit2, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  Circle,
  GripVertical,
  Check,
  X,
  Camera,
  Utensils
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPhotoLimit } from '@/utils/photoLimits';

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

interface ChapterCardProps {
  chapter: Chapter;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  canDelete: boolean;
  hasConversations?: boolean;
  disabled?: boolean;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  isActive,
  onSelect,
  onDelete,
  onRename,
  canDelete,
  hasConversations = false,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(chapter.title);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [bookTier, setBookTier] = useState<string>('free');
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  // Fetch photo count and book tier
  useEffect(() => {
    const fetchPhotoData = async () => {
      const { count } = await supabase
        .from('chapter_photos')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapter.id);
      
      setPhotoCount(count || 0);

      const { data: bookData } = await supabase
        .from('books')
        .select('tier')
        .eq('id', chapter.book_id)
        .maybeSingle();
      
      if (bookData) setBookTier(bookData.tier);
    };

    fetchPhotoData();
  }, [chapter.id, chapter.book_id, photoModalOpen]);

  const getWordCount = () => {
    if (!chapter.content?.trim()) return 0;
    return chapter.content.trim().split(/\s+/).length;
  };

  const getPageCount = () => {
    const words = getWordCount();
    return Math.ceil(words / 300);
  };

  const getCompletionStatus = () => {
    const words = getWordCount();
    
    // Complete status is only when user has submitted the chapter
    if (chapter.is_submitted) return 'complete';
    
    // If chapter has conversations or content but not submitted, it's a draft
    if (words > 0 || hasConversations) return 'draft';
    
    // No content and no conversations = empty
    return 'empty';
  };

  const getStatusIcon = () => {
    const status = getCompletionStatus();
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'draft':
        return <Circle className="h-3 w-3 text-yellow-500 fill-yellow-100" />;
      default:
        return <Circle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const status = getCompletionStatus();
    const statusConfig = {
      complete: { label: 'Complete', variant: 'default' as const, className: 'bg-green-100 text-green-700 hover:bg-green-100' },
      draft: { label: 'Draft', variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
      empty: { label: 'Empty', variant: 'outline' as const, className: 'bg-muted text-muted-foreground' }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const getContentPreview = () => {
    if (!chapter.content?.trim()) return 'No content yet...';
    const preview = chapter.content.substring(0, 80);
    return preview.length < chapter.content.length ? `${preview}...` : preview;
  };

  const getLastModified = () => {
    const date = new Date(chapter.updated_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const wordCount = getWordCount();
  const pageCount = getPageCount();
  const photoLimit = getPhotoLimit(bookTier);

  const handleSaveRename = () => {
    if (editingTitle.trim() && editingTitle !== chapter.title) {
      onRename(editingTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditingTitle(chapter.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative p-4 rounded-lg border transition-all duration-200 ${
        !isEditing && !disabled && 'cursor-pointer hover:shadow-md hover:border-primary/30'
      } ${
        isActive 
          ? 'bg-primary/5 border-primary shadow-sm' 
          : 'hover:bg-muted/50'
      } ${isDragging ? 'opacity-50 shadow-lg' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={isEditing || disabled ? undefined : onSelect}
    >
      {/* Drag Handle */}
      {!disabled && (
        <div 
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Main Content */}
      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                onClick={handleSaveRename}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                onClick={handleCancelRename}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getStatusIcon()}
                <h3 className="font-medium text-sm truncate">
                  {chapter.title}
                </h3>
              </div>
            </>
          )}
          
          {!isEditing && (
            <div className="flex items-center gap-1">
              {getStatusBadge()}
              
              {/* Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-yellow-100 hover:text-yellow-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    disabled={disabled}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border shadow-md z-50">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename Chapter
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Chapter
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Progress Bar and Add Photos Button */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium">Progress</span>
              <span className="text-[10px]">{wordCount.toLocaleString()} / 2,500 ({Math.min(Math.round((wordCount / 2500) * 100), 100)}%)</span>
            </div>
            <Progress value={Math.min((wordCount / 2500) * 100, 100)} className="h-2" />
          </div>
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs px-3 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setPhotoModalOpen(true);
            }}
          >
            <Camera className="h-3 w-3 mr-1" />
            Add Photos
          </Button>
        </div>

        <PhotoUploadModal
          open={photoModalOpen}
          onOpenChange={setPhotoModalOpen}
          chapterId={chapter.id}
          bookId={chapter.book_id}
          userId={chapter.user_id}
          bookTier={bookTier}
          currentPhotoCount={photoCount}
        />

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              <span>{photoCount}/{photoLimit === Infinity ? '∞' : photoLimit} photos</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{wordCount} words</span>
            </div>
            {pageCount > 0 && (
              <span>• {pageCount} page{pageCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{getLastModified()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};