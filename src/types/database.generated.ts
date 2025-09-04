
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          category: string
          description: string | null
          id: number
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          id?: number
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: number
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          giphy_url: string | null
          id: number
          is_flagged: boolean | null
          moderation_score: Json | null
          parent_comment_id: number | null
          post_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          giphy_url?: string | null
          id?: number
          is_flagged?: boolean | null
          moderation_score?: Json | null
          parent_comment_id?: number | null
          post_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          giphy_url?: string | null
          id?: number
          is_flagged?: boolean | null
          moderation_score?: Json | null
          parent_comment_id?: number | null
          post_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_user_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_config: {
        Row: {
          applies_to: string
          auto_action: Database["public"]["Enums"]["moderation_action"]
          category: string
          created_at: string
          id: number
          threshold: number
          updated_at: string
        }
        Insert: {
          applies_to?: string
          auto_action?: Database["public"]["Enums"]["moderation_action"]
          category: string
          created_at?: string
          id?: number
          threshold: number
          updated_at?: string
        }
        Update: {
          applies_to?: string
          auto_action?: Database["public"]["Enums"]["moderation_action"]
          category?: string
          created_at?: string
          id?: number
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      moderation_logs: {
        Row: {
          action_taken: Database["public"]["Enums"]["moderation_action"]
          content_id: number
          content_text: string
          content_type: Database["public"]["Enums"]["content_type"]
          flagged: boolean
          id: number
          openai_response: Json
          processed_at: string
        }
        Insert: {
          action_taken: Database["public"]["Enums"]["moderation_action"]
          content_id: number
          content_text: string
          content_type: Database["public"]["Enums"]["content_type"]
          flagged: boolean
          id?: number
          openai_response: Json
          processed_at?: string
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["moderation_action"]
          content_id?: number
          content_text?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          flagged?: boolean
          id?: number
          openai_response?: Json
          processed_at?: string
        }
        Relationships: []
      }
      post_views: {
        Row: {
          id: number
          post_id: number
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: number
          post_id: number
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: number
          post_id?: number
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string
          giphy_url: string | null
          id: number
          is_flagged: boolean | null
          is_trending: boolean | null
          moderation_score: Json | null
          reactions_count: number | null
          trending_score: number | null
          university_id: number
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string
          giphy_url?: string | null
          id?: number
          is_flagged?: boolean | null
          is_trending?: boolean | null
          moderation_score?: Json | null
          reactions_count?: number | null
          trending_score?: number | null
          university_id: number
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string
          giphy_url?: string | null
          id?: number
          is_flagged?: boolean | null
          is_trending?: boolean | null
          moderation_score?: Json | null
          reactions_count?: number | null
          trending_score?: number | null
          university_id?: number
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_user_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          id: number
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          post_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_user_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: number
          reason: string
          reported_content_id: number
          reported_content_type: Database["public"]["Enums"]["content_type"]
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"] | null
        }
        Insert: {
          created_at?: string
          id?: number
          reason: string
          reported_content_id: number
          reported_content_type: Database["public"]["Enums"]["content_type"]
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
        }
        Update: {
          created_at?: string
          id?: number
          reason?: string
          reported_content_id?: number
          reported_content_type?: Database["public"]["Enums"]["content_type"]
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
        }
        Relationships: []
      }
      universities: {
        Row: {
          created_at: string
          id: number
          name: string
          short_name: string | null
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          short_name?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          short_name?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_ban_history: {
        Row: {
          ban_duration_days: number
          created_at: string
          id: number
          moderation_score: Json | null
          user_id: string
          violation_type: string
        }
        Insert: {
          ban_duration_days: number
          created_at?: string
          id?: number
          moderation_score?: Json | null
          user_id: string
          violation_type: string
        }
        Update: {
          ban_duration_days?: number
          created_at?: string
          id?: number
          moderation_score?: Json | null
          user_id?: string
          violation_type?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          ban_duration_days: number | null
          ban_type: Database["public"]["Enums"]["ban_type"]
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: number
          is_active: boolean | null
          reason: string
          user_id: string
          violation_count: number | null
        }
        Insert: {
          ban_duration_days?: number | null
          ban_type: Database["public"]["Enums"]["ban_type"]
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          reason: string
          user_id: string
          violation_count?: number | null
        }
        Update: {
          ban_duration_days?: number | null
          ban_type?: Database["public"]["Enums"]["ban_type"]
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          reason?: string
          user_id?: string
          violation_count?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          comments_count: number | null
          created_at: string
          email: string
          id: string
          posts_count: number | null
          reactions_received: number | null
          total_views: number | null
          trending_score: number | null
          university_id: number
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          comments_count?: number | null
          created_at?: string
          email: string
          id: string
          posts_count?: number | null
          reactions_received?: number | null
          total_views?: number | null
          trending_score?: number | null
          university_id: number
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          comments_count?: number | null
          created_at?: string
          email?: string
          id?: string
          posts_count?: number | null
          reactions_received?: number | null
          total_views?: number | null
          trending_score?: number | null
          university_id?: number
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_post_trending: {
        Args: { post_id_param: number }
        Returns: undefined
      }
      check_username_availability: {
        Args: { username_to_check: string }
        Returns: boolean
      }
      create_user_profile: {
        Args: {
          email_param: string
          university_id_param: number
          user_uuid: string
          username_param: string
        }
        Returns: undefined
      }
      expire_user_bans: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_avatar_url: {
        Args: { seed: string }
        Returns: string
      }
      update_user_stats: {
        Args: { user_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      ban_type: "shadow_ban" | "permanent_ban"
      content_type: "post" | "comment"
      moderation_action: "approved" | "removed" | "manual_review"
      report_status: "pending" | "reviewed" | "dismissed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ban_type: ["shadow_ban", "permanent_ban"],
      content_type: ["post", "comment"],
      moderation_action: ["approved", "removed", "manual_review"],
      report_status: ["pending", "reviewed", "dismissed"],
    },
  },
} as const
