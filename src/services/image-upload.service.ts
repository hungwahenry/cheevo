import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/src/types/api';

export interface UploadImageResponse {
  url: string;
  path: string;
}

class ImageUploadService {
  private readonly PROFILE_PICTURES_BUCKET = 'profile-pictures';
  
  /**
   * Upload profile picture to Supabase storage
   * @param userId - User ID for organizing uploads
   * @param imageUri - Local image URI from image picker
   * @param fileName - Original file name (optional)
   */
  async uploadProfilePicture(
    userId: string,
    imageUri: string,
    fileName?: string
  ): Promise<ApiResponse<UploadImageResponse>> {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      // Create file name with timestamp to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = fileName?.split('.').pop() || 'jpg';
      const filePath = `${userId}/avatar_${timestamp}.${fileExtension}`;

      // For React Native, we need to read the file as ArrayBuffer
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error('Failed to read image file');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.PROFILE_PICTURES_BUCKET)
        .upload(filePath, fileData, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { success: false, error: uploadError.message || 'Failed to upload image' };
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from(this.PROFILE_PICTURES_BUCKET)
        .getPublicUrl(uploadData.path);

      return {
        success: true,
        data: {
          url: urlData.publicUrl,
          path: uploadData.path,
        },
      };
    } catch (error) {
      console.error('Image upload service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload image',
      };
    }
  }

  /**
   * Delete profile picture from storage
   * @param filePath - The storage path to delete
   */
  async deleteProfilePicture(filePath: string): Promise<ApiResponse<boolean>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase.storage
        .from(this.PROFILE_PICTURES_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message || 'Failed to delete image' };
      }

      return { success: true, data: true };
    } catch (error) {
      console.error('Image delete service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete image',
      };
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param url - Original image URL
   * @param options - Transformation options
   */
  getOptimizedImageUrl(
    url: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
    } = {}
  ): string {
    if (!url.includes('supabase')) {
      return url; // Return as-is if not a Supabase URL
    }

    const { width = 200, height = 200, quality = 80 } = options;
    
    // Add Supabase image transformation parameters
    const transformParams = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      resize: 'cover',
      quality: quality.toString(),
    });

    return `${url}?${transformParams.toString()}`;
  }
}

export const imageUploadService = new ImageUploadService();