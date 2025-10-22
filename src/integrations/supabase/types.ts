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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_plans: {
        Row: {
          created_at: string
          date: string
          hairstyle: string | null
          id: string
          image_url: string | null
          items: Json
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hairstyle?: string | null
          id?: string
          image_url?: string | null
          items?: Json
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hairstyle?: string | null
          id?: string
          image_url?: string | null
          items?: Json
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      garments: {
        Row: {
          acquired_date: string | null
          brand: string | null
          care_instructions: string | null
          color: string | null
          created_at: string | null
          currency: string | null
          id: string
          image_url: string
          last_worn_date: string | null
          liked: boolean | null
          material: string | null
          notes: string | null
          official_price: number | null
          season: string | null
          type: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
          washing_frequency: string | null
        }
        Insert: {
          acquired_date?: string | null
          brand?: string | null
          care_instructions?: string | null
          color?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url: string
          last_worn_date?: string | null
          liked?: boolean | null
          material?: string | null
          notes?: string | null
          official_price?: number | null
          season?: string | null
          type: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          washing_frequency?: string | null
        }
        Update: {
          acquired_date?: string | null
          brand?: string | null
          care_instructions?: string | null
          color?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string
          last_worn_date?: string | null
          liked?: boolean | null
          material?: string | null
          notes?: string | null
          official_price?: number | null
          season?: string | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          washing_frequency?: string | null
        }
        Relationships: []
      }
      ootd_records: {
        Row: {
          created_at: string | null
          date: string
          garment_ids: string[] | null
          id: string
          location: string | null
          notes: string | null
          photo_url: string
          products: Json | null
          saved_outfit_id: string | null
          user_id: string
          weather: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          garment_ids?: string[] | null
          id?: string
          location?: string | null
          notes?: string | null
          photo_url: string
          products?: Json | null
          saved_outfit_id?: string | null
          user_id: string
          weather?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          garment_ids?: string[] | null
          id?: string
          location?: string | null
          notes?: string | null
          photo_url?: string
          products?: Json | null
          saved_outfit_id?: string | null
          user_id?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ootd_records_saved_outfit_id_fkey"
            columns: ["saved_outfit_id"]
            isOneToOne: false
            referencedRelation: "saved_outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bra_cup: string | null
          bust_cm: number | null
          clothing_size: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          eye_color: string | null
          full_name: string | null
          gender: string | null
          geo_location: string | null
          hair_color: string | null
          height_cm: number | null
          hip_cm: number | null
          id: string
          shoe_size: number | null
          style_preference: string | null
          updated_at: string | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          bra_cup?: string | null
          bust_cm?: number | null
          clothing_size?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          eye_color?: string | null
          full_name?: string | null
          gender?: string | null
          geo_location?: string | null
          hair_color?: string | null
          height_cm?: number | null
          hip_cm?: number | null
          id: string
          shoe_size?: number | null
          style_preference?: string | null
          updated_at?: string | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          bra_cup?: string | null
          bust_cm?: number | null
          clothing_size?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          eye_color?: string | null
          full_name?: string | null
          gender?: string | null
          geo_location?: string | null
          hair_color?: string | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          shoe_size?: number | null
          style_preference?: string | null
          updated_at?: string | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      saved_outfits: {
        Row: {
          created_at: string
          hairstyle: string | null
          id: string
          image_url: string | null
          items: Json
          liked: boolean | null
          summary: string | null
          title: string
          trend_id: string | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          hairstyle?: string | null
          id?: string
          image_url?: string | null
          items?: Json
          liked?: boolean | null
          summary?: string | null
          title: string
          trend_id?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          hairstyle?: string | null
          id?: string
          image_url?: string | null
          items?: Json
          liked?: boolean | null
          summary?: string | null
          title?: string
          trend_id?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_outfits_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      todays_picks: {
        Row: {
          added_to_ootd: boolean
          created_at: string
          date: string
          hairstyle: string | null
          id: string
          image_url: string | null
          is_liked: boolean
          items: Json
          summary: string | null
          title: string
          updated_at: string
          user_id: string
          weather: Json | null
        }
        Insert: {
          added_to_ootd?: boolean
          created_at?: string
          date?: string
          hairstyle?: string | null
          id?: string
          image_url?: string | null
          is_liked?: boolean
          items?: Json
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
          weather?: Json | null
        }
        Update: {
          added_to_ootd?: boolean
          created_at?: string
          date?: string
          hairstyle?: string | null
          id?: string
          image_url?: string | null
          is_liked?: boolean
          items?: Json
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          weather?: Json | null
        }
        Relationships: []
      }
      trends: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          hairstyle: string | null
          id: string
          image_url: string | null
          items: Json | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
          weather: Json | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          hairstyle?: string | null
          id?: string
          image_url?: string | null
          items?: Json | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
          weather?: Json | null
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          hairstyle?: string | null
          id?: string
          image_url?: string | null
          items?: Json | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          weather?: Json | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          full_body_photo_url: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_body_photo_url?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_body_photo_url?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          id: string
          user_id: string
          first_login_at: string
          last_login_at: string
          login_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_login_at?: string
          last_login_at?: string
          login_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_login_at?: string
          last_login_at?: string
          login_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_user_login_activity: {
        Args: {
          user_uuid?: string | null
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
    Enums: {},
  },
} as const
