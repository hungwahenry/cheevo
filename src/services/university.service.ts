import { supabase } from '@/lib/supabase';
import { Tables } from '@/src/types/database.generated';
import { ApiResponse } from '@/src/types/api';

type University = Tables<'universities'>;

export type UniversityListItem = {
  id: number;
  name: string;
  state: string;
};

export type GroupedUniversities = {
  [state: string]: UniversityListItem[];
};

export class UniversityService {
  /**
   * Get all universities grouped by state
   */
  static async getUniversitiesGroupedByState(): Promise<ApiResponse<GroupedUniversities>> {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, state')
        .order('state', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No universities found' };
      }

      // Group universities by state
      const grouped = data.reduce((acc: GroupedUniversities, university) => {
        const uni = university as UniversityListItem;
        if (!acc[uni.state]) {
          acc[uni.state] = [];
        }
        acc[uni.state].push(uni);
        return acc;
      }, {});

      return { success: true, data: grouped };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch universities'
      };
    }
  }

  /**
   * Search universities by name
   */
  static async searchUniversities(query: string): Promise<ApiResponse<UniversityListItem[]>> {
    try {
      if (!query.trim()) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from('universities')
        .select('id, name, state')
        .ilike('name', `%${query.trim()}%`)
        .order('name', { ascending: true })
        .limit(20);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search universities'
      };
    }
  }

  /**
   * Get university by ID
   */
  static async getUniversityById(id: number): Promise<ApiResponse<University>> {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'University not found' };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch university'
      };
    }
  }
}