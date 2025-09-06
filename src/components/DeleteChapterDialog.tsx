import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapter_number: number;
}

interface DeleteChapterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: Chapter | null;
  onConfirmDelete: (chapterId: string) => void;
  isDeleting?: boolean;
}

export const DeleteChapterDialog: React.FC<DeleteChapterDialogProps> = ({
  isOpen,
  onOpenChange,
  chapter,
  onConfirmDelete,
  isDeleting = false
}) => {
  if (!chapter) return null;

  const getPreviewText = () => {
    if (!chapter.content || chapter.content.trim() === '') {
      return 'Empty chapter - no content written yet.';
    }
    
    const preview = chapter.content.substring(0, 150);
    return preview.length < chapter.content.length ? `${preview}...` : preview;
  };

  const getWordCount = () => {
    if (!chapter.content || chapter.content.trim() === '') return 0;
    return chapter.content.trim().split(/\s+/).length;
  };

  const wordCount = getWordCount();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Chapter
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Are you sure you want to permanently delete this chapter?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Chapter Preview */}
        <div className="my-4">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Chapter Preview:
          </div>
          <div className="bg-muted/50 p-3 rounded-md border">
            <div className="font-medium text-sm mb-1">
              {chapter.title}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {wordCount} {wordCount === 1 ? 'word' : 'words'} • Chapter {chapter.chapter_number}
            </div>
            <div className="text-sm text-muted-foreground italic">
              "{getPreviewText()}"
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-destructive mb-1">
              This action cannot be undone
            </div>
            <div className="text-muted-foreground">
              The chapter and all its content will be permanently removed from your book. 
              Any conversations or AI-generated content associated with this chapter will also be deleted.
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirmDelete(chapter.id)}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Chapter'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};