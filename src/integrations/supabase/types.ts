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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_chapter_metadata: {
        Row: {
          book_id: string
          chapter_id: string
          conversation_id: string | null
          created_at: string
          generated_at: string
          id: number
          model_used: string
          profile_id: string | null
          prompt_version: string
          source_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id: string
          conversation_id?: string | null
          created_at?: string
          generated_at?: string
          id?: number
          model_used: string
          profile_id?: string | null
          prompt_version: string
          source_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string
          conversation_id?: string | null
          created_at?: string
          generated_at?: string
          id?: number
          model_used?: string
          profile_id?: string | null
          prompt_version?: string
          source_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chapter_metadata_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chapter_metadata_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chapter_metadata_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_histories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chapter_metadata_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "book_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chapter_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      book_profiles: {
        Row: {
          birth_date: string | null
          birth_year: number | null
          birthplace: string | null
          book_id: string
          career_highlights: string[] | null
          challenges_overcome: string[] | null
          children_count: number | null
          created_at: string
          cultural_background: string | null
          current_location: string | null
          education: string | null
          family_background: string | null
          first_job: string | null
          full_name: string | null
          hobbies_interests: string[] | null
          id: string
          key_life_events: string[] | null
          languages_spoken: string[] | null
          life_philosophy: string | null
          life_themes: string[] | null
          marital_status: string | null
          memorable_quotes: string[] | null
          nicknames: string[] | null
          occupation: string | null
          parents_occupations: string | null
          personality_traits: string[] | null
          relationships_family: string | null
          siblings_count: number | null
          updated_at: string
          user_id: string
          values_beliefs: string | null
        }
        Insert: {
          birth_date?: string | null
          birth_year?: number | null
          birthplace?: string | null
          book_id: string
          career_highlights?: string[] | null
          challenges_overcome?: string[] | null
          children_count?: number | null
          created_at?: string
          cultural_background?: string | null
          current_location?: string | null
          education?: string | null
          family_background?: string | null
          first_job?: string | null
          full_name?: string | null
          hobbies_interests?: string[] | null
          id?: string
          key_life_events?: string[] | null
          languages_spoken?: string[] | null
          life_philosophy?: string | null
          life_themes?: string[] | null
          marital_status?: string | null
          memorable_quotes?: string[] | null
          nicknames?: string[] | null
          occupation?: string | null
          parents_occupations?: string | null
          personality_traits?: string[] | null
          relationships_family?: string | null
          siblings_count?: number | null
          updated_at?: string
          user_id: string
          values_beliefs?: string | null
        }
        Update: {
          birth_date?: string | null
          birth_year?: number | null
          birthplace?: string | null
          book_id?: string
          career_highlights?: string[] | null
          challenges_overcome?: string[] | null
          children_count?: number | null
          created_at?: string
          cultural_background?: string | null
          current_location?: string | null
          education?: string | null
          family_background?: string | null
          first_job?: string | null
          full_name?: string | null
          hobbies_interests?: string[] | null
          id?: string
          key_life_events?: string[] | null
          languages_spoken?: string[] | null
          life_philosophy?: string | null
          life_themes?: string[] | null
          marital_status?: string | null
          memorable_quotes?: string[] | null
          nicknames?: string[] | null
          occupation?: string | null
          parents_occupations?: string | null
          personality_traits?: string[] | null
          relationships_family?: string | null
          siblings_count?: number | null
          updated_at?: string
          user_id?: string
          values_beliefs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_profiles_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          chapters: string | null
          created_at: string
          id: string
          purchase_status: string | null
          status: string | null
          stripe_purchase_id: string | null
          tier: string
          title: string | null
          usage_metrics: Json
          user_id: string
        }
        Insert: {
          chapters?: string | null
          created_at?: string
          id?: string
          purchase_status?: string | null
          status?: string | null
          stripe_purchase_id?: string | null
          tier?: string
          title?: string | null
          usage_metrics?: Json
          user_id: string
        }
        Update: {
          chapters?: string | null
          created_at?: string
          id?: string
          purchase_status?: string | null
          status?: string | null
          stripe_purchase_id?: string | null
          tier?: string
          title?: string | null
          usage_metrics?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_email_logs: {
        Row: {
          chapter_id: string
          created_at: string
          email_status: string
          email_type: string
          error_message: string | null
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          email_status?: string
          email_type: string
          error_message?: string | null
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          email_status?: string
          email_type?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          book_id: string
          chapter_number: number
          content: string | null
          created_at: string
          id: string
          is_submitted: boolean
          pdf_url: string | null
          status: string | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_number: number
          content?: string | null
          created_at?: string
          id?: string
          is_submitted?: boolean
          pdf_url?: string | null
          status?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_number?: number
          content?: string | null
          created_at?: string
          id?: string
          is_submitted?: boolean
          pdf_url?: string | null
          status?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_histories: {
        Row: {
          chapter_id: string | null
          context_snapshot: Json | null
          conversation_goals: Json | null
          conversation_medium: string | null
          conversation_type: string | null
          created_at: string
          id: string
          is_self_conversation: boolean | null
          messages: Json | null
          session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          context_snapshot?: Json | null
          conversation_goals?: Json | null
          conversation_medium?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          is_self_conversation?: boolean | null
          messages?: Json | null
          session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          context_snapshot?: Json | null
          conversation_goals?: Json | null
          conversation_medium?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          is_self_conversation?: boolean | null
          messages?: Json | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_histories_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_histories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_context_cache: {
        Row: {
          book_id: string
          chapter_id: string | null
          context_data: Json
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id?: string | null
          context_data?: Json
          created_at?: string
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string | null
          context_data?: Json
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_questions: {
        Row: {
          asked_at: string
          book_id: string
          chapter_id: string | null
          conversation_session_id: string | null
          conversation_type: string
          created_at: string
          id: string
          question_hash: string
          question_text: string
          response_quality: number | null
          semantic_keywords: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asked_at?: string
          book_id: string
          chapter_id?: string | null
          conversation_session_id?: string | null
          conversation_type: string
          created_at?: string
          id?: string
          question_hash: string
          question_text: string
          response_quality?: number | null
          semantic_keywords?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asked_at?: string
          book_id?: string
          chapter_id?: string | null
          conversation_session_id?: string | null
          conversation_type?: string
          created_at?: string
          id?: string
          question_hash?: string
          question_text?: string
          response_quality?: number | null
          semantic_keywords?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          book_id: string | null
          created_at: string
          id: string
          pod_provider: string | null
          quantity: number | null
          status: string | null
          total_price: number | null
          user_id: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          id?: string
          pod_provider?: string | null
          quantity?: number | null
          status?: string | null
          total_price?: number | null
          user_id: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          id?: string
          pod_provider?: string | null
          quantity?: number | null
          status?: string | null
          total_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_jobs: {
        Row: {
          chapter_id: string
          created_at: string
          error_message: string | null
          id: string
          pdf_url: string | null
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          pdf_url?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          pdf_url?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_question_responses: {
        Row: {
          answer_text: string | null
          book_id: string
          created_at: string
          id: string
          question_index: number
          question_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_text?: string | null
          book_id: string
          created_at?: string
          id?: string
          question_index: number
          question_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_text?: string | null
          book_id?: string
          created_at?: string
          id?: string
          question_index?: number
          question_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          age: number | null
          completed_signup: boolean | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          age?: number | null
          completed_signup?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Update: {
          age?: number | null
          completed_signup?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_context_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_my_account: {
        Args: Record<PropertyKey, never>
        Returns: {
          message: string
          records_deleted: Json
          success: boolean
        }[]
      }
      delete_user_and_related_data: {
        Args: { target_user_id: string }
        Returns: {
          message: string
          records_deleted: Json
          success: boolean
        }[]
      }
      extract_question_keywords: {
        Args: { question_text: string }
        Returns: string[]
      }
      extract_questions_from_text: {
        Args: { response_text: string }
        Returns: string[]
      }
      generate_question_hash: {
        Args: { question_text: string }
        Returns: string
      }
      get_pdf_jobs: {
        Args: Record<PropertyKey, never>
        Returns: {
          enqueued_at: string
          message: Json
          msg_id: number
          read_ct: number
          vt: string
        }[]
      }
      is_question_duplicate: {
        Args: {
          p_book_id: string
          p_conversation_type: string
          p_question_text: string
          p_user_id: string
        }
        Returns: boolean
      }
      pgmq_send: {
        Args: { msg: Json; queue_name: string }
        Returns: number
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
