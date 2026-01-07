import { useState, useEffect } from "react";
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
import { Upload, X, Trash2, Loader2 } from "lucide-react";
import { getPhotoLimit } from "@/utils/photoLimits";

interface Photo {
  id: string;
  file_name: string;
  storage_path: string;
}

interface PhotoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  bookId: string;
  userId: string;
  bookTier: string;
  currentPhotoCount: number;
  onPhotoCountChange?: () => void;
}

export const PhotoUploadModal = ({
  open,
  onOpenChange,
  chapterId,
  bookId,
  userId,
  bookTier,
  currentPhotoCount,
  onPhotoCountChange,
}: PhotoUploadModalProps) => {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const photoLimit = getPhotoLimit(bookTier);
  const remainingPhotos = photoLimit === Infinity ? Infinity : photoLimit - currentPhotoCount;

  // Fetch existing photos when modal opens
  useEffect(() => {
    if (open) {
      fetchPhotos();
    }
  }, [open, chapterId]);

  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('chapter_photos')
        .select('id, file_name, storage_path')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleDeletePhoto = async (photo: Photo) => {
    setDeletingPhotoId(photo.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('chapter_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      // Update local state
      setPhotos(photos.filter(p => p.id !== photo.id));
      onPhotoCountChange?.();

      toast({
        title: "Photo deleted",
        description: "The photo has been removed.",
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete photo.",
        variant: "destructive",
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

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
      const newPhotos: Photo[] = [];

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
        const { data: photoData, error: dbError } = await supabase
          .from('chapter_photos')
          .insert({
            chapter_id: chapterId,
            book_id: bookId,
            user_id: userId,
            file_name: file.name,
            file_size: file.size,
            storage_path: filePath,
          })
          .select('id, file_name, storage_path')
          .single();

        if (dbError) throw dbError;
        if (photoData) newPhotos.push(photoData);
      }

      // Update local state with new photos
      setPhotos([...newPhotos, ...photos]);
      onPhotoCountChange?.();

      toast({
        title: "Photos uploaded",
        description: `Successfully uploaded ${newPhotos.length} photo(s).`,
      });

      // Reset the input
      event.target.value = '';
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Photos</DialogTitle>
          <DialogDescription>
            Upload or remove photos for this chapter.
            {remainingPhotos === Infinity ? (
              <span className="block mt-1 text-primary font-medium">Unlimited uploads available</span>
            ) : (
              <span className="block mt-1">
                {remainingPhotos} of {photoLimit} photos remaining for this book
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Upload Section */}
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
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              uploading || remainingPhotos === 0
                ? 'border-muted bg-muted/10'
                : 'border-primary/20 hover:border-primary/40 bg-muted/5'
            }`}>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploading ? 'Uploading...' : remainingPhotos === 0 ? 'Photo limit reached' : 'Click to upload photos'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP (Max 5MB each)
              </p>
            </div>
          </label>

          {/* Existing Photos Section */}
          {loadingPhotos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : photos.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Your Photos ({photos.length})
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={getPhotoUrl(photo.storage_path)}
                      alt={photo.file_name}
                      className="w-full aspect-square object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo)}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute top-1 right-1 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      title="Delete photo"
                    >
                      {deletingPhotoId === photo.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No photos uploaded yet
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
