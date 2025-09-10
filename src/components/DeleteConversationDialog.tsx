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
import { ConversationSession } from '@/types/conversation';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConversationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  session: ConversationSession | null;
  onConfirmDelete: (session: ConversationSession) => void;
  isDeleting?: boolean;
}

export const DeleteConversationDialog: React.FC<DeleteConversationDialogProps> = ({
  isOpen,
  onOpenChange,
  session,
  onConfirmDelete,
  isDeleting = false
}) => {
  if (!session) return null;

  const getConversationTypeLabel = () => {
    return `${session.conversationMedium} conversation`;
  };

  const getPreviewText = () => {
    if (session.messages.length === 0) return 'Empty conversation';
    
    const firstMessage = session.messages[0];
    const preview = firstMessage.content.substring(0, 80);
    return preview.length < firstMessage.content.length ? `${preview}...` : preview;
  };

  const handleConfirm = () => {
    onConfirmDelete(session);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Conversation
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to permanently delete this {getConversationTypeLabel()}?
              </p>
              
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Conversation Preview:</p>
                <p className="text-sm text-muted-foreground italic">
                  "{getPreviewText()}"
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <span>{session.messages.length} messages</span>
                  <span>
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <p className="text-sm text-destructive font-medium mb-1">
                  ⚠️ This action cannot be undone
                </p>
                <p className="text-sm text-muted-foreground">
                  The conversation and all its messages will be permanently removed from your account.
                  Any drafts associated with this conversation will also be deleted.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Conversation
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};