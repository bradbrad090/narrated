import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  GripVertical 
} from 'lucide-react';

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

interface ChapterCardProps {
  chapter: Chapter;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  isActive,
  onSelect,
  onDelete,
  canDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);

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
    if (words === 0) return 'empty';
    if (words < 100) return 'draft';
    if (words < 500) return 'in-progress';
    return 'complete';
  };

  const getStatusIcon = () => {
    const status = getCompletionStatus();
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'in-progress':
        return <Circle className="h-3 w-3 text-blue-500 fill-blue-100" />;
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
      'in-progress': { label: 'In Progress', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
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

  return (
    <div
      className={`group relative p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/30 ${
        isActive 
          ? 'bg-primary/5 border-primary shadow-sm' 
          : 'hover:bg-muted/50'
      }`}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      </div>

      {/* Main Content */}
      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon()}
            <h3 className="font-medium text-sm truncate">
              {chapter.title}
            </h3>
          </div>
          
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
        </div>

        {/* Content Preview */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {getContentPreview()}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
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

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-muted rounded-full h-1">
          <div 
            className={`h-1 rounded-full transition-all duration-300 ${
              wordCount === 0 ? 'w-0' :
              wordCount < 100 ? 'w-1/4 bg-yellow-400' :
              wordCount < 500 ? 'w-1/2 bg-blue-400' :
              'w-full bg-green-400'
            }`}
          />
        </div>
      </div>
    </div>
  );
};