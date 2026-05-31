// Image upload service

export interface ImageUploadResult {
  url: string;
  success: boolean;
  error?: string;
}

import { storeImage } from './localImageStorage';

/**
 * Upload an image file and convert to base64 data URL
 * This allows images to be stored directly in the database and shared across all users
 */
export const uploadImage = async (file: File): Promise<ImageUploadResult> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        url: '',
        success: false,
        error: 'Invalid file type. Please select an image file.'
      };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        url: '',
        success: false,
        error: 'File too large. Please select an image smaller than 5MB.'
      };
    }

    // Convert image to base64 data URL
    const base64DataUrl = await createImagePreview(file);
    
    return {
      url: base64DataUrl, // Return base64 data URL directly
      success: true
    };
  } catch (error) {
    return {
      url: '',
      success: false,
      error: 'Upload failed. Please try again.'
    };
  }
};

/**
 * Validate image file before upload
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Invalid file type. Please select an image file.'
    };
  }

  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File too large. Please select an image smaller than 5MB.'
    };
  }

  return { valid: true };
};

/**
 * Create a preview URL for an image file
 */
export const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};