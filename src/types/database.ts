export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          is_active?: boolean
          name: string
          slug: string
          sort_order: number
        }
        Update: {
          id?: never
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      daily_confirmations: {
        Row: {
          confirmed_date: string
          created_at: string
          goal_id: string
          id: string
          user_id: string
        }
        Insert: {
          confirmed_date: string
          created_at?: string
          goal_id: string
          id?: string
          user_id: string
        }
        Update: {
          confirmed_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_confirmations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_confirmations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals_with_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emoji_reactions: {
        Row: {
          created_at: string
          emoji: Database["public"]["Enums"]["emoji_type"]
          from_user_id: string
          goal_id: string
          id: string
          reaction_date: string
        }
        Insert: {
          created_at?: string
          emoji: Database["public"]["Enums"]["emoji_type"]
          from_user_id: string
          goal_id: string
          id?: string
          reaction_date?: string
        }
        Update: {
          created_at?: string
          emoji?: Database["public"]["Enums"]["emoji_type"]
          from_user_id?: string
          goal_id?: string
          id?: string
          reaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "emoji_reactions_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emoji_reactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emoji_reactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals_with_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          error_message: string
          function_name: string
          id: string
          severity: Database["public"]["Enums"]["log_severity"]
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_message: string
          function_name: string
          id?: string
          severity?: Database["public"]["Enums"]["log_severity"]
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_message?: string
          function_name?: string
          id?: string
          severity?: Database["public"]["Enums"]["log_severity"]
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          is_enabled: boolean
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          description?: string | null
          is_enabled?: boolean
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          description?: string | null
          is_enabled?: boolean
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: number
          created_at: string
          id: string
          is_deleted: boolean
          is_public: boolean
          started_at: string
          target_days: number | null
          target_value: number | null
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          unit_custom: string | null
          unit_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: number
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_public?: boolean
          started_at: string
          target_days?: number | null
          target_value?: number | null
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          unit_custom?: string | null
          unit_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: number
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_public?: boolean
          started_at?: string
          target_days?: number | null
          target_value?: number | null
          title?: string
          type?: Database["public"]["Enums"]["goal_type"]
          unit_custom?: string | null
          unit_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones_sent: {
        Row: {
          goal_id: string
          id: string
          milestone_key: string
          notified_at: string
        }
        Insert: {
          goal_id: string
          id?: string
          milestone_key: string
          notified_at?: string
        }
        Update: {
          goal_id?: string
          id?: string
          milestone_key?: string
          notified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_sent_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_sent_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals_with_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          expo_ticket_id: string | null
          goal_id: string | null
          id: string
          opened_at: string | null
          payload: Json | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notif_status"]
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_ticket_id?: string | null
          goal_id?: string | null
          id?: string
          opened_at?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"]
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          expo_ticket_id?: string | null
          goal_id?: string | null
          id?: string
          opened_at?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"]
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals_with_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          created_at: string
          id: number
          is_predefined: boolean
          name: string
          sort_order: number | null
          symbol: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          is_predefined?: boolean
          name: string
          sort_order?: number | null
          symbol?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          is_predefined?: boolean
          name?: string
          sort_order?: number | null
          symbol?: string | null
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_name: string | null
          expo_push_token: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          expo_push_token: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          expo_push_token?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          platform?: Database["public"]["Enums"]["device_platform"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      value_entries: {
        Row: {
          created_at: string
          entry_date: string
          goal_id: string
          id: string
          note: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          entry_date?: string
          goal_id: string
          id?: string
          note?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          goal_id?: string
          id?: string
          note?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "value_entries_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_entries_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals_with_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      goals_with_progress: {
        Row: {
          category_id: number | null
          completed_in_days: number | null
          created_at: string | null
          id: string | null
          is_completed: boolean | null
          is_deleted: boolean | null
          is_public: boolean | null
          progress: number | null
          progress_ratio: number | null
          started_at: string | null
          target_days: number | null
          target_value: number | null
          title: string | null
          type: Database["public"]["Enums"]["goal_type"] | null
          unit_custom: string | null
          unit_id: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_goal: { Args: { p_goal_id: string }; Returns: boolean }
    }
    Enums: {
      device_platform: "ios" | "android"
      emoji_type: "thumbs_up" | "heart" | "muscle" | "cheers" | "tada"
      goal_type: "daily" | "value"
      log_severity: "info" | "warning" | "error" | "critical"
      notif_status: "pending" | "sent" | "failed" | "delivered"
      notification_type:
        | "daily_reminder"
        | "daily_reminder_followup"
        | "value_inactivity"
        | "milestone_achieved"
        | "friend_milestone"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      device_platform: ["ios", "android"],
      emoji_type: ["thumbs_up", "heart", "muscle", "cheers", "tada"],
      goal_type: ["daily", "value"],
      log_severity: ["info", "warning", "error", "critical"],
      notif_status: ["pending", "sent", "failed", "delivered"],
      notification_type: [
        "daily_reminder",
        "daily_reminder_followup",
        "value_inactivity",
        "milestone_achieved",
        "friend_milestone",
      ],
    },
  },
} as const

