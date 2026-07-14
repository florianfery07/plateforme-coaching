/*
 * GENERATED FILE. DO NOT EDIT MANUALLY.
 *
 * Source: supabase/baseline/remote-schema.sql (144e1614c8ee75288ae6c8521f4f7df1f7d2b9bac3165f83c526d251db4b6342)
 * Source: supabase/migrations/20260714000000_access_control_v2_foundation.sql (a3adbe401dc3a205423d604a51ce79459d5dd3600b95d06627fc83f87c5337df)
 * Source: supabase/migrations/20260714010000_groups_v2_foundation.sql (ecc6d5792ad0b9186749ce848bc48de2b82ab5871c0782e0efcc72c3a0132dad)
 * Regenerate: npm run generate:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  "public": {
    Tables: {
      "athlete_goal_history": {
        Row: {
          "id": string,
          "athlete_id": string | null,
          "short_goal": string | null,
          "medium_goal": string | null,
          "long_goal": string | null,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id"?: string | null
          "short_goal"?: string | null
          "medium_goal"?: string | null
          "long_goal"?: string | null
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string | null
          "short_goal"?: string | null
          "medium_goal"?: string | null
          "long_goal"?: string | null
          "created_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_goal_history_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "athlete_group_members": {
        Row: {
          "id": string,
          "group_id": string | null,
          "athlete_id": string | null,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "group_id"?: string | null
          "athlete_id"?: string | null
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "group_id"?: string | null
          "athlete_id"?: string | null
          "created_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_group_members_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "athlete_groups"
            referencedColumns: ["id"]
          }
        ]
      }
      "athlete_groups": {
        Row: {
          "id": string,
          "name": string,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "name": string
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "name"?: string
          "created_at"?: string | null
        }
        Relationships: []
      }
      "athlete_observations": {
        Row: {
          "id": string,
          "athlete_id": string,
          "title": string,
          "content": string,
          "created_at": string,
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "athlete_id": string
          "title"?: string
          "content"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "athlete_id"?: string
          "title"?: string
          "content"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_observations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "athlete_proposals": {
        Row: {
          "id": string,
          "athlete_id": string | null,
          "date": string | null,
          "type": string | null,
          "title": string | null,
          "message": string | null,
          "status": string | null,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id"?: string | null
          "date"?: string | null
          "type"?: string | null
          "title"?: string | null
          "message"?: string | null
          "status"?: string | null
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string | null
          "date"?: string | null
          "type"?: string | null
          "title"?: string | null
          "message"?: string | null
          "status"?: string | null
          "created_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_proposals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "athlete_test_history": {
        Row: {
          "id": string,
          "athlete_id": string | null,
          "power5": string | null,
          "power12": string | null,
          "power20": string | null,
          "weight": string | null,
          "cp": string | null,
          "w_prime": string | null,
          "watts_per_kg": string | null,
          "zones": Json | null,
          "archived_at": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id"?: string | null
          "power5"?: string | null
          "power12"?: string | null
          "power20"?: string | null
          "weight"?: string | null
          "cp"?: string | null
          "w_prime"?: string | null
          "watts_per_kg"?: string | null
          "zones"?: Json | null
          "archived_at"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string | null
          "power5"?: string | null
          "power12"?: string | null
          "power20"?: string | null
          "weight"?: string | null
          "cp"?: string | null
          "w_prime"?: string | null
          "watts_per_kg"?: string | null
          "zones"?: Json | null
          "archived_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_test_history_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "athlete_week_colors": {
        Row: {
          "id": string,
          "athlete_id": string | null,
          "year": number | null,
          "week": string | null,
          "color_name": string | null,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id"?: string | null
          "year"?: number | null
          "week"?: string | null
          "color_name"?: string | null
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string | null
          "year"?: number | null
          "week"?: string | null
          "color_name"?: string | null
          "created_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_week_colors_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "athlete_week_notes": {
        Row: {
          "id": string,
          "athlete_id": string,
          "year": number,
          "week": string,
          "note": string | null,
          "created_at": string | null,
          "updated_at": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id": string
          "year": number
          "week": string
          "note"?: string | null
          "created_at"?: string | null
          "updated_at"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string
          "year"?: number
          "week"?: string
          "note"?: string | null
          "created_at"?: string | null
          "updated_at"?: string | null
        }
        Relationships: []
      }
      "athlete_week_planning": {
        Row: {
          "id": string,
          "athlete_id": string,
          "year": number,
          "week": string,
          "goal": string,
          "category": string,
          "subcategory": string,
          "coach_comment": string,
          "created_at": string,
          "updated_at": string,
          "status": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id": string
          "year": number
          "week": string
          "goal"?: string
          "category"?: string
          "subcategory"?: string
          "coach_comment"?: string
          "created_at"?: string
          "updated_at"?: string
          "status"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string
          "year"?: number
          "week"?: string
          "goal"?: string
          "category"?: string
          "subcategory"?: string
          "coach_comment"?: string
          "created_at"?: string
          "updated_at"?: string
          "status"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_week_planning_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "athletes": {
        Row: {
          "id": string,
          "name": string,
          "sport": string | null,
          "weight": string | null,
          "ftp": string | null,
          "created_at": string | null,
          "email": string | null,
          "age": string | null,
          "height": string | null,
          "short_goal": string | null,
          "medium_goal": string | null,
          "long_goal": string | null,
          "context": string | null,
          "power5": string | null,
          "power12": string | null,
          "power20": string | null,
          "user_id": string | null,
          "active": boolean,
          "goal_update_requested": boolean | null,
          "color": string | null
        }
        Insert: {
          "id"?: string
          "name": string
          "sport"?: string | null
          "weight"?: string | null
          "ftp"?: string | null
          "created_at"?: string | null
          "email"?: string | null
          "age"?: string | null
          "height"?: string | null
          "short_goal"?: string | null
          "medium_goal"?: string | null
          "long_goal"?: string | null
          "context"?: string | null
          "power5"?: string | null
          "power12"?: string | null
          "power20"?: string | null
          "user_id"?: string | null
          "active"?: boolean
          "goal_update_requested"?: boolean | null
          "color"?: string | null
        }
        Update: {
          "id"?: string
          "name"?: string
          "sport"?: string | null
          "weight"?: string | null
          "ftp"?: string | null
          "created_at"?: string | null
          "email"?: string | null
          "age"?: string | null
          "height"?: string | null
          "short_goal"?: string | null
          "medium_goal"?: string | null
          "long_goal"?: string | null
          "context"?: string | null
          "power5"?: string | null
          "power12"?: string | null
          "power20"?: string | null
          "user_id"?: string | null
          "active"?: boolean
          "goal_update_requested"?: boolean | null
          "color"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      "calendar_workouts": {
        Row: {
          "id": string,
          "athlete_id": string | null,
          "date": string,
          "workout_type": string | null,
          "title": string | null,
          "duration": string | null,
          "completed": boolean | null,
          "created_at": string | null,
          "non_done": boolean | null,
          "non_done_reason": string | null,
          "non_done_fatigue": string | null,
          "non_done_pain": string | null,
          "non_done_comment": string | null,
          "description": string | null,
          "expected_rpe": string | null,
          "blocks": Json | null,
          "subcategory": string | null,
          "expected_rpe_global": number | null,
          "expected_specific_duration": string | null,
          "expected_rpe_specific": number | null,
          "adjusted_specific_duration": string | null,
          "athlete_seen_at": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id"?: string | null
          "date": string
          "workout_type"?: string | null
          "title"?: string | null
          "duration"?: string | null
          "completed"?: boolean | null
          "created_at"?: string | null
          "non_done"?: boolean | null
          "non_done_reason"?: string | null
          "non_done_fatigue"?: string | null
          "non_done_pain"?: string | null
          "non_done_comment"?: string | null
          "description"?: string | null
          "expected_rpe"?: string | null
          "blocks"?: Json | null
          "subcategory"?: string | null
          "expected_rpe_global"?: number | null
          "expected_specific_duration"?: string | null
          "expected_rpe_specific"?: number | null
          "adjusted_specific_duration"?: string | null
          "athlete_seen_at"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string | null
          "date"?: string
          "workout_type"?: string | null
          "title"?: string | null
          "duration"?: string | null
          "completed"?: boolean | null
          "created_at"?: string | null
          "non_done"?: boolean | null
          "non_done_reason"?: string | null
          "non_done_fatigue"?: string | null
          "non_done_pain"?: string | null
          "non_done_comment"?: string | null
          "description"?: string | null
          "expected_rpe"?: string | null
          "blocks"?: Json | null
          "subcategory"?: string | null
          "expected_rpe_global"?: number | null
          "expected_specific_duration"?: string | null
          "expected_rpe_specific"?: number | null
          "adjusted_specific_duration"?: string | null
          "athlete_seen_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_workouts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "group_session_events_v2": {
        Row: {
          "id": string,
          "group_session_id": string,
          "actor_user_id": string,
          "event_type": string,
          "payload": Json,
          "created_at": string
        }
        Insert: {
          "id"?: string
          "group_session_id": string
          "actor_user_id": string
          "event_type": string
          "payload"?: Json
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "group_session_id"?: string
          "actor_user_id"?: string
          "event_type"?: string
          "payload"?: Json
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_session_events_v2_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_session_events_v2_group_session_id_fkey"
            columns: ["group_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions_v2"
            referencedColumns: ["id"]
          }
        ]
      }
      "group_session_participants_v2": {
        Row: {
          "id": string,
          "group_session_id": string,
          "organization_id": string,
          "athlete_membership_id": string,
          "assignment_status": string,
          "assigned_at": string,
          "removed_at": string | null,
          "created_at": string,
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "group_session_id": string
          "organization_id": string
          "athlete_membership_id": string
          "assignment_status"?: string
          "assigned_at"?: string
          "removed_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "group_session_id"?: string
          "organization_id"?: string
          "athlete_membership_id"?: string
          "assignment_status"?: string
          "assigned_at"?: string
          "removed_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_session_participants_v2_group_session_id_organizatio_fkey"
            columns: ["group_session_id","organization_id"]
            isOneToOne: false
            referencedRelation: "group_sessions_v2"
            referencedColumns: ["id","organization_id"]
          },
          {
            foreignKeyName: "group_session_participants_v2_organization_id_athlete_memb_fkey"
            columns: ["organization_id","athlete_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id","id"]
          }
        ]
      }
      "group_sessions_v2": {
        Row: {
          "id": string,
          "organization_id": string,
          "created_by_membership_id": string,
          "source_group_session_id": string | null,
          "scheduled_for": string,
          "status": string,
          "title": string,
          "workout_type": string,
          "subcategory": string,
          "description": string,
          "duration": string,
          "expected_rpe": string,
          "expected_rpe_global": number | null,
          "expected_specific_duration": string,
          "expected_rpe_specific": number | null,
          "blocks": Json,
          "version": number,
          "cancelled_at": string | null,
          "deleted_at": string | null,
          "created_at": string,
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "organization_id": string
          "created_by_membership_id": string
          "source_group_session_id"?: string | null
          "scheduled_for": string
          "status"?: string
          "title": string
          "workout_type"?: string
          "subcategory"?: string
          "description"?: string
          "duration"?: string
          "expected_rpe"?: string
          "expected_rpe_global"?: number | null
          "expected_specific_duration"?: string
          "expected_rpe_specific"?: number | null
          "blocks"?: Json
          "version"?: number
          "cancelled_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "organization_id"?: string
          "created_by_membership_id"?: string
          "source_group_session_id"?: string | null
          "scheduled_for"?: string
          "status"?: string
          "title"?: string
          "workout_type"?: string
          "subcategory"?: string
          "description"?: string
          "duration"?: string
          "expected_rpe"?: string
          "expected_rpe_global"?: number | null
          "expected_specific_duration"?: string
          "expected_rpe_specific"?: number | null
          "blocks"?: Json
          "version"?: number
          "cancelled_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_sessions_v2_organization_id_created_by_membership_id_fkey"
            columns: ["organization_id","created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id","id"]
          },
          {
            foreignKeyName: "group_sessions_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_sessions_v2_source_group_session_id_fkey"
            columns: ["source_group_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions_v2"
            referencedColumns: ["id"]
          }
        ]
      }
      "profiles": {
        Row: {
          "id": string,
          "role": string,
          "coach_code": string | null,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "role"?: string
          "coach_code"?: string | null
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "role"?: string
          "coach_code"?: string | null
          "created_at"?: string | null
        }
        Relationships: []
      }
      "user_roles": {
        Row: {
          "user_id": string,
          "role": string
        }
        Insert: {
          "user_id": string
          "role": string
        }
        Update: {
          "user_id"?: string
          "role"?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      "week_colors": {
        Row: {
          "id": string,
          "athlete_id": string | null,
          "year": number,
          "week": number,
          "color": string,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id"?: string | null
          "year": number
          "week": number
          "color": string
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string | null
          "year"?: number
          "week"?: number
          "color"?: string
          "created_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "week_colors_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "workout_categories": {
        Row: {
          "id": string,
          "name": string,
          "color": string | null,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "name": string
          "color"?: string | null
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "name"?: string
          "color"?: string | null
          "created_at"?: string | null
        }
        Relationships: []
      }
      "workout_feedbacks": {
        Row: {
          "id": string,
          "workout_id": string | null,
          "rpe": number | null,
          "motivation": number | null,
          "pleasure": number | null,
          "comment": string | null,
          "real_duration": string | null,
          "created_at": string | null,
          "rpe_global": number | null,
          "rpe_specific": number | null
        }
        Insert: {
          "id"?: string
          "workout_id"?: string | null
          "rpe"?: number | null
          "motivation"?: number | null
          "pleasure"?: number | null
          "comment"?: string | null
          "real_duration"?: string | null
          "created_at"?: string | null
          "rpe_global"?: number | null
          "rpe_specific"?: number | null
        }
        Update: {
          "id"?: string
          "workout_id"?: string | null
          "rpe"?: number | null
          "motivation"?: number | null
          "pleasure"?: number | null
          "comment"?: string | null
          "real_duration"?: string | null
          "created_at"?: string | null
          "rpe_global"?: number | null
          "rpe_specific"?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_feedbacks_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: true
            referencedRelation: "calendar_workouts"
            referencedColumns: ["id"]
          }
        ]
      }
      "workout_library": {
        Row: {
          "id": string,
          "title": string,
          "category": string | null,
          "duration": string | null,
          "description": string | null,
          "created_at": string | null,
          "blocks": Json | null,
          "subcategory": string | null,
          "total_duration": string | null,
          "expected_rpe": string | null,
          "expected_rpe_global": number | null,
          "expected_specific_duration": string | null,
          "expected_rpe_specific": number | null
        }
        Insert: {
          "id"?: string
          "title": string
          "category"?: string | null
          "duration"?: string | null
          "description"?: string | null
          "created_at"?: string | null
          "blocks"?: Json | null
          "subcategory"?: string | null
          "total_duration"?: string | null
          "expected_rpe"?: string | null
          "expected_rpe_global"?: number | null
          "expected_specific_duration"?: string | null
          "expected_rpe_specific"?: number | null
        }
        Update: {
          "id"?: string
          "title"?: string
          "category"?: string | null
          "duration"?: string | null
          "description"?: string | null
          "created_at"?: string | null
          "blocks"?: Json | null
          "subcategory"?: string | null
          "total_duration"?: string | null
          "expected_rpe"?: string | null
          "expected_rpe_global"?: number | null
          "expected_specific_duration"?: string | null
          "expected_rpe_specific"?: number | null
        }
        Relationships: []
      }
      "workout_proposals": {
        Row: {
          "id": string,
          "athlete_id": string | null,
          "title": string | null,
          "description": string | null,
          "status": string | null,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "athlete_id"?: string | null
          "title"?: string | null
          "description"?: string | null
          "status"?: string | null
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "athlete_id"?: string | null
          "title"?: string | null
          "description"?: string | null
          "status"?: string | null
          "created_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_proposals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          }
        ]
      }
      "workout_subcategories": {
        Row: {
          "id": string,
          "name": string,
          "color": string | null,
          "created_at": string | null
        }
        Insert: {
          "id"?: string
          "name": string
          "color"?: string | null
          "created_at"?: string | null
        }
        Update: {
          "id"?: string
          "name"?: string
          "color"?: string | null
          "created_at"?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      "add_group_session_participant_v2": {
        Args: {
          "p_group_session_id": string
          "p_expected_version": number
          "p_athlete_membership_id": string
        }
        Returns: Json
      }
      "cancel_group_session_v2": {
        Args: {
          "p_group_session_id": string
          "p_expected_version": number
        }
        Returns: Json
      }
      "create_group_session_v2": {
        Args: {
          "p_organization_id": string
          "p_scheduled_for": string
          "p_session_data": Json
          "p_participant_membership_ids": string[]
        }
        Returns: Json
      }
      "delete_group_session_v2": {
        Args: {
          "p_group_session_id": string
          "p_expected_version": number
        }
        Returns: Json
      }
      "duplicate_group_session_v2": {
        Args: {
          "p_group_session_id": string
          "p_expected_version": number
          "p_scheduled_for": string
        }
        Returns: Json
      }
      "get_access_context_v2": {
        Args: Record<string, never>
        Returns: Json
      }
      "is_coach": {
        Args: Record<string, never>
        Returns: boolean
      }
      "link_athlete_invite": {
        Args: {
          "invite_token": string
          "athlete_email": string
          "auth_user_id": string
        }
        | {
          "athlete_id": string
          "athlete_email": string
          "auth_user_id": string
        }
        Returns: string
      }
      "remove_group_session_participant_v2": {
        Args: {
          "p_group_session_id": string
          "p_expected_version": number
          "p_athlete_membership_id": string
        }
        Returns: Json
      }
      "update_group_session_v2": {
        Args: {
          "p_group_session_id": string
          "p_expected_version": number
          "p_session_data": Json
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
  "access_control": {
    Tables: {
      "access_delegations": {
        Row: {
          "id": string,
          "organization_id": string,
          "delegator_membership_id": string,
          "delegatee_membership_id": string,
          "athlete_membership_id": string,
          "capabilities": string[],
          "status": string,
          "starts_at": string,
          "expires_at": string,
          "created_at": string,
          "updated_at": string,
          "revoked_at": string | null
        }
        Insert: {
          "id"?: string
          "organization_id": string
          "delegator_membership_id": string
          "delegatee_membership_id": string
          "athlete_membership_id": string
          "capabilities": string[]
          "status"?: string
          "starts_at"?: string
          "expires_at": string
          "created_at"?: string
          "updated_at"?: string
          "revoked_at"?: string | null
        }
        Update: {
          "id"?: string
          "organization_id"?: string
          "delegator_membership_id"?: string
          "delegatee_membership_id"?: string
          "athlete_membership_id"?: string
          "capabilities"?: string[]
          "status"?: string
          "starts_at"?: string
          "expires_at"?: string
          "created_at"?: string
          "updated_at"?: string
          "revoked_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_delegations_organization_id_athlete_membership_id_fkey"
            columns: ["organization_id","athlete_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id","id"]
          },
          {
            foreignKeyName: "access_delegations_organization_id_delegatee_membership_id_fkey"
            columns: ["organization_id","delegatee_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id","id"]
          },
          {
            foreignKeyName: "access_delegations_organization_id_delegator_membership_id_fkey"
            columns: ["organization_id","delegator_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id","id"]
          },
          {
            foreignKeyName: "access_delegations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      "accounts": {
        Row: {
          "user_id": string,
          "account_status": string,
          "platform_role": string | null,
          "migration_state": string,
          "created_at": string,
          "updated_at": string
        }
        Insert: {
          "user_id": string
          "account_status"?: string
          "platform_role"?: string | null
          "migration_state"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "user_id"?: string
          "account_status"?: string
          "platform_role"?: string | null
          "migration_state"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      "coach_athlete_access": {
        Row: {
          "id": string,
          "organization_id": string,
          "coach_membership_id": string,
          "athlete_membership_id": string,
          "access_role": string,
          "status": string,
          "starts_at": string,
          "ends_at": string | null,
          "created_at": string,
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "organization_id": string
          "coach_membership_id": string
          "athlete_membership_id": string
          "access_role": string
          "status"?: string
          "starts_at"?: string
          "ends_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "organization_id"?: string
          "coach_membership_id"?: string
          "athlete_membership_id"?: string
          "access_role"?: string
          "status"?: string
          "starts_at"?: string
          "ends_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_athlete_access_organization_id_athlete_membership_id_fkey"
            columns: ["organization_id","athlete_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id","id"]
          },
          {
            foreignKeyName: "coach_athlete_access_organization_id_coach_membership_id_fkey"
            columns: ["organization_id","coach_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id","id"]
          },
          {
            foreignKeyName: "coach_athlete_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      "organization_memberships": {
        Row: {
          "id": string,
          "organization_id": string,
          "user_id": string,
          "role": string,
          "status": string,
          "created_at": string,
          "updated_at": string,
          "ended_at": string | null
        }
        Insert: {
          "id"?: string
          "organization_id": string
          "user_id": string
          "role": string
          "status"?: string
          "created_at"?: string
          "updated_at"?: string
          "ended_at"?: string | null
        }
        Update: {
          "id"?: string
          "organization_id"?: string
          "user_id"?: string
          "role"?: string
          "status"?: string
          "created_at"?: string
          "updated_at"?: string
          "ended_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id"]
          }
        ]
      }
      "organizations": {
        Row: {
          "id": string,
          "name": string,
          "status": string,
          "created_at": string,
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "name": string
          "status"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "name"?: string
          "status"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: []
      }
      "pilots": {
        Row: {
          "id": string,
          "organization_id": string | null,
          "user_id": string | null,
          "status": string,
          "starts_at": string,
          "ends_at": string | null,
          "created_at": string,
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "organization_id"?: string | null
          "user_id"?: string | null
          "status"?: string
          "starts_at"?: string
          "ends_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "organization_id"?: string | null
          "user_id"?: string | null
          "status"?: string
          "starts_at"?: string
          "ends_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      "current_account_is_active": {
        Args: Record<string, never>
        Returns: boolean
      }
      "current_user_can_access_athlete": {
        Args: {
          "p_athlete_membership_id": string
        }
        Returns: boolean
      }
      "current_user_can_manage_athlete": {
        Args: {
          "p_athlete_membership_id": string
        }
        Returns: boolean
      }
      "current_user_is_active_member": {
        Args: {
          "p_organization_id": string
        }
        Returns: boolean
      }
      "current_user_is_pilot": {
        Args: Record<string, never>
        Returns: boolean
      }
      "current_user_is_platform_admin": {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
};
