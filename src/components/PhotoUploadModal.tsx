import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { getPhotoLimit } from "@/utils/photoLimits";

interface PhotoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  bookId: string;
  userId: string;
  bookTier: string;
  currentPhotoCount: number;
}

export const PhotoUploadModal = ({
  open,
  onOpenChange,
  chapterId,
  bookId,
  userId,
  bookTier,
  currentPhotoCount,
}: PhotoUploadModalProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  const photoLimit = getPhotoLimit(bookTier);
  const remainingPhotos = photoLimit === Infinity ? Infinity : photoLimit - currentPhotoCount;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check tier limit
    if (remainingPhotos !== Infinity && files.length > remainingPhotos) {
      toast({
        title: "Photo limit exceeded",
        description: `You can only upload ${remainingPhotos} more photo(s) with your current tier.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 5MB limit.`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image file.`,
            variant: "destructive",
          });
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${bookId}/${chapterId}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create database record
        const { error: dbError } = await supabase
          .from('chapter_photos')
          .insert({
            chapter_id: chapterId,
            book_id: bookId,
            user_id: userId,
            file_name: file.name,
            file_size: file.size,
            storage_path: filePath,
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Photos uploaded",
        description: `Successfully uploaded ${files.length} photo(s).`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photos.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Photos to Chapter</DialogTitle>
          <DialogDescription>
            Upload photos to include in this chapter.
            {remainingPhotos === Infinity ? (
              <span className="block mt-1 text-primary font-medium">Unlimited uploads available</span>
            ) : (
              <span className="block mt-1">
                {remainingPhotos} of {photoLimit} photos remaining for this book
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <input
            type="file"
            id="photo-upload"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading || remainingPhotos === 0}
            className="hidden"
          />
          
          <label
            htmlFor="photo-upload"
            className={`w-full ${uploading || remainingPhotos === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              uploading || remainingPhotos === 0
                ? 'border-muted bg-muted/10'
                : 'border-primary/20 hover:border-primary/40 bg-muted/5'
            }`}>
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploading ? 'Uploading...' : remainingPhotos === 0 ? 'Photo limit reached' : 'Click to select photos'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP (Max 5MB each)
              </p>
            </div>
          </label>

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
