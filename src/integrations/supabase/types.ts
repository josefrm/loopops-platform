export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  public: {
    Tables: {
      agent_messages: {
        Row: {
          agent_data: Json | null;
          agent_id: string | null;
          created_at: number | null;
          extra_data: Json | null;
          memory: Json | null;
          session_data: Json | null;
          session_id: string;
          team_data: Json | null;
          team_id: string | null;
          team_session_id: string | null;
          updated_at: number | null;
          user_id: string | null;
        };
        Insert: {
          agent_data?: Json | null;
          agent_id?: string | null;
          created_at?: number | null;
          extra_data?: Json | null;
          memory?: Json | null;
          session_data?: Json | null;
          session_id: string;
          team_data?: Json | null;
          team_id?: string | null;
          team_session_id?: string | null;
          updated_at?: number | null;
          user_id?: string | null;
        };
        Update: {
          agent_data?: Json | null;
          agent_id?: string | null;
          created_at?: number | null;
          extra_data?: Json | null;
          memory?: Json | null;
          session_data?: Json | null;
          session_id?: string;
          team_data?: Json | null;
          team_id?: string | null;
          team_session_id?: string | null;
          updated_at?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      agent_states: {
        Row: {
          agent_id: string | null;
          created_at: string | null;
          id: string;
          session_id: string | null;
          state_data: Json;
          updated_at: string | null;
        };
        Insert: {
          agent_id?: string | null;
          created_at?: string | null;
          id?: string;
          session_id?: string | null;
          state_data?: Json;
          updated_at?: string | null;
        };
        Update: {
          agent_id?: string | null;
          created_at?: string | null;
          id?: string;
          session_id?: string | null;
          state_data?: Json;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_states_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      agents: {
        Row: {
          agent_id: string | null;
          agent_mode: string | null;
          agent_name: string;
          agent_prompt: string | null;
          agent_role: string | null;
          color: string | null;
          created_at: string | null;
          id: string;
          key: string | null;
          members: string[] | null;
          model: string | null;
          tools: Json | null;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          agent_id?: string | null;
          agent_mode?: string | null;
          agent_name: string;
          agent_prompt?: string | null;
          agent_role?: string | null;
          color?: string | null;
          created_at?: string | null;
          id?: string;
          key?: string | null;
          members?: string[] | null;
          model?: string | null;
          tools?: Json | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          agent_id?: string | null;
          agent_mode?: string | null;
          agent_name?: string;
          agent_prompt?: string | null;
          agent_role?: string | null;
          color?: string | null;
          created_at?: string | null;
          id?: string;
          key?: string | null;
          members?: string[] | null;
          model?: string | null;
          tools?: Json | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'agents_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      alembic_version: {
        Row: {
          version_num: string;
        };
        Insert: {
          version_num: string;
        };
        Update: {
          version_num?: string;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
      chat_histories: {
        Row: {
          created_at: string;
          id: string;
          messages: Json;
          ticket_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          messages?: Json;
          ticket_id?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          messages?: Json;
          ticket_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      custom_agents: {
        Row: {
          color: string | null;
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          key: string | null;
          model: string | null;
          name: string;
          prompt: string | null;
          updated_at: string | null;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          key?: string | null;
          model?: string | null;
          name: string;
          prompt?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          key?: string | null;
          model?: string | null;
          name?: string;
          prompt?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      destinations: {
        Row: {
          content: string | null;
          embedding: string | null;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Update: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      document_processing_queue: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          file_path: string;
          id: number;
          metadata: Json | null;
          status: string | null;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          file_path: string;
          id?: number;
          metadata?: Json | null;
          status?: string | null;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          file_path?: string;
          id?: number;
          metadata?: Json | null;
          status?: string | null;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          content: string | null;
          embedding: string | null;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Update: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      knowledge_documents: {
        Row: {
          content: string;
          content_hash: string | null;
          created_at: string | null;
          embedding: string | null;
          filters: Json | null;
          id: string;
          meta_data: Json | null;
          metadata: Json | null;
          name: string | null;
          usage: Json | null;
          workspace_id: string | null;
        };
        Insert: {
          content: string;
          content_hash?: string | null;
          created_at?: string | null;
          embedding?: string | null;
          filters?: Json | null;
          id: string;
          meta_data?: Json | null;
          metadata?: Json | null;
          name?: string | null;
          usage?: Json | null;
          workspace_id?: string | null;
        };
        Update: {
          content?: string;
          content_hash?: string | null;
          created_at?: string | null;
          embedding?: string | null;
          filters?: Json | null;
          id?: string;
          meta_data?: Json | null;
          metadata?: Json | null;
          name?: string | null;
          usage?: Json | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      knowledge_metadata: {
        Row: {
          created_at: string | null;
          document_id: string;
          document_type: string;
          extraction_method: string | null;
          file_path: string | null;
          file_size: number | null;
          id: string;
          mime_type: string | null;
          processing_completed_at: string | null;
          processing_started_at: string | null;
          status: string | null;
          title: string | null;
          total_chunks: number | null;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          document_id: string;
          document_type: string;
          extraction_method?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string;
          mime_type?: string | null;
          processing_completed_at?: string | null;
          processing_started_at?: string | null;
          status?: string | null;
          title?: string | null;
          total_chunks?: number | null;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          document_id?: string;
          document_type?: string;
          extraction_method?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string;
          mime_type?: string | null;
          processing_completed_at?: string | null;
          processing_started_at?: string | null;
          status?: string | null;
          title?: string | null;
          total_chunks?: number | null;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      llm_models: {
        Row: {
          allowed_mime_types: Json | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean | null;
          max_file_size_mb: number | null;
          max_tokens: number | null;
          name: string;
          provider: string;
          supports_file_upload: boolean | null;
          supports_streaming: boolean | null;
          supports_vision: boolean | null;
          updated_at: string;
        };
        Insert: {
          allowed_mime_types?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_file_size_mb?: number | null;
          max_tokens?: number | null;
          name: string;
          provider: string;
          supports_file_upload?: boolean | null;
          supports_streaming?: boolean | null;
          supports_vision?: boolean | null;
          updated_at?: string;
        };
        Update: {
          allowed_mime_types?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_file_size_mb?: number | null;
          max_tokens?: number | null;
          name?: string;
          provider?: string;
          supports_file_upload?: boolean | null;
          supports_streaming?: boolean | null;
          supports_vision?: boolean | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      loopops_main_sessions: {
        Row: {
          created_at: string;
          id: string;
          session_id: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          session_id: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          session_id?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string;
          created_at: string | null;
          embedding: string | null;
          id: string;
          role: string;
          session_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          role: string;
          session_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          role?: string;
          session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      n8n_chat_histories: {
        Row: {
          id: number;
          message: Json;
          session_id: string;
        };
        Insert: {
          id?: number;
          message: Json;
          session_id: string;
        };
        Update: {
          id?: number;
          message?: Json;
          session_id?: string;
        };
        Relationships: [];
      };
      onboarding_status: {
        Row: {
          company: string | null;
          completed: boolean;
          created_at: string;
          current_step: number;
          id: string;
          jira_token: string | null;
          jira_url: string | null;
          jira_username: string | null;
          role: string | null;
          updated_at: string;
          user_id: string;
          workspace_id: string | null;
        };
        Insert: {
          company?: string | null;
          completed?: boolean;
          created_at?: string;
          current_step?: number;
          id?: string;
          jira_token?: string | null;
          jira_url?: string | null;
          jira_username?: string | null;
          role?: string | null;
          updated_at?: string;
          user_id: string;
          workspace_id?: string | null;
        };
        Update: {
          company?: string | null;
          completed?: boolean;
          created_at?: string;
          current_step?: number;
          id?: string;
          jira_token?: string | null;
          jira_url?: string | null;
          jira_username?: string | null;
          role?: string | null;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_onboarding_workspace';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_workspace_id: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          organization: string | null;
          role: string | null;
          team: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_workspace_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          organization?: string | null;
          role?: string | null;
          team?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_workspace_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          organization?: string | null;
          role?: string | null;
          team?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_current_workspace_id_fkey';
            columns: ['current_workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      session_contexts: {
        Row: {
          created_at: string;
          id: string;
          session_id: string;
          ticket_data: Json | null;
          ticket_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          session_id: string;
          ticket_data?: Json | null;
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          session_id?: string;
          ticket_data?: Json | null;
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_session_contexts_session';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          created_at: string | null;
          id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      team_agents: {
        Row: {
          agent_id: string | null;
          created_at: string | null;
          created_by: string | null;
          custom_agent_id: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          team_id: string;
          updated_at: string | null;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          agent_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          custom_agent_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          team_id: string;
          updated_at?: string | null;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          agent_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          custom_agent_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          team_id?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_agents_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_agents_custom_agent_id_fkey';
            columns: ['custom_agent_id'];
            isOneToOne: false;
            referencedRelation: 'custom_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_agents_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          instructions: string | null;
          key: string | null;
          model: string | null;
          name: string;
          role: string | null;
          updated_at: string | null;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          instructions?: string | null;
          key?: string | null;
          model?: string | null;
          name: string;
          role?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          instructions?: string | null;
          key?: string | null;
          model?: string | null;
          name?: string;
          role?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      workspace_credentials: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean | null;
          secret_id: string | null;
          service: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          secret_id?: string | null;
          service?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          secret_id?: string | null;
          service?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_workspace_credentials_workspace';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_documents: {
        Row: {
          added_to_llm: boolean | null;
          content: string | null;
          created_at: string | null;
          description: string | null;
          embedding: string | null;
          id: string;
          name: string | null;
          tags: string[] | null;
          type: string | null;
          workspace_id: string;
        };
        Insert: {
          added_to_llm?: boolean | null;
          content?: string | null;
          created_at?: string | null;
          description?: string | null;
          embedding?: string | null;
          id?: string;
          name?: string | null;
          tags?: string[] | null;
          type?: string | null;
          workspace_id: string;
        };
        Update: {
          added_to_llm?: boolean | null;
          content?: string | null;
          created_at?: string | null;
          description?: string | null;
          embedding?: string | null;
          id?: string;
          name?: string | null;
          tags?: string[] | null;
          type?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_documents_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_members: {
        Row: {
          id: string;
          is_active: boolean | null;
          joined_at: string;
          role: string;
          team: string | null;
          user_id: string | null;
          workspace_id: string | null;
        };
        Insert: {
          id?: string;
          is_active?: boolean | null;
          joined_at?: string;
          role?: string;
          team?: string | null;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          id?: string;
          is_active?: boolean | null;
          joined_at?: string;
          role?: string;
          team?: string | null;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          description: string | null;
          domain: string | null;
          id: string;
          is_private: boolean;
          name: string;
          organization: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          domain?: string | null;
          id?: string;
          is_private?: boolean;
          name: string;
          organization: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          domain?: string | null;
          id?: string;
          is_private?: boolean;
          name?: string;
          organization?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      loopops_documents: {
        Row: {
          content: string | null;
          created_at: string | null;
          id: string | null;
          origin_session_id: string | null;
          project_id: string | null;
          status: 'draft' | 'review' | 'final' | null;
          title: string | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          id?: string | null;
          origin_session_id?: string | null;
          project_id?: string | null;
          status?: 'draft' | 'review' | 'final' | null;
          title?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          id?: string | null;
          origin_session_id?: string | null;
          project_id?: string | null;
          status?: 'draft' | 'review' | 'final' | null;
          title?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [];
      };
      loopops_global_agent_templates: {
        Row: {
          created_at: string | null;
          default_tools: Json | null;
          id: string | null;
          role_name: string | null;
          system_prompt: string | null;
          type: string | null;
        };
        Insert: {
          created_at?: string | null;
          default_tools?: Json | null;
          id?: string | null;
          role_name?: string | null;
          system_prompt?: string | null;
          type?: string | null;
        };
        Update: {
          created_at?: string | null;
          default_tools?: Json | null;
          id?: string | null;
          role_name?: string | null;
          system_prompt?: string | null;
          type?: string | null;
        };
        Relationships: [];
      };
      loopops_global_deliverable_templates: {
        Row: {
          created_at: string | null;
          id: string | null;
          name: string | null;
          requirements_prompt: string | null;
          stage_template_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          requirements_prompt?: string | null;
          stage_template_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          requirements_prompt?: string | null;
          stage_template_id?: string | null;
        };
        Relationships: [];
      };
      loopops_global_stage_templates: {
        Row: {
          created_at: string | null;
          default_order_index: number | null;
          description: string | null;
          id: string | null;
          name: string | null;
        };
        Insert: {
          created_at?: string | null;
          default_order_index?: number | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
        };
        Update: {
          created_at?: string | null;
          default_order_index?: number | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
        };
        Relationships: [];
      };
      loopops_mindspace_buckets: {
        Row: {
          bucket_name: string | null;
          created_at: string | null;
          id: string | null;
          project_id: string | null;
          user_id: string | null;
          workspace_id: string | null;
        };
        Insert: {
          bucket_name?: string | null;
          created_at?: string | null;
          id?: string | null;
          project_id?: string | null;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          bucket_name?: string | null;
          created_at?: string | null;
          id?: string | null;
          project_id?: string | null;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      loopops_mindspace_files: {
        Row: {
          created_at: string | null;
          created_in_editor: boolean | null;
          file_name: string | null;
          file_path: string | null;
          file_size: number | null;
          id: string | null;
          mime_type: string | null;
          mindspace_bucket_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_in_editor?: boolean | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string | null;
          mime_type?: string | null;
          mindspace_bucket_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_in_editor?: boolean | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string | null;
          mime_type?: string | null;
          mindspace_bucket_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      loopops_project_agents: {
        Row: {
          created_at: string | null;
          custom_prompt_override: string | null;
          custom_tools_override: Json | null;
          id: string | null;
          project_stage_id: string | null;
          template_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          custom_prompt_override?: string | null;
          custom_tools_override?: Json | null;
          id?: string | null;
          project_stage_id?: string | null;
          template_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          custom_prompt_override?: string | null;
          custom_tools_override?: Json | null;
          id?: string | null;
          project_stage_id?: string | null;
          template_id?: string | null;
        };
        Relationships: [];
      };
      loopops_project_buckets: {
        Row: {
          bucket_name: string | null;
          created_at: string | null;
          id: string | null;
          project_id: string | null;
        };
        Insert: {
          bucket_name?: string | null;
          created_at?: string | null;
          id?: string | null;
          project_id?: string | null;
        };
        Update: {
          bucket_name?: string | null;
          created_at?: string | null;
          id?: string | null;
          project_id?: string | null;
        };
        Relationships: [];
      };
      loopops_project_files: {
        Row: {
          created_at: string | null;
          file_name: string | null;
          file_path: string | null;
          file_size: number | null;
          id: string | null;
          mime_type: string | null;
          project_bucket_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string | null;
          mime_type?: string | null;
          project_bucket_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string | null;
          mime_type?: string | null;
          project_bucket_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      loopops_project_stages: {
        Row: {
          completed_at: string | null;
          custom_settings: Json | null;
          id: string | null;
          project_id: string | null;
          started_at: string | null;
          status: 'pending' | 'active' | 'completed' | 'skipped' | null;
          template_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          custom_settings?: Json | null;
          id?: string | null;
          project_id?: string | null;
          started_at?: string | null;
          status?: 'pending' | 'active' | 'completed' | 'skipped' | null;
          template_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          custom_settings?: Json | null;
          id?: string | null;
          project_id?: string | null;
          started_at?: string | null;
          status?: 'pending' | 'active' | 'completed' | 'skipped' | null;
          template_id?: string | null;
        };
        Relationships: [];
      };
      loopops_projects: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string | null;
          name: string | null;
          status: 'planning' | 'active' | 'paused' | 'archived' | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          status?: 'planning' | 'active' | 'paused' | 'archived' | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          status?: 'planning' | 'active' | 'paused' | 'archived' | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      loopops_session_messages: {
        Row: {
          content: string | null;
          created_at: string | null;
          id: string | null;
          role: string | null;
          session_id: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          id?: string | null;
          role?: string | null;
          session_id?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          id?: string | null;
          role?: string | null;
          session_id?: string | null;
        };
        Relationships: [];
      };
      loopops_sessions: {
        Row: {
          agent_instance_id: string | null;
          created_at: string | null;
          id: string | null;
          project_stage_id: string | null;
          title: string | null;
          user_id: string | null;
        };
        Insert: {
          agent_instance_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          project_stage_id?: string | null;
          title?: string | null;
          user_id?: string | null;
        };
        Update: {
          agent_instance_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          project_stage_id?: string | null;
          title?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      loopops_stage_buckets: {
        Row: {
          bucket_name: string | null;
          created_at: string | null;
          id: string | null;
          project_stage_id: string | null;
        };
        Insert: {
          bucket_name?: string | null;
          created_at?: string | null;
          id?: string | null;
          project_stage_id?: string | null;
        };
        Update: {
          bucket_name?: string | null;
          created_at?: string | null;
          id?: string | null;
          project_stage_id?: string | null;
        };
        Relationships: [];
      };
      loopops_stage_files: {
        Row: {
          created_at: string | null;
          file_name: string | null;
          file_path: string | null;
          file_size: number | null;
          id: string | null;
          mime_type: string | null;
          stage_bucket_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string | null;
          mime_type?: string | null;
          stage_bucket_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string | null;
          mime_type?: string | null;
          stage_bucket_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      loopops_threads: {
        Row: {
          created_at: string | null;
          id: string | null;
          is_read_only: boolean | null;
          project_id: string | null;
          stage_id: string | null;
          type: 'project_main' | 'stage_main' | 'plugin_stream' | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          is_read_only?: boolean | null;
          project_id?: string | null;
          stage_id?: string | null;
          type?: 'project_main' | 'stage_main' | 'plugin_stream' | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          is_read_only?: boolean | null;
          project_id?: string | null;
          stage_id?: string | null;
          type?: 'project_main' | 'stage_main' | 'plugin_stream' | null;
        };
        Relationships: [];
      };
      loopops_workspaces: {
        Row: {
          created_at: string | null;
          id: string | null;
          name: string | null;
          owner_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          owner_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          owner_id?: string | null;
        };
        Relationships: [];
      };
      v2_onboarding: {
        Row: {
          completed: boolean | null;
          created_at: string | null;
          id: string | null;
          profile_id: string | null;
          stage: number | null;
          updated_at: string | null;
        };
        Insert: {
          completed?: boolean | null;
          created_at?: string | null;
          id?: string | null;
          profile_id?: string | null;
          stage?: number | null;
          updated_at?: string | null;
        };
        Update: {
          completed?: boolean | null;
          created_at?: string | null;
          id?: string | null;
          profile_id?: string | null;
          stage?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      v2_profile: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string | null;
          name: string | null;
          role: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id?: string | null;
          name?: string | null;
          role?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string | null;
          name?: string | null;
          role?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      v2_project: {
        Row: {
          created_at: string | null;
          id: string | null;
          name: string | null;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      v2_workspace: {
        Row: {
          created_at: string | null;
          id: string | null;
          name: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      v2_workspace_profile: {
        Row: {
          created_at: string | null;
          id: string | null;
          profile_id: string | null;
          role: string | null;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          profile_id?: string | null;
          role?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          profile_id?: string | null;
          role?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_organization_from_email: {
        Args: { email_address: string };
        Returns: string;
      };
      increment_usage: {
        Args: { p_month: number; p_user_id: string; p_year: number };
        Returns: undefined;
      };
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string };
        Returns: {
          content: string;
          id: number;
          metadata: Json;
          similarity: number;
        }[];
      };
      read_secret: { Args: { secret_name: string }; Returns: string };
      reveal_secret: { Args: { secret_id: string }; Returns: string };
      update_secret:
        | {
            Args: { secret_name: string; secret_value: string };
            Returns: string;
          }
        | {
            Args: {
              new_description?: string;
              new_name?: string;
              new_secret?: string;
              secret_id: string;
            };
            Returns: undefined;
          };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
