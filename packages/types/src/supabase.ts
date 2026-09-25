export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          requested_at: string
          scheduled_hard_delete_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          requested_at?: string
          scheduled_hard_delete_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          requested_at?: string
          scheduled_hard_delete_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          mfa_enabled: boolean
          role: Database["public"]["Enums"]["admin_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_login_at?: string | null
          mfa_enabled?: boolean
          role?: Database["public"]["Enums"]["admin_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login_at?: string | null
          mfa_enabled?: boolean
          role?: Database["public"]["Enums"]["admin_role"]
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_user_id_fkey"
            columns: ["blocker_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_user_id_fkey"
            columns: ["blocker_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_services: {
        Row: {
          clinic_id: string
          created_at: string
          currency: string
          custom_title: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          price_from: number | null
          service_id: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          currency?: string
          custom_title?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          price_from?: number | null
          service_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          currency?: string
          custom_title?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          price_from?: number | null
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          city: string | null
          collaboration_note: string | null
          country: string
          county: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_verified: boolean
          location: unknown
          logo_url: string | null
          name: string
          open_for_collaboration: boolean
          owner_user_id: string
          phone: string | null
          rating_avg: number
          rating_count: number
          search_vector: unknown
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          tiktok: string | null
          updated_at: string
          website: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          collaboration_note?: string | null
          country?: string
          county?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_verified?: boolean
          location?: unknown
          logo_url?: string | null
          name: string
          open_for_collaboration?: boolean
          owner_user_id: string
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          search_vector?: unknown
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          city?: string | null
          collaboration_note?: string | null
          country?: string
          county?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_verified?: boolean
          location?: unknown
          logo_url?: string | null
          name?: string
          open_for_collaboration?: boolean
          owner_user_id?: string
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          search_vector?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinics_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_user_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          like_count: number
          parent_comment_id: string | null
          post_id: string
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
        }
        Insert: {
          author_user_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          like_count?: number
          parent_comment_id?: string | null
          post_id: string
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          like_count?: number
          parent_comment_id?: string | null
          post_id?: string
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
        ]
      }
      consent_records: {
        Row: {
          accepted_at: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          id: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          id?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          consent_type?: Database["public"]["Enums"]["consent_type"]
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          acting_as_id: string
          acting_as_type: Database["public"]["Enums"]["acting_as_type"]
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          acting_as_id: string
          acting_as_type: Database["public"]["Enums"]["acting_as_type"]
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          acting_as_id?: string
          acting_as_type?: Database["public"]["Enums"]["acting_as_type"]
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          type: Database["public"]["Enums"]["conversation_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          origin?: Database["public"]["Enums"]["conversation_origin"]
          type?: Database["public"]["Enums"]["conversation_type"]
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          origin?: Database["public"]["Enums"]["conversation_origin"]
          type?: Database["public"]["Enums"]["conversation_type"]
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          expires_at: string | null
          file_storage_path: string | null
          id: string
          requested_at: string
          status: Database["public"]["Enums"]["export_request_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          expires_at?: string | null
          file_storage_path?: string | null
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["export_request_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          expires_at?: string | null
          file_storage_path?: string | null
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["export_request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_export_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_export_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dentists: {
        Row: {
          clinic_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number
          facebook: string | null
          full_name: string
          id: string
          instagram: string | null
          photo_url: string | null
          search_vector: unknown
          specialization_id: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          facebook?: string | null
          full_name: string
          id?: string
          instagram?: string | null
          photo_url?: string | null
          search_vector?: unknown
          specialization_id?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          facebook?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          photo_url?: string | null
          search_vector?: unknown
          specialization_id?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dentists_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentists_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          platform: Database["public"]["Enums"]["device_platform"]
          push_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          platform: Database["public"]["Enums"]["device_platform"]
          push_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          platform?: Database["public"]["Enums"]["device_platform"]
          push_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: Database["public"]["Enums"]["favorite_target_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: Database["public"]["Enums"]["favorite_target_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["favorite_target_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_user_id: string
          id: string
          target_id: string
          target_type: Database["public"]["Enums"]["follow_target_type"]
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          id?: string
          target_id: string
          target_type: Database["public"]["Enums"]["follow_target_type"]
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["follow_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_user_id_fkey"
            columns: ["follower_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_user_id_fkey"
            columns: ["follower_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      laboratories: {
        Row: {
          address: string | null
          city: string | null
          collaboration_note: string | null
          collaboration_zone:
            | Database["public"]["Enums"]["collaboration_zone"]
            | null
          country: string
          county: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_verified: boolean
          location: unknown
          logo_url: string | null
          name: string
          open_for_collaboration: boolean
          owner_user_id: string
          phone: string | null
          rating_avg: number
          rating_count: number
          search_vector: unknown
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          team_size: number | null
          tiktok: string | null
          updated_at: string
          website: string | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          collaboration_note?: string | null
          collaboration_zone?:
            | Database["public"]["Enums"]["collaboration_zone"]
            | null
          country?: string
          county?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_verified?: boolean
          location?: unknown
          logo_url?: string | null
          name: string
          open_for_collaboration?: boolean
          owner_user_id: string
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          search_vector?: unknown
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          team_size?: number | null
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          city?: string | null
          collaboration_note?: string | null
          collaboration_zone?:
            | Database["public"]["Enums"]["collaboration_zone"]
            | null
          country?: string
          county?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_verified?: boolean
          location?: unknown
          logo_url?: string | null
          name?: string
          open_for_collaboration?: boolean
          owner_user_id?: string
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          search_vector?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          team_size?: number | null
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "laboratories_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laboratories_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      laboratory_members: {
        Row: {
          created_at: string
          id: string
          laboratory_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          laboratory_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          laboratory_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laboratory_members_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laboratory_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laboratory_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      laboratory_services: {
        Row: {
          created_at: string
          currency: string
          custom_title: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          laboratory_id: string
          price_from: number | null
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          custom_title?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          laboratory_id: string
          price_from?: number | null
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          custom_title?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          laboratory_id?: string
          price_from?: number | null
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laboratory_services_laboratory_id_fkey"
            columns: ["laboratory_id"]
            isOneToOne: false
            referencedRelation: "laboratories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laboratory_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_size_bytes: number | null
          id: string
          message_id: string
          mime_type: string | null
          storage_path: string
          type: Database["public"]["Enums"]["attachment_type"]
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          message_id: string
          mime_type?: string | null
          storage_path: string
          type: Database["public"]["Enums"]["attachment_type"]
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          message_id?: string
          mime_type?: string | null
          storage_path?: string
          type?: Database["public"]["Enums"]["attachment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          seen_at: string | null
          sender_user_id: string
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          seen_at?: string | null
          sender_user_id: string
          status?: Database["public"]["Enums"]["message_status"]
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          seen_at?: string | null
          sender_user_id?: string
          status?: Database["public"]["Enums"]["message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          collaboration_request: boolean
          new_comment: boolean
          new_follower: boolean
          new_like: boolean
          new_message: boolean
          new_review: boolean
          opportunity_response: boolean
          user_id: string
          verification_approved: boolean
        }
        Insert: {
          collaboration_request?: boolean
          new_comment?: boolean
          new_follower?: boolean
          new_like?: boolean
          new_message?: boolean
          new_review?: boolean
          opportunity_response?: boolean
          user_id: string
          verification_approved?: boolean
        }
        Update: {
          collaboration_request?: boolean
          new_comment?: boolean
          new_follower?: boolean
          new_like?: boolean
          new_message?: boolean
          new_review?: boolean
          opportunity_response?: boolean
          user_id?: string
          verification_approved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          target_id: string | null
          target_type: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          target_id?: string | null
          target_type?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          target_id?: string | null
          target_type?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          author_id: string
          author_type: Database["public"]["Enums"]["opportunity_author_type"]
          city: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          search_vector: unknown
          specialization_id: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_type: Database["public"]["Enums"]["opportunity_author_type"]
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          search_vector?: unknown
          specialization_id?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_type?: Database["public"]["Enums"]["opportunity_author_type"]
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          search_vector?: unknown
          specialization_id?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_interests: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          opportunity_id: string
          responder_id: string
          responder_type: Database["public"]["Enums"]["opportunity_author_type"]
          status: Database["public"]["Enums"]["opportunity_interest_status"]
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          opportunity_id: string
          responder_id: string
          responder_type: Database["public"]["Enums"]["opportunity_author_type"]
          status?: Database["public"]["Enums"]["opportunity_interest_status"]
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          opportunity_id?: string
          responder_id?: string
          responder_type?: Database["public"]["Enums"]["opportunity_author_type"]
          status?: Database["public"]["Enums"]["opportunity_interest_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_interests_conversation_fk"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_interests_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_limits: {
        Row: {
          key: string
          value: number
        }
        Insert: {
          key: string
          value: number
        }
        Update: {
          key?: string
          value?: number
        }
        Relationships: []
      }
      portfolio_categories: {
        Row: {
          applies_to: Database["public"]["Enums"]["service_category"]
          id: string
          key: string
          label_en: string
          label_ro: string
        }
        Insert: {
          applies_to?: Database["public"]["Enums"]["service_category"]
          id?: string
          key: string
          label_en: string
          label_ro: string
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["service_category"]
          id?: string
          key?: string
          label_en?: string
          label_ro?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_before_after: boolean
          owner_id: string
          owner_type: Database["public"]["Enums"]["portfolio_owner_type"]
          search_vector: unknown
          status: Database["public"]["Enums"]["portfolio_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_before_after?: boolean
          owner_id: string
          owner_type: Database["public"]["Enums"]["portfolio_owner_type"]
          search_vector?: unknown
          status?: Database["public"]["Enums"]["portfolio_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_before_after?: boolean
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["portfolio_owner_type"]
          search_vector?: unknown
          status?: Database["public"]["Enums"]["portfolio_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "portfolio_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_media: {
        Row: {
          before_after_role: Database["public"]["Enums"]["before_after_role"]
          created_at: string
          display_order: number
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          mux_asset_id: string | null
          mux_upload_id: string | null
          portfolio_item_id: string
          processing_status: Database["public"]["Enums"]["media_processing_status"]
          storage_path: string
          thumbnail_url: string | null
          video_playback_url: string | null
        }
        Insert: {
          before_after_role?: Database["public"]["Enums"]["before_after_role"]
          created_at?: string
          display_order?: number
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          mux_asset_id?: string | null
          mux_upload_id?: string | null
          portfolio_item_id: string
          processing_status?: Database["public"]["Enums"]["media_processing_status"]
          storage_path: string
          thumbnail_url?: string | null
          video_playback_url?: string | null
        }
        Update: {
          before_after_role?: Database["public"]["Enums"]["before_after_role"]
          created_at?: string
          display_order?: number
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          mux_asset_id?: string | null
          mux_upload_id?: string | null
          portfolio_item_id?: string
          processing_status?: Database["public"]["Enums"]["media_processing_status"]
          storage_path?: string
          thumbnail_url?: string | null
          video_playback_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_media_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          display_order: number
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          mux_asset_id: string | null
          mux_upload_id: string | null
          post_id: string
          processing_status: Database["public"]["Enums"]["media_processing_status"]
          storage_path: string
          thumbnail_url: string | null
          video_playback_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          mux_asset_id?: string | null
          mux_upload_id?: string | null
          post_id: string
          processing_status?: Database["public"]["Enums"]["media_processing_status"]
          storage_path: string
          thumbnail_url?: string | null
          video_playback_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          mux_asset_id?: string | null
          mux_upload_id?: string | null
          post_id?: string
          processing_status?: Database["public"]["Enums"]["media_processing_status"]
          storage_path?: string
          thumbnail_url?: string | null
          video_playback_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          author_type: Database["public"]["Enums"]["post_author_type"]
          comment_count: number
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          like_count: number
          linked_opportunity_id: string | null
          linked_portfolio_item_id: string | null
          post_type: Database["public"]["Enums"]["post_type"]
          save_count: number
          share_count: number
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
        }
        Insert: {
          author_id: string
          author_type: Database["public"]["Enums"]["post_author_type"]
          comment_count?: number
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          like_count?: number
          linked_opportunity_id?: string | null
          linked_portfolio_item_id?: string | null
          post_type: Database["public"]["Enums"]["post_type"]
          save_count?: number
          share_count?: number
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_type?: Database["public"]["Enums"]["post_author_type"]
          comment_count?: number
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          like_count?: number
          linked_opportunity_id?: string | null
          linked_portfolio_item_id?: string | null
          post_type?: Database["public"]["Enums"]["post_type"]
          save_count?: number
          share_count?: number
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_linked_opportunity_fk"
            columns: ["linked_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_linked_portfolio_item_id_fkey"
            columns: ["linked_portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      push_queue: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          processed: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          processed?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          processed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "push_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          actor_id: string
          bucket: string
          count: number
          id: string
          window_start: string
        }
        Insert: {
          actor_id: string
          bucket: string
          count?: number
          id?: string
          window_start: string
        }
        Update: {
          actor_id?: string
          bucket?: string
          count?: number
          id?: string
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_snapshot: string | null
          created_at: string
          id: string
          note: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          resolved_at: string | null
          resolved_by_admin_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          content_snapshot?: string | null
          created_at?: string
          id?: string
          note?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          content_snapshot?: string | null
          created_at?: string
          id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_user_id?: string
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_admin_id_fkey"
            columns: ["resolved_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          clinic_id: string
          comment: string | null
          communication_rating: number | null
          created_at: string
          experience_rating: number | null
          id: string
          patient_user_id: string
          professionalism_rating: number | null
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          clinic_id: string
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          experience_rating?: number | null
          id?: string
          patient_user_id: string
          professionalism_rating?: number | null
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          experience_rating?: number | null
          id?: string
          patient_user_id?: string
          professionalism_rating?: number | null
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["service_category"]
          icon: string | null
          id: string
          key: string
          label_en: string
          label_ro: string
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["service_category"]
          icon?: string | null
          id?: string
          key: string
          label_en: string
          label_ro: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["service_category"]
          icon?: string | null
          id?: string
          key?: string
          label_en?: string
          label_ro?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      specializations: {
        Row: {
          active: boolean
          icon: string | null
          id: string
          key: string
          label_en: string
          label_ro: string
        }
        Insert: {
          active?: boolean
          icon?: string | null
          id?: string
          key: string
          label_en: string
          label_ro: string
        }
        Update: {
          active?: boolean
          icon?: string | null
          id?: string
          key?: string
          label_en?: string
          label_ro?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          last_seen_at: string | null
          locale: string
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id: string
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          document_type: Database["public"]["Enums"]["verification_document_type"]
          id: string
          storage_path: string
          uploaded_at: string
          verification_request_id: string
        }
        Insert: {
          document_type: Database["public"]["Enums"]["verification_document_type"]
          id?: string
          storage_path: string
          uploaded_at?: string
          verification_request_id: string
        }
        Update: {
          document_type?: Database["public"]["Enums"]["verification_document_type"]
          id?: string
          storage_path?: string
          uploaded_at?: string
          verification_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_verification_request_id_fkey"
            columns: ["verification_request_id"]
            isOneToOne: false
            referencedRelation: "verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          status: Database["public"]["Enums"]["verification_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["verification_subject_type"]
          submitted_at: string
        }
        Insert: {
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["verification_subject_type"]
          submitted_at?: string
        }
        Update: {
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["verification_subject_type"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_reviewed_by_admin_id_fkey"
            columns: ["reviewed_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_actor_id: string
          p_actor_type: string
          p_body: string
          p_target_id: string
          p_target_type: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      create_or_get_conversation: {
        Args: {
          p_my_acting_as_id: string
          p_my_acting_as_type: Database["public"]["Enums"]["acting_as_type"]
          p_origin?: Database["public"]["Enums"]["conversation_origin"]
          p_other_acting_as_id: string
          p_other_acting_as_type: Database["public"]["Enums"]["acting_as_type"]
          p_other_user_id: string
        }
        Returns: string
      }
      current_account_type: { Args: never; Returns: string }
      current_admin_role: { Args: never; Returns: string }
      detect_city_in_query: { Args: { p_query: string }; Returns: string }
      detect_service_in_query: { Args: { p_query: string }; Returns: string }
      detect_specialization_in_query: {
        Args: { p_query: string }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      f_unaccent: { Args: { "": string }; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      global_search:
        | {
            Args: { p_limit?: number; p_query: string }
            Returns: {
              city: string
              id: string
              is_verified: boolean
              logo_url: string
              name: string
              rank: number
              result_type: string
            }[]
          }
        | {
            Args: {
              p_city?: string
              p_limit?: number
              p_open_for_collaboration_only?: boolean
              p_query: string
              p_verified_only?: boolean
            }
            Returns: {
              city: string
              id: string
              is_verified: boolean
              logo_url: string
              name: string
              rank: number
              result_type: string
            }[]
          }
      is_blocked_by_viewer: {
        Args: { p_target_owner_id: string; p_target_owner_type: string }
        Returns: boolean
      }
      is_clinic_manager: { Args: { cid: string }; Returns: boolean }
      is_clinic_owner: { Args: { cid: string }; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_laboratory_manager: { Args: { lid: string }; Returns: boolean }
      is_laboratory_owner: { Args: { lid: string }; Returns: boolean }
      is_org_folder_writable: { Args: { folder_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      nearby_clinics: {
        Args: {
          p_city?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_open_for_collaboration_only?: boolean
          p_radius_m?: number
          p_specialization_id?: string
          p_verified_only?: boolean
        }
        Returns: {
          city: string
          distance_m: number
          id: string
          is_verified: boolean
          latitude: number
          logo_url: string
          longitude: number
          name: string
          open_for_collaboration: boolean
          rating_avg: number
          slug: string
        }[]
      }
      nearby_laboratories: {
        Args: {
          p_city?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_open_for_collaboration_only?: boolean
          p_radius_m?: number
          p_verified_only?: boolean
        }
        Returns: {
          city: string
          collaboration_zone: string
          distance_m: number
          id: string
          is_verified: boolean
          latitude: number
          logo_url: string
          longitude: number
          name: string
          open_for_collaboration: boolean
          slug: string
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      resolve_org_owner_user_id: {
        Args: { p_id: string; p_type: string }
        Returns: string
      }
      set_clinic_location: {
        Args: { p_clinic_id: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
      set_laboratory_location: {
        Args: { p_laboratory_id: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      account_type: "patient" | "clinic" | "laboratory"
      acting_as_type: "patient" | "clinic" | "laboratory"
      admin_role: "super_admin" | "moderator" | "support"
      attachment_type: "image" | "file"
      before_after_role: "before" | "after" | "single"
      collaboration_zone: "local" | "national" | "european" | "international"
      comment_status: "visible" | "removed"
      consent_type: "terms" | "privacy_policy" | "marketing"
      conversation_origin: "manual" | "opportunity"
      conversation_type: "direct"
      device_platform: "ios" | "android"
      entity_status: "active" | "suspended" | "deleted"
      export_request_status: "pending" | "processing" | "ready" | "expired"
      favorite_target_type: "clinic" | "laboratory" | "dentist" | "post"
      follow_target_type: "clinic" | "laboratory" | "dentist"
      media_processing_status: "pending" | "processing" | "ready" | "failed"
      media_type: "image" | "video"
      message_status: "sent" | "deleted"
      notification_type:
        | "new_follower"
        | "new_like"
        | "new_comment"
        | "new_message"
        | "collaboration_request"
        | "opportunity_response"
        | "verification_approved"
        | "new_review"
      opportunity_author_type: "clinic" | "laboratory"
      opportunity_interest_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "withdrawn_by_system"
      opportunity_status: "open" | "closed" | "filled" | "cancelled"
      org_member_role: "owner" | "admin" | "editor"
      portfolio_owner_type: "clinic" | "laboratory"
      portfolio_status: "published" | "draft" | "removed"
      post_author_type: "clinic" | "laboratory"
      post_status: "published" | "removed" | "flagged"
      post_type:
        | "photo"
        | "video"
        | "text"
        | "portfolio"
        | "announcement"
        | "collaboration"
      report_reason:
        | "spam"
        | "fake_account"
        | "offensive_content"
        | "scam"
        | "inappropriate_content"
        | "other"
      report_status:
        | "open"
        | "reviewing"
        | "resolved_actioned"
        | "resolved_dismissed"
      report_target_type:
        | "profile_clinic"
        | "profile_laboratory"
        | "post"
        | "comment"
        | "message"
        | "review"
      review_status: "visible" | "hidden_by_admin" | "flagged"
      service_category: "clinic" | "laboratory" | "both"
      verification_document_type:
        | "cui"
        | "dsp_authorization"
        | "technician_certificate"
        | "id_document"
        | "other"
      verification_status: "pending" | "approved" | "rejected"
      verification_subject_type: "clinic" | "laboratory"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      account_type: ["patient", "clinic", "laboratory"],
      acting_as_type: ["patient", "clinic", "laboratory"],
      admin_role: ["super_admin", "moderator", "support"],
      attachment_type: ["image", "file"],
      before_after_role: ["before", "after", "single"],
      collaboration_zone: ["local", "national", "european", "international"],
      comment_status: ["visible", "removed"],
      consent_type: ["terms", "privacy_policy", "marketing"],
      conversation_origin: ["manual", "opportunity"],
      conversation_type: ["direct"],
      device_platform: ["ios", "android"],
      entity_status: ["active", "suspended", "deleted"],
      export_request_status: ["pending", "processing", "ready", "expired"],
      favorite_target_type: ["clinic", "laboratory", "dentist", "post"],
      follow_target_type: ["clinic", "laboratory", "dentist"],
      media_processing_status: ["pending", "processing", "ready", "failed"],
      media_type: ["image", "video"],
      message_status: ["sent", "deleted"],
      notification_type: [
        "new_follower",
        "new_like",
        "new_comment",
        "new_message",
        "collaboration_request",
        "opportunity_response",
        "verification_approved",
        "new_review",
      ],
      opportunity_author_type: ["clinic", "laboratory"],
      opportunity_interest_status: [
        "pending",
        "accepted",
        "rejected",
        "withdrawn",
        "withdrawn_by_system",
      ],
      opportunity_status: ["open", "closed", "filled", "cancelled"],
      org_member_role: ["owner", "admin", "editor"],
      portfolio_owner_type: ["clinic", "laboratory"],
      portfolio_status: ["published", "draft", "removed"],
      post_author_type: ["clinic", "laboratory"],
      post_status: ["published", "removed", "flagged"],
      post_type: [
        "photo",
        "video",
        "text",
        "portfolio",
        "announcement",
        "collaboration",
      ],
      report_reason: [
        "spam",
        "fake_account",
        "offensive_content",
        "scam",
        "inappropriate_content",
        "other",
      ],
      report_status: [
        "open",
        "reviewing",
        "resolved_actioned",
        "resolved_dismissed",
      ],
      report_target_type: [
        "profile_clinic",
        "profile_laboratory",
        "post",
        "comment",
        "message",
        "review",
      ],
      review_status: ["visible", "hidden_by_admin", "flagged"],
      service_category: ["clinic", "laboratory", "both"],
      verification_document_type: [
        "cui",
        "dsp_authorization",
        "technician_certificate",
        "id_document",
        "other",
      ],
      verification_status: ["pending", "approved", "rejected"],
      verification_subject_type: ["clinic", "laboratory"],
    },
  },
} as const

