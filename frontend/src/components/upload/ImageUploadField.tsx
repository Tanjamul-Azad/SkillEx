import { FC, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { UserService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  /** Current image URL (relative `/uploads/...` or absolute). */
  value?: string | null;
  /** Called with the uploaded URL, or null when cleared. */
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  /** Aspect ratio of the preview box. */
  aspect?: 'video' | 'square' | 'banner';
  className?: string;
}

const ASPECT_CLASS: Record<NonNullable<Props['aspect']>, string> = {
  video: 'aspect-video',
  square: 'aspect-square',
  banner: 'aspect-[3/1]',
};

/**
 * Drop-in cover/image picker. Uploads via POST /api/upload (userService.uploadFile)
 * and hands the returned URL back through onChange. Shared by group sessions,
 * community circles, and discussions.
 */
export const ImageUploadField: FC<Props> = ({
  value,
  onChange,
  label = 'Cover image',
  hint = 'JPG, PNG, WebP or GIF · up to 5MB',
  aspect = 'video',
  className,
}) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const previewSrc = value
    ? (value.startsWith('http') || value.startsWith('data:') ? value : value)
    : null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Pick an image file', description: 'JPG, PNG, WebP or GIF.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ variant: 'destructive', title: 'Image too large', description: 'Maximum size is 5MB.' });
      return;
    }
    setUploading(true);
    try {
      const { url } = await UserService.uploadFile(file);
      onChange(url);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-sm font-medium">{label}</label>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {previewSrc ? (
        <div className={cn('group relative overflow-hidden rounded-xl border border-border/60', ASPECT_CLASS[aspect])}>
          <img src={previewSrc} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-white"
            >
              {uploading ? 'Uploading…' : 'Change'}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="grid h-7 w-7 place-items-center rounded-lg bg-black/60 text-white hover:bg-black/80"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground',
            ASPECT_CLASS[aspect],
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <ImagePlus className="h-6 w-6 text-primary" />
          )}
          <span className="text-sm font-semibold">{uploading ? 'Uploading…' : 'Upload an image'}</span>
          {hint && <span className="text-[11px]">{hint}</span>}
        </button>
      )}
    </div>
  );
};
