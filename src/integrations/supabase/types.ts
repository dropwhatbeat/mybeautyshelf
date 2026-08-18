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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      product_reviews: {
        Row: {
          created_at: string
          id: string
          note: string | null
          product_id: string
          rating: number
          user_id: string
          verdict: Database["public"]["Enums"]["review_verdict"]
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          product_id: string
          rating: number
          user_id: string
          verdict: Database["public"]["Enums"]["review_verdict"]
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          product_id?: string
          rating?: number
          user_id?: string
          verdict?: Database["public"]["Enums"]["review_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          category: Database["public"]["Enums"]["product_category"]
          date_added: string
          date_opened: string | null
          id: string
          image_back_url: string | null
          image_front_url: string | null
          ingredients: string[]
          name: string
          notes: string | null
          pao_months: number | null
          size_ml: number | null
          status: Database["public"]["Enums"]["product_status"]
          user_id: string
        }
        Insert: {
          brand?: string
          category?: Database["public"]["Enums"]["product_category"]
          date_added?: string
          date_opened?: string | null
          id?: string
          image_back_url?: string | null
          image_front_url?: string | null
          ingredients?: string[]
          name?: string
          notes?: string | null
          pao_months?: number | null
          size_ml?: number | null
          status?: Database["public"]["Enums"]["product_status"]
          user_id: string
        }
        Update: {
          brand?: string
          category?: Database["public"]["Enums"]["product_category"]
          date_added?: string
          date_opened?: string | null
          id?: string
          image_back_url?: string | null
          image_front_url?: string | null
          ingredients?: string[]
          name?: string
          notes?: string | null
          pao_months?: number | null
          size_ml?: number | null
          status?: Database["public"]["Enums"]["product_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: string | null
          avoid_list: string[]
          concerns: string[]
          created_at: string
          display_name: string | null
          face_shape: string | null
          fitzpatrick: number | null
          id: string
          onboarded: boolean
          pregnancy: string | null
          season_payload: Json | null
          season_result: string | null
          sensitivity: string | null
          skin_type: Database["public"]["Enums"]["skin_type"] | null
          spf_habit: string | null
          undertone: Database["public"]["Enums"]["undertone"] | null
        }
        Insert: {
          age_range?: string | null
          avoid_list?: string[]
          concerns?: string[]
          created_at?: string
          display_name?: string | null
          face_shape?: string | null
          fitzpatrick?: number | null
          id: string
          onboarded?: boolean
          pregnancy?: string | null
          season_payload?: Json | null
          season_result?: string | null
          sensitivity?: string | null
          skin_type?: Database["public"]["Enums"]["skin_type"] | null
          spf_habit?: string | null
          undertone?: Database["public"]["Enums"]["undertone"] | null
        }
        Update: {
          age_range?: string | null
          avoid_list?: string[]
          concerns?: string[]
          created_at?: string
          display_name?: string | null
          face_shape?: string | null
          fitzpatrick?: number | null
          id?: string
          onboarded?: boolean
          pregnancy?: string | null
          season_payload?: Json | null
          season_result?: string | null
          sensitivity?: string | null
          skin_type?: Database["public"]["Enums"]["skin_type"] | null
          spf_habit?: string | null
          undertone?: Database["public"]["Enums"]["undertone"] | null
        }
        Relationships: []
      }
      routines: {
        Row: {
          created_at: string
          id: string
          product_ids: Json
          time_of_day: Database["public"]["Enums"]["time_of_day"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_ids?: Json
          time_of_day: Database["public"]["Enums"]["time_of_day"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_ids?: Json
          time_of_day?: Database["public"]["Enums"]["time_of_day"]
          user_id?: string
        }
        Relationships: []
      }
      skin_checks: {
        Row: {
          created_at: string
          evenness: number | null
          face_shape: string | null
          fine_lines: number
          fitzpatrick: number | null
          hydration: number
          id: string
          notes: Json | null
          oil_cheeks: number | null
          oil_tzone: number | null
          overall: number
          pores: number
          redness: number | null
          season: string | null
          under_eye: number | null
          undertone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          evenness?: number | null
          face_shape?: string | null
          fine_lines: number
          fitzpatrick?: number | null
          hydration: number
          id?: string
          notes?: Json | null
          oil_cheeks?: number | null
          oil_tzone?: number | null
          overall: number
          pores: number
          redness?: number | null
          season?: string | null
          under_eye?: number | null
          undertone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          evenness?: number | null
          face_shape?: string | null
          fine_lines?: number
          fitzpatrick?: number | null
          hydration?: number
          id?: string
          notes?: Json | null
          oil_cheeks?: number | null
          oil_tzone?: number | null
          overall?: number
          pores?: number
          redness?: number | null
          season?: string | null
          under_eye?: number | null
          undertone?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      product_category:
        | "cleanser"
        | "serum"
        | "moisturiser"
        | "spf"
        | "treatment"
        | "makeup"
        | "other"
      product_status: "active" | "finished" | "discarded"
      review_verdict: "repurchase" | "undecided" | "never_again"
      skin_type: "dry" | "oily" | "combination" | "normal" | "sensitive"
      time_of_day: "am" | "pm"
      undertone: "cool" | "neutral" | "warm"
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
      product_category: [
        "cleanser",
        "serum",
        "moisturiser",
        "spf",
        "treatment",
        "makeup",
        "other",
      ],
      product_status: ["active", "finished", "discarded"],
      review_verdict: ["repurchase", "undecided", "never_again"],
      skin_type: ["dry", "oily", "combination", "normal", "sensitive"],
      time_of_day: ["am", "pm"],
      undertone: ["cool", "neutral", "warm"],
    },
  },
} as const
