export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_applications: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          reason_to_join: string
          social_media_url: string
          status: string
          unique_referral_code: string | null
          updated_at: string
          usdt_wallet_address: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          reason_to_join: string
          social_media_url: string
          status?: string
          unique_referral_code?: string | null
          updated_at?: string
          usdt_wallet_address: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          reason_to_join?: string
          social_media_url?: string
          status?: string
          unique_referral_code?: string | null
          updated_at?: string
          usdt_wallet_address?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_user_id: string
          amount_earned: number
          commission_month: string
          created_at: string
          id: string
          referred_user_id: string
          subscription_payment_id: string
        }
        Insert: {
          affiliate_user_id: string
          amount_earned: number
          commission_month: string
          created_at?: string
          id?: string
          referred_user_id: string
          subscription_payment_id: string
        }
        Update: {
          affiliate_user_id?: string
          amount_earned?: number
          commission_month?: string
          created_at?: string
          id?: string
          referred_user_id?: string
          subscription_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_user_id_fkey"
            columns: ["affiliate_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payout_requests: {
        Row: {
          admin_notes: string | null
          affiliate_user_id: string
          created_at: string
          id: string
          processed_at: string | null
          requested_amount: number
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affiliate_user_id: string
          created_at?: string
          id?: string
          processed_at?: string | null
          requested_amount: number
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affiliate_user_id?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          requested_amount?: number
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payout_requests_affiliate_user_id_fkey"
            columns: ["affiliate_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_withdrawals: {
        Row: {
          affiliate_id: string
          amount: number
          bank_details: Json | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          bank_details?: Json | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          bank_details?: Json | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_withdrawals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          created_at: string
          id: string
          is_active: boolean
          pending_withdrawals: number
          referral_link: string
          total_earnings: number
          total_withdrawals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          pending_withdrawals?: number
          referral_link: string
          total_earnings?: number
          total_withdrawals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          pending_withdrawals?: number
          referral_link?: string
          total_earnings?: number
          total_withdrawals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_configs: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          credit_cost: number
          id: string
          is_enabled: boolean | null
          service: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          credit_cost?: number
          id?: string
          is_enabled?: boolean | null
          service: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          credit_cost?: number
          id?: string
          is_enabled?: boolean | null
          service?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      content_flags: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          reason: string
          reporter_id: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["flag_status"] | null
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["flag_status"] | null
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["flag_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      contest_entries: {
        Row: {
          approved: boolean | null
          contest_id: string
          created_at: string
          description: string | null
          id: string
          media_type: string | null
          song_id: string | null
          status: Database["public"]["Enums"]["song_status"] | null
          updated_at: string
          user_id: string
          video_url: string | null
          vote_count: number | null
        }
        Insert: {
          approved?: boolean | null
          contest_id: string
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string | null
          song_id?: string | null
          status?: Database["public"]["Enums"]["song_status"] | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          vote_count?: number | null
        }
        Update: {
          approved?: boolean | null
          contest_id?: string
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string | null
          song_id?: string | null
          status?: Database["public"]["Enums"]["song_status"] | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_votes: {
        Row: {
          contest_entry_id: string
          contest_id: string
          created_at: string
          id: string
          user_id: string
          voter_phone: string | null
        }
        Insert: {
          contest_entry_id: string
          contest_id: string
          created_at?: string
          id?: string
          user_id: string
          voter_phone?: string | null
        }
        Update: {
          contest_entry_id?: string
          contest_id?: string
          created_at?: string
          id?: string
          user_id?: string
          voter_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_votes_contest_entry_id_fkey"
            columns: ["contest_entry_id"]
            isOneToOne: false
            referencedRelation: "contest_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_votes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          auto_close: boolean | null
          created_at: string
          created_by: string | null
          description: string
          end_date: string
          entry_fee: number
          id: string
          instrumental_url: string | null
          max_entries_per_user: number | null
          prize: string
          prize_amount: number | null
          prize_currency: string | null
          rules: string
          start_date: string
          status: Database["public"]["Enums"]["contest_status"] | null
          terms_conditions: string
          title: string
          updated_at: string
          voting_enabled: boolean | null
          winner_id: string | null
        }
        Insert: {
          auto_close?: boolean | null
          created_at?: string
          created_by?: string | null
          description: string
          end_date: string
          entry_fee?: number
          id?: string
          instrumental_url?: string | null
          max_entries_per_user?: number | null
          prize: string
          prize_amount?: number | null
          prize_currency?: string | null
          rules: string
          start_date: string
          status?: Database["public"]["Enums"]["contest_status"] | null
          terms_conditions: string
          title: string
          updated_at?: string
          voting_enabled?: boolean | null
          winner_id?: string | null
        }
        Update: {
          auto_close?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string
          entry_fee?: number
          id?: string
          instrumental_url?: string | null
          max_entries_per_user?: number | null
          prize?: string
          prize_amount?: number | null
          prize_currency?: string | null
          rules?: string
          start_date?: string
          status?: Database["public"]["Enums"]["contest_status"] | null
          terms_conditions?: string
          title?: string
          updated_at?: string
          voting_enabled?: boolean | null
          winner_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_song_audio: {
        Row: {
          audio_url: string
          created_at: string
          created_by: string | null
          id: string
          is_selected: boolean | null
          request_id: string
          updated_at: string
          version: number
        }
        Insert: {
          audio_url: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_selected?: boolean | null
          request_id: string
          updated_at?: string
          version: number
        }
        Update: {
          audio_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_selected?: boolean | null
          request_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_song_audio_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "custom_song_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_song_lyrics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_selected: boolean | null
          lyrics: string
          request_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_selected?: boolean | null
          lyrics: string
          request_id: string
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_selected?: boolean | null
          lyrics?: string
          request_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_song_lyrics_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "custom_song_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_song_requests: {
        Row: {
          created_at: string
          description: string
          genre_id: string | null
          id: string
          status: Database["public"]["Enums"]["custom_song_status"] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          genre_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["custom_song_status"] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          genre_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["custom_song_status"] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_song_requests_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: string | null
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
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
      genre_templates: {
        Row: {
          admin_prompt: string
          audio_url: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          genre_id: string
          id: string
          is_active: boolean | null
          template_name: string
          updated_at: string | null
          user_prompt_guide: string | null
        }
        Insert: {
          admin_prompt: string
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          genre_id: string
          id?: string
          is_active?: boolean | null
          template_name: string
          updated_at?: string | null
          user_prompt_guide?: string | null
        }
        Update: {
          admin_prompt?: string
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          genre_id?: string
          id?: string
          is_active?: boolean | null
          template_name?: string
          updated_at?: string | null
          user_prompt_guide?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "genre_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genre_templates_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          audio_preview_url: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          prompt_template: string
          sample_prompt: string | null
          updated_at: string
        }
        Insert: {
          audio_preview_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          prompt_template?: string
          sample_prompt?: string | null
          updated_at?: string
        }
        Update: {
          audio_preview_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          prompt_template?: string
          sample_prompt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          credits_purchased: number
          currency: string
          id: string
          payment_id: string | null
          payment_method: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits_purchased: number
          currency?: string
          id?: string
          payment_id?: string | null
          payment_method: string
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits_purchased?: number
          currency?: string
          id?: string
          payment_id?: string | null
          payment_method?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          full_name: string | null
          id: string
          is_banned: boolean | null
          is_suspended: boolean | null
          referrer_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          full_name?: string | null
          id: string
          is_banned?: boolean | null
          is_suspended?: boolean | null
          referrer_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_suspended?: boolean | null
          referrer_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          conversion_date: string | null
          created_at: string
          id: string
          is_converted: boolean
          referral_code: string
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          conversion_date?: string | null
          created_at?: string
          id?: string
          is_converted?: boolean
          referral_code: string
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          conversion_date?: string | null
          created_at?: string
          id?: string
          is_converted?: boolean
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      songs: {
        Row: {
          audio_url: string | null
          created_at: string
          credits_used: number
          duration: number | null
          error_message: string | null
          genre_id: string | null
          id: string
          image_url: string | null
          instrumental_url: string | null
          lyrics: string | null
          model_name: string | null
          prompt: string | null
          status: Database["public"]["Enums"]["song_status"] | null
          suno_id: string | null
          tags: string | null
          task_id: string | null
          title: string
          type: Database["public"]["Enums"]["song_type"]
          updated_at: string
          user_id: string
          vocal_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number
          duration?: number | null
          error_message?: string | null
          genre_id?: string | null
          id?: string
          image_url?: string | null
          instrumental_url?: string | null
          lyrics?: string | null
          model_name?: string | null
          prompt?: string | null
          status?: Database["public"]["Enums"]["song_status"] | null
          suno_id?: string | null
          tags?: string | null
          task_id?: string | null
          title: string
          type: Database["public"]["Enums"]["song_type"]
          updated_at?: string
          user_id: string
          vocal_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          credits_used?: number
          duration?: number | null
          error_message?: string | null
          genre_id?: string | null
          id?: string
          image_url?: string | null
          instrumental_url?: string | null
          lyrics?: string | null
          model_name?: string | null
          prompt?: string | null
          status?: Database["public"]["Enums"]["song_status"] | null
          suno_id?: string | null
          tags?: string | null
          task_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["song_type"]
          updated_at?: string
          user_id?: string
          vocal_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      unlocked_contests: {
        Row: {
          contest_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          contest_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          contest_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_contests_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          started_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_clones: {
        Row: {
          created_at: string
          id: string
          name: string
          sample_audio_url: string
          status: Database["public"]["Enums"]["voice_clone_status"] | null
          updated_at: string
          user_id: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sample_audio_url: string
          status?: Database["public"]["Enums"]["voice_clone_status"] | null
          updated_at?: string
          user_id: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sample_audio_url?: string
          status?: Database["public"]["Enums"]["voice_clone_status"] | null
          updated_at?: string
          user_id?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          contest_entry_id: string
          created_at: string
          id: string
          voter_phone: string
        }
        Insert: {
          contest_entry_id: string
          created_at?: string
          id?: string
          voter_phone: string
        }
        Update: {
          contest_entry_id?: string
          created_at?: string
          id?: string
          voter_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_contest_entry_id_fkey"
            columns: ["contest_entry_id"]
            isOneToOne: false
            referencedRelation: "contest_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_entry_id_fkey"
            columns: ["contest_entry_id"]
            isOneToOne: false
            referencedRelation: "contest_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_apply_for_affiliate: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      current_user_has_role: {
        Args: { role_name: string }
        Returns: boolean
      }
      generate_affiliate_code: {
        Args: { p_full_name: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_user_roles: {
        Args: { user_id_param: string }
        Returns: {
          role: string
        }[]
      }
      has_admin_permission: {
        Args: { _user_id: string; _permission: string }
        Returns: boolean
      }
      has_role: {
        Args:
          | { _role: Database["public"]["Enums"]["user_role"] }
          | {
              _user_id: string
              _role: Database["public"]["Enums"]["user_role"]
            }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_only_voter: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_subscriber: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_user_credits: {
        Args: { p_user_id: string; p_amount: number }
        Returns: number
      }
    }
    Enums: {
      contest_status: "draft" | "active" | "voting" | "completed"
      custom_song_status:
        | "pending"
        | "lyrics_proposed"
        | "lyrics_selected"
        | "audio_uploaded"
        | "completed"
      flag_status: "pending" | "reviewed" | "dismissed"
      song_status: "pending" | "approved" | "rejected" | "completed"
      song_type: "song" | "instrumental"
      user_role:
        | "admin"
        | "moderator"
        | "user"
        | "super_admin"
        | "voter"
        | "subscriber"
        | "affiliate"
        | "contest_entrant"
      voice_clone_status: "pending" | "approved" | "rejected"
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
      contest_status: ["draft", "active", "voting", "completed"],
      custom_song_status: [
        "pending",
        "lyrics_proposed",
        "lyrics_selected",
        "audio_uploaded",
        "completed",
      ],
      flag_status: ["pending", "reviewed", "dismissed"],
      song_status: ["pending", "approved", "rejected", "completed"],
      song_type: ["song", "instrumental"],
      user_role: [
        "admin",
        "moderator",
        "user",
        "super_admin",
        "voter",
        "subscriber",
        "affiliate",
        "contest_entrant",
      ],
      voice_clone_status: ["pending", "approved", "rejected"],
    },
  },
} as const
