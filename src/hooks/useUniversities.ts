import { useState, useEffect } from 'react';
import { UniversityService, GroupedUniversities, UniversityListItem } from '@/src/services/university.service';
import { LoadingState } from '@/src/types/api';

type UseUniversitiesReturn = {
  universities: GroupedUniversities;
  searchResults: UniversityListItem[];
  searchUniversities: (query: string) => Promise<void>;
  isSearching: boolean;
  refreshUniversities: () => Promise<void>;
} & LoadingState;

/**
 * Hook for managing university data and search functionality
 */
export const useUniversities = (): UseUniversitiesReturn => {
  const [universities, setUniversities] = useState<GroupedUniversities>({});
  const [searchResults, setSearchResults] = useState<UniversityListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load universities on mount
  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    setIsLoading(true);
    setError(null);

    const result = await UniversityService.getUniversitiesGroupedByState();

    if (result.success) {
      setUniversities(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const searchUniversities = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const result = await UniversityService.searchUniversities(query);
    
    if (result.success) {
      setSearchResults(result.data);
    } else {
      setError(result.error);
      setSearchResults([]);
    }

    setIsSearching(false);
  };

  const refreshUniversities = async () => {
    await loadUniversities();
  };

  return {
    universities,
    searchResults,
    searchUniversities,
    isSearching,
    refreshUniversities,
    isLoading,
    error,
  };
};