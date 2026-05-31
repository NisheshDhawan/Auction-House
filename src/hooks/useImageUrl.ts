import { useState, useEffect } from 'react';
import { getImageUrl } from '@/services/localImageStorage';

/**
 * Hook to get a displayable URL for a stored image ID
 * Handles loading state and error handling
 */
export const useImageUrl = (imageId: string | undefined | null) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) {
      setImageUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // If it's already a valid URL (base64, http, or blob), use it directly
    if (imageId.startsWith('data:image/') || imageId.startsWith('http') || imageId.startsWith('blob:')) {
      setImageUrl(imageId);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Handle null, undefined, or string literals
    if (imageId === 'null' || imageId === 'undefined' || imageId === '') {
      setImageUrl(null);
      setIsLoading(false);
      setError('No image available');
      return;
    }

    // For local image IDs, try to fetch from local storage
    const fetchImageUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = await getImageUrl(imageId);
        if (url) {
          setImageUrl(url);
        } else {
          // If not found in local storage, treat as missing image
          setError('Image not found');
          setImageUrl(null);
        }
      } catch (err) {
        setError('Failed to load image');
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageUrl();
  }, [imageId]);

  return { imageUrl, isLoading, error };
};