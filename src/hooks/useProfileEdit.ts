import { useState, useCallback } from 'react';
import { userProfileService } from '@/src/services/user-profile.service';
import { UserProfile } from '@/src/types/user';
import * as ImagePicker from 'expo-image-picker';

export interface UseProfileEditReturn {
  isEditing: boolean;
  isLoading: boolean;
  error: string | null;
  bioText: string;
  selectedImageUri: string | null;
  startEditing: () => void;
  cancelEditing: () => void;
  setBioText: (text: string) => void;
  pickImage: () => Promise<void>;
  saveProfile: () => Promise<UserProfile | null>;
  clearError: () => void;
}

export const useProfileEdit = (initialProfile: UserProfile): UseProfileEditReturn => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioText, setBioText] = useState(initialProfile.bio || '');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const startEditing = useCallback(() => {
    setBioText(initialProfile.bio || '');
    setSelectedImageUri(null);
    setError(null);
    setIsEditing(true);
  }, [initialProfile.bio]);

  const cancelEditing = useCallback(() => {
    setBioText(initialProfile.bio || '');
    setSelectedImageUri(null);
    setError(null);
    setIsEditing(false);
  }, [initialProfile.bio]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const pickImage = useCallback(async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access media library is required');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick image');
    }
  }, []);

  const saveProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (isLoading) return null;

    setIsLoading(true);
    setError(null);

    try {
      // Validate bio length (max 160 characters as per database schema)
      if (bioText.length > 160) {
        setError('Bio must be 160 characters or less');
        setIsLoading(false);
        return null;
      }

      const updates = { bio: bioText.trim() };
      const imageUri = selectedImageUri;

      const response = await userProfileService.updateUserProfileWithImage(
        updates,
        imageUri || undefined
      );

      if (response.success && response.data) {
        setIsEditing(false);
        setSelectedImageUri(null);
        setIsLoading(false);
        return response.data;
      } else {
        setError(!response.success ? response.error : 'Failed to update profile');
        setIsLoading(false);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      setIsLoading(false);
      return null;
    }
  }, [isLoading, bioText, selectedImageUri]);

  return {
    isEditing,
    isLoading,
    error,
    bioText,
    selectedImageUri,
    startEditing,
    cancelEditing,
    setBioText,
    pickImage,
    saveProfile,
    clearError,
  };
};