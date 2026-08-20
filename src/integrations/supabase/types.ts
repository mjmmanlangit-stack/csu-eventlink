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
      attendance: {
        Row: {
          event_id: string
          id: string
          method: string
          registration_id: string
          scanned_at: string
          scanned_by: string | null
          student_id: string
        }
        Insert: {
          event_id: string
          id?: string
          method?: string
          registration_id: string
          scanned_at?: string
          scanned_by?: string | null
          student_id: string
        }
        Update: {
          event_id?: string
          id?: string
          method?: string
          registration_id?: string
          scanned_at?: string
          scanned_by?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_no: string
          event_id: string
          id: string
          issued_at: string
          issued_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          certificate_no: string
          event_id: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          certificate_no?: string
          event_id?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          comments: string | null
          event_id: string
          id: string
          rating_content: number
          rating_organization: number
          rating_overall: number
          rating_venue: number
          student_id: string
          submitted_at: string
        }
        Insert: {
          comments?: string | null
          event_id: string
          id?: string
          rating_content: number
          rating_organization: number
          rating_overall: number
          rating_venue: number
          student_id: string
          submitted_at?: string
        }
        Update: {
          comments?: string | null
          event_id?: string
          id?: string
          rating_content?: number
          rating_organization?: number
          rating_overall?: number
          rating_venue?: number
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          status: Database["public"]["Enums"]["registration_status"]
          student_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
          student_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          id: string
          organization_id: string
          published_at: string | null
          registration_deadline: string | null
          rejection_reason: string | null
          requires_evaluation: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          capacity?: number | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          id?: string
          organization_id: string
          published_at?: string | null
          registration_deadline?: string | null
          rejection_reason?: string | null
          requires_evaluation?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          capacity?: number | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          id?: string
          organization_id?: string
          published_at?: string | null
          registration_deadline?: string | null
          rejection_reason?: string | null
          requires_evaluation?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          event_id: string | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_officers: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          position: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          position?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          position?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_officers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          acronym: string
          adviser: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["account_status"]
        }
        Insert: {
          acronym: string
          adviser?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["account_status"]
        }
        Update: {
          acronym?: string
          adviser?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["account_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          course: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          status: Database["public"]["Enums"]["account_status"]
          student_no: string | null
          updated_at: string
          year_level: string | null
        }
        Insert: {
          course?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id: string
          status?: Database["public"]["Enums"]["account_status"]
          student_no?: string | null
          updated_at?: string
          year_level?: string | null
        }
        Update: {
          course?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          student_no?: string | null
          updated_at?: string
          year_level?: string | null
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          event_id: string
          id: string
          is_active: boolean
          issued_at: string
          registration_id: string
          token: string
        }
        Insert: {
          event_id: string
          id?: string
          is_active?: boolean
          issued_at?: string
          registration_id: string
          token: string
        }
        Update: {
          event_id?: string
          id?: string
          is_active?: boolean
          issued_at?: string
          registration_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      assign_officer: {
        Args: { _org_id: string; _position?: string; _user_id: string }
        Returns: undefined
      }
      bootstrap_profile: {
        Args: {
          _course?: string
          _department?: string
          _email: string
          _full_name: string
          _student_no?: string
          _year_level?: string
        }
        Returns: undefined
      }
      claim_first_admin: { Args: never; Returns: undefined }
      complete_event: { Args: { _event_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_officer: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      issue_certificates: { Args: { _event_id: string }; Returns: number }
      my_org_id: { Args: never; Returns: string }
      publish_event: { Args: { _event_id: string }; Returns: undefined }
      record_attendance: { Args: { _token: string }; Returns: Json }
      register_for_event: { Args: { _event_id: string }; Returns: string }
      review_event: {
        Args: { _approve: boolean; _event_id: string; _reason?: string }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      submit_evaluation: {
        Args: {
          _comments?: string
          _content: number
          _event_id: string
          _organization: number
          _overall: number
          _venue: number
        }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "inactive"
      app_role: "student" | "officer" | "admin"
      event_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "published"
        | "completed"
      registration_status: "registered" | "cancelled"
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
      account_status: ["active", "inactive"],
      app_role: ["student", "officer", "admin"],
      event_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "published",
        "completed",
      ],
      registration_status: ["registered", "cancelled"],
    },
  },
} as const
