import { Package, Loader2 } from 'lucide-react';
import { useImageUrl } from '@/hooks/useImageUrl';

interface ImageDisplayProps {
  imageId?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  showLoader?: boolean;
}

export const ImageDisplay = ({ 
  imageId, 
  alt, 
  className = "w-full h-full object-cover", 
  fallbackClassName = "w-full h-full flex items-center justify-center bg-muted",
  showLoader = true
}: ImageDisplayProps) => {
  const { imageUrl, isLoading, error } = useImageUrl(imageId);

  if (isLoading && showLoader) {
    return (
      <div className={fallbackClassName}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={fallbackClassName}>
        <Package className="h-12 w-12 text-primary/60" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={(e) => {
        console.error('Image failed to load:', imageUrl);
        // Hide the image and show fallback
        const target = e.currentTarget;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent) {
          const fallback = document.createElement('div');
          fallback.className = fallbackClassName;
          fallback.innerHTML = '<svg class="h-12 w-12 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
          parent.appendChild(fallback);
        }
      }}
    />
  );
};