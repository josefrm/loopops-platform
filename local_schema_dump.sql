

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "loopops";


ALTER SCHEMA "loopops" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "v2";


ALTER SCHEMA "v2" OWNER TO "postgres";


COMMENT ON SCHEMA "v2" IS 'V2 schema exposed to PostgREST API';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "loopops"."doc_status" AS ENUM (
    'draft',
    'review',
    'final'
);


ALTER TYPE "loopops"."doc_status" OWNER TO "postgres";


CREATE TYPE "loopops"."event_source" AS ENUM (
    'user',
    'agent',
    'system',
    'figma_plugin',
    'cursor_plugin'
);


ALTER TYPE "loopops"."event_source" OWNER TO "postgres";


CREATE TYPE "loopops"."project_status" AS ENUM (
    'planning',
    'active',
    'paused',
    'archived'
);


ALTER TYPE "loopops"."project_status" OWNER TO "postgres";


CREATE TYPE "loopops"."stage_status" AS ENUM (
    'pending',
    'active',
    'completed',
    'skipped'
);


ALTER TYPE "loopops"."stage_status" OWNER TO "postgres";


CREATE TYPE "loopops"."thread_type" AS ENUM (
    'project_main',
    'stage_main',
    'plugin_stream'
);


ALTER TYPE "loopops"."thread_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Create profile in v2.profile
  INSERT INTO v2.profile (id, user_id, email)
  VALUES (NEW.id, NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Create onboarding record with stage 0
  INSERT INTO v2.onboarding (profile_id, stage, completed)
  VALUES (NEW.id, 0, false)
  ON CONFLICT DO NOTHING;

  -- Create default user preferences
  INSERT INTO v2.user_preferences (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "v2"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "v2"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "loopops"."document_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid",
    "chunk_index" integer DEFAULT 0,
    "chunk_content" "text",
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."document_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "origin_session_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text",
    "status" "loopops"."doc_status" DEFAULT 'draft'::"loopops"."doc_status",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."global_agent_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_name" "text" NOT NULL,
    "system_prompt" "text" NOT NULL,
    "default_tools" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" character varying(128),
    "stage_template_id" "uuid"
);


ALTER TABLE "loopops"."global_agent_templates" OWNER TO "postgres";


COMMENT ON COLUMN "loopops"."global_agent_templates"."stage_template_id" IS 'Links this agent template to a specific stage template. Each agent template belongs to exactly one stage template.';



CREATE TABLE IF NOT EXISTS "loopops"."global_deliverable_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage_template_id" "uuid",
    "name" "text" NOT NULL,
    "requirements_prompt" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."global_deliverable_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."global_stage_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "default_order_index" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."global_stage_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."global_team_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "stage_template_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "loopops"."global_team_templates" OWNER TO "postgres";


COMMENT ON TABLE "loopops"."global_team_templates" IS 'Stores minimal team template identifiers; full configuration lives in code';



CREATE TABLE IF NOT EXISTS "loopops"."mindspace_buckets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bucket_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."mindspace_buckets" OWNER TO "postgres";


COMMENT ON TABLE "loopops"."mindspace_buckets" IS 'Tracks user-specific Mindspace storage buckets (workspace+project+user)';



CREATE TABLE IF NOT EXISTS "loopops"."mindspace_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mindspace_bucket_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint,
    "mime_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."mindspace_files" OWNER TO "postgres";


COMMENT ON TABLE "loopops"."mindspace_files" IS 'Tracks files stored in Mindspace buckets';



CREATE TABLE IF NOT EXISTS "loopops"."plugin_auth_codes" (
    "code" character varying(6) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "plugin_type" character varying(50) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_plugin_auth_codes_expires_at_future" CHECK (("expires_at" > "now"())),
    CONSTRAINT "chk_plugin_auth_codes_plugin_type" CHECK ((("plugin_type")::"text" = ANY ((ARRAY['FIGMA'::character varying, 'SLACK'::character varying, 'NOTION'::character varying, 'LINEAR'::character varying])::"text"[])))
);


ALTER TABLE "loopops"."plugin_auth_codes" OWNER TO "postgres";


COMMENT ON TABLE "loopops"."plugin_auth_codes" IS 'Stores temporary authentication codes for plugins to securely link users with specific projects and workspaces. These codes are used for one-time plugin integrations and expire automatically.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."code" IS 'Unique 6-digit authentication code used by plugins for integration. Acts as the primary lookup key.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."user_id" IS 'Reference to the user who requested the authentication code. Foreign key to auth.users table.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."project_id" IS 'Reference to the project this auth code is linked to. Foreign key to loopops.projects table.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."workspace_id" IS 'Reference to the workspace this auth code belongs to. Foreign key to loopops.workspaces table.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."plugin_type" IS 'Type of plugin this auth code is for (FIGMA, SLACK, NOTION, LINEAR). Used to enforce one active code per plugin per user.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."expires_at" IS 'Timestamp when this authentication code expires and becomes invalid. Codes have a 5-minute TTL.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."used" IS 'Flag indicating if this code has been used/exchanged for a token. One-time use only.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."created_at" IS 'Timestamp when this authentication code was created. Automatically set to current time.';



COMMENT ON COLUMN "loopops"."plugin_auth_codes"."updated_at" IS 'Timestamp when this authentication code was last updated. Automatically updated on modifications.';



COMMENT ON CONSTRAINT "chk_plugin_auth_codes_expires_at_future" ON "loopops"."plugin_auth_codes" IS 'Ensures that authentication codes cannot be created with past expiration dates, preventing invalid codes.';



COMMENT ON CONSTRAINT "chk_plugin_auth_codes_plugin_type" ON "loopops"."plugin_auth_codes" IS 'Ensures plugin_type is one of the supported plugin types: FIGMA, SLACK, NOTION, or LINEAR.';



CREATE TABLE IF NOT EXISTS "loopops"."plugin_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "source_tool" "loopops"."event_source" NOT NULL,
    "external_user_id" "text",
    "activity_type" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."plugin_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."project_agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_stage_id" "uuid",
    "template_id" "uuid",
    "custom_prompt_override" "text",
    "custom_tools_override" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."project_agents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."project_buckets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "bucket_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."project_buckets" OWNER TO "postgres";


COMMENT ON TABLE "loopops"."project_buckets" IS 'Tracks project-specific storage buckets';



CREATE TABLE IF NOT EXISTS "loopops"."project_deliverables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_stage_id" "uuid",
    "template_id" "uuid",
    "is_completed" boolean DEFAULT false,
    "completion_metadata" "jsonb",
    "final_document_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."project_deliverables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."project_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_bucket_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint,
    "mime_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."project_files" OWNER TO "postgres";


COMMENT ON TABLE "loopops"."project_files" IS 'Tracks files stored in project buckets';



CREATE TABLE IF NOT EXISTS "loopops"."project_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "template_id" "uuid",
    "status" "loopops"."stage_status" DEFAULT 'pending'::"loopops"."stage_status",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "custom_settings" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "loopops"."project_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "status" "loopops"."project_status" DEFAULT 'planning'::"loopops"."project_status",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."session_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."session_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_stage_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "agent_instance_id" "uuid",
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."stage_buckets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_stage_id" "uuid" NOT NULL,
    "bucket_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."stage_buckets" OWNER TO "postgres";


COMMENT ON TABLE "loopops"."stage_buckets" IS 'Tracks stage-specific storage buckets';



CREATE TABLE IF NOT EXISTS "loopops"."stage_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage_bucket_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint,
    "mime_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "mindspace_file_id" "uuid"
);


ALTER TABLE "loopops"."stage_files" OWNER TO "postgres";


COMMENT ON TABLE "loopops"."stage_files" IS 'Tracks files stored in stage buckets';



COMMENT ON COLUMN "loopops"."stage_files"."mindspace_file_id" IS 'References the original mindspace file if this stage file was copied from mindspace. NULL if uploaded directly to stage.';



CREATE TABLE IF NOT EXISTS "loopops"."thread_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid",
    "event_type" "text" NOT NULL,
    "summary_content" "text" NOT NULL,
    "source_document_id" "uuid",
    "source_plugin_event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."thread_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "stage_id" "uuid",
    "type" "loopops"."thread_type" NOT NULL,
    "is_read_only" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "loopops"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "loopops"."workspaces" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_documents" WITH ("security_invoker"='on') AS
 SELECT "documents"."id",
    "documents"."project_id",
    "documents"."origin_session_id",
    "documents"."title",
    "documents"."content",
    "documents"."status",
    "documents"."version",
    "documents"."created_at",
    "documents"."updated_at"
   FROM "loopops"."documents";


ALTER TABLE "public"."loopops_documents" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_documents" IS 'Public view for loopops.documents table';



CREATE OR REPLACE VIEW "public"."loopops_global_agent_templates" WITH ("security_invoker"='on') AS
 SELECT "global_agent_templates"."id",
    "global_agent_templates"."role_name",
    "global_agent_templates"."system_prompt",
    "global_agent_templates"."default_tools",
    "global_agent_templates"."created_at",
    "global_agent_templates"."type",
    "global_agent_templates"."stage_template_id"
   FROM "loopops"."global_agent_templates";


ALTER TABLE "public"."loopops_global_agent_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_global_deliverable_templates" WITH ("security_invoker"='on') AS
 SELECT "global_deliverable_templates"."id",
    "global_deliverable_templates"."stage_template_id",
    "global_deliverable_templates"."name",
    "global_deliverable_templates"."requirements_prompt",
    "global_deliverable_templates"."created_at"
   FROM "loopops"."global_deliverable_templates";


ALTER TABLE "public"."loopops_global_deliverable_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_global_stage_templates" WITH ("security_invoker"='on') AS
 SELECT "global_stage_templates"."id",
    "global_stage_templates"."name",
    "global_stage_templates"."description",
    "global_stage_templates"."default_order_index",
    "global_stage_templates"."created_at"
   FROM "loopops"."global_stage_templates";


ALTER TABLE "public"."loopops_global_stage_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_mindspace_buckets" WITH ("security_invoker"='on') AS
 SELECT "mindspace_buckets"."id",
    "mindspace_buckets"."workspace_id",
    "mindspace_buckets"."project_id",
    "mindspace_buckets"."user_id",
    "mindspace_buckets"."bucket_name",
    "mindspace_buckets"."created_at"
   FROM "loopops"."mindspace_buckets";


ALTER TABLE "public"."loopops_mindspace_buckets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_mindspace_files" WITH ("security_invoker"='on') AS
 SELECT "mindspace_files"."id",
    "mindspace_files"."mindspace_bucket_id",
    "mindspace_files"."file_path",
    "mindspace_files"."file_name",
    "mindspace_files"."file_size",
    "mindspace_files"."mime_type",
    "mindspace_files"."created_at",
    "mindspace_files"."updated_at"
   FROM "loopops"."mindspace_files";


ALTER TABLE "public"."loopops_mindspace_files" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_plugin_auth_codes" WITH ("security_invoker"='on') AS
 SELECT "plugin_auth_codes"."code",
    "plugin_auth_codes"."user_id",
    "plugin_auth_codes"."project_id",
    "plugin_auth_codes"."workspace_id",
    "plugin_auth_codes"."plugin_type",
    "plugin_auth_codes"."expires_at",
    "plugin_auth_codes"."used",
    "plugin_auth_codes"."created_at",
    "plugin_auth_codes"."updated_at"
   FROM "loopops"."plugin_auth_codes";


ALTER TABLE "public"."loopops_plugin_auth_codes" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_plugin_auth_codes" IS 'Public view for loopops.plugin_auth_codes table';



CREATE OR REPLACE VIEW "public"."loopops_project_agents" WITH ("security_invoker"='on') AS
 SELECT "project_agents"."id",
    "project_agents"."project_stage_id",
    "project_agents"."template_id",
    "project_agents"."custom_prompt_override",
    "project_agents"."custom_tools_override",
    "project_agents"."created_at"
   FROM "loopops"."project_agents";


ALTER TABLE "public"."loopops_project_agents" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_project_agents" IS 'Public view for loopops.project_agents table';



CREATE OR REPLACE VIEW "public"."loopops_project_buckets" WITH ("security_invoker"='on') AS
 SELECT "project_buckets"."id",
    "project_buckets"."project_id",
    "project_buckets"."bucket_name",
    "project_buckets"."created_at"
   FROM "loopops"."project_buckets";


ALTER TABLE "public"."loopops_project_buckets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_project_files" WITH ("security_invoker"='on') AS
 SELECT "project_files"."id",
    "project_files"."project_bucket_id",
    "project_files"."file_path",
    "project_files"."file_name",
    "project_files"."file_size",
    "project_files"."mime_type",
    "project_files"."created_at",
    "project_files"."updated_at"
   FROM "loopops"."project_files";


ALTER TABLE "public"."loopops_project_files" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_project_stages" WITH ("security_invoker"='on') AS
 SELECT "project_stages"."id",
    "project_stages"."project_id",
    "project_stages"."template_id",
    "project_stages"."status",
    "project_stages"."started_at",
    "project_stages"."completed_at",
    "project_stages"."custom_settings"
   FROM "loopops"."project_stages";


ALTER TABLE "public"."loopops_project_stages" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_project_stages" IS 'Public view for loopops.project_stages table';



CREATE OR REPLACE VIEW "public"."loopops_projects" WITH ("security_invoker"='on') AS
 SELECT "projects"."id",
    "projects"."workspace_id",
    "projects"."name",
    "projects"."description",
    "projects"."status",
    "projects"."created_at"
   FROM "loopops"."projects";


ALTER TABLE "public"."loopops_projects" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_projects" IS 'Public view for loopops.projects table';



CREATE OR REPLACE VIEW "public"."loopops_session_messages" WITH ("security_invoker"='on') AS
 SELECT "session_messages"."id",
    "session_messages"."session_id",
    "session_messages"."role",
    "session_messages"."content",
    "session_messages"."created_at"
   FROM "loopops"."session_messages";


ALTER TABLE "public"."loopops_session_messages" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_session_messages" IS 'Public view for loopops.session_messages table';



CREATE OR REPLACE VIEW "public"."loopops_sessions" WITH ("security_invoker"='on') AS
 SELECT "sessions"."id",
    "sessions"."project_stage_id",
    "sessions"."user_id",
    "sessions"."agent_instance_id",
    "sessions"."title",
    "sessions"."created_at"
   FROM "loopops"."sessions";


ALTER TABLE "public"."loopops_sessions" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_sessions" IS 'Public view for loopops.sessions table';



CREATE OR REPLACE VIEW "public"."loopops_stage_buckets" WITH ("security_invoker"='on') AS
 SELECT "stage_buckets"."id",
    "stage_buckets"."project_stage_id",
    "stage_buckets"."bucket_name",
    "stage_buckets"."created_at"
   FROM "loopops"."stage_buckets";


ALTER TABLE "public"."loopops_stage_buckets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_stage_files" WITH ("security_invoker"='on') AS
 SELECT "stage_files"."id",
    "stage_files"."stage_bucket_id",
    "stage_files"."file_path",
    "stage_files"."file_name",
    "stage_files"."file_size",
    "stage_files"."mime_type",
    "stage_files"."created_at",
    "stage_files"."updated_at"
   FROM "loopops"."stage_files";


ALTER TABLE "public"."loopops_stage_files" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loopops_threads" WITH ("security_invoker"='on') AS
 SELECT "threads"."id",
    "threads"."project_id",
    "threads"."stage_id",
    "threads"."type",
    "threads"."is_read_only",
    "threads"."created_at"
   FROM "loopops"."threads";


ALTER TABLE "public"."loopops_threads" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_threads" IS 'Public view for loopops.threads table';



CREATE OR REPLACE VIEW "public"."loopops_workspaces" WITH ("security_invoker"='on') AS
 SELECT "workspaces"."id",
    "workspaces"."name",
    "workspaces"."owner_id",
    "workspaces"."created_at"
   FROM "loopops"."workspaces";


ALTER TABLE "public"."loopops_workspaces" OWNER TO "postgres";


COMMENT ON VIEW "public"."loopops_workspaces" IS 'Public view for loopops.workspaces table';



CREATE TABLE IF NOT EXISTS "v2"."onboarding" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_id" "uuid",
    "stage" integer DEFAULT 0,
    "completed" boolean DEFAULT false,
    "onboarding_details" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "v2"."onboarding" OWNER TO "postgres";


COMMENT ON TABLE "v2"."onboarding" IS 'User onboarding data and progress tracking';



COMMENT ON COLUMN "v2"."onboarding"."profile_id" IS 'Reference to v2.profile';



COMMENT ON COLUMN "v2"."onboarding"."stage" IS 'Current onboarding stage (0-3)';



COMMENT ON COLUMN "v2"."onboarding"."completed" IS 'Whether onboarding is completed';



COMMENT ON COLUMN "v2"."onboarding"."onboarding_details" IS 'Detailed tracking of onboarding steps completion';



CREATE OR REPLACE VIEW "public"."v2_onboarding" WITH ("security_invoker"='on') AS
 SELECT "onboarding"."id",
    "onboarding"."created_at",
    "onboarding"."updated_at",
    "onboarding"."profile_id",
    "onboarding"."stage",
    "onboarding"."completed"
   FROM "v2"."onboarding";


ALTER TABLE "public"."v2_onboarding" OWNER TO "postgres";


COMMENT ON VIEW "public"."v2_onboarding" IS 'Public view for v2.onboarding table';



CREATE TABLE IF NOT EXISTS "v2"."profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "name" "text",
    "role" "text",
    "email" "text"
);


ALTER TABLE "v2"."profile" OWNER TO "postgres";


COMMENT ON TABLE "v2"."profile" IS 'User profile information';



COMMENT ON COLUMN "v2"."profile"."user_id" IS 'Reference to auth.users';



COMMENT ON COLUMN "v2"."profile"."name" IS 'User full name';



COMMENT ON COLUMN "v2"."profile"."role" IS 'User role (optional)';



COMMENT ON COLUMN "v2"."profile"."email" IS 'User email address';



CREATE OR REPLACE VIEW "public"."v2_profile" WITH ("security_invoker"='on') AS
 SELECT "profile"."id",
    "profile"."created_at",
    "profile"."updated_at",
    "profile"."user_id",
    "profile"."name",
    "profile"."role",
    "profile"."email"
   FROM "v2"."profile";


ALTER TABLE "public"."v2_profile" OWNER TO "postgres";


COMMENT ON VIEW "public"."v2_profile" IS 'Public view for v2.profile table';



CREATE TABLE IF NOT EXISTS "v2"."project" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "workspace_id" "uuid"
);


ALTER TABLE "v2"."project" OWNER TO "postgres";


COMMENT ON TABLE "v2"."project" IS 'Project management within workspaces';



COMMENT ON COLUMN "v2"."project"."name" IS 'Project name';



COMMENT ON COLUMN "v2"."project"."workspace_id" IS 'Reference to v2.workspace';



CREATE OR REPLACE VIEW "public"."v2_project" WITH ("security_invoker"='on') AS
 SELECT "project"."id",
    "project"."created_at",
    "project"."updated_at",
    "project"."name",
    "project"."workspace_id"
   FROM "v2"."project";


ALTER TABLE "public"."v2_project" OWNER TO "postgres";


COMMENT ON VIEW "public"."v2_project" IS 'Public view for v2.project table';



CREATE TABLE IF NOT EXISTS "v2"."workspace" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "v2"."workspace" OWNER TO "postgres";


COMMENT ON TABLE "v2"."workspace" IS 'Workspace management and configuration';



COMMENT ON COLUMN "v2"."workspace"."name" IS 'Name of the workspace';



CREATE OR REPLACE VIEW "public"."v2_workspace" WITH ("security_invoker"='on') AS
 SELECT "workspace"."id",
    "workspace"."created_at",
    "workspace"."updated_at",
    "workspace"."name"
   FROM "v2"."workspace";


ALTER TABLE "public"."v2_workspace" OWNER TO "postgres";


COMMENT ON VIEW "public"."v2_workspace" IS 'Public view for v2.workspace table';



CREATE TABLE IF NOT EXISTS "v2"."workspace_profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "v2"."workspace_profile" OWNER TO "postgres";


COMMENT ON TABLE "v2"."workspace_profile" IS 'Junction table linking workspaces to profiles (users)';



COMMENT ON COLUMN "v2"."workspace_profile"."role" IS 'User role within the workspace (e.g., admin, member)';



CREATE OR REPLACE VIEW "public"."v2_workspace_profile" WITH ("security_invoker"='on') AS
 SELECT "workspace_profile"."id",
    "workspace_profile"."workspace_id",
    "workspace_profile"."profile_id",
    "workspace_profile"."role",
    "workspace_profile"."created_at",
    "workspace_profile"."updated_at"
   FROM "v2"."workspace_profile";


ALTER TABLE "public"."v2_workspace_profile" OWNER TO "postgres";


COMMENT ON VIEW "public"."v2_workspace_profile" IS 'Public view for v2.workspace_profile table';



CREATE TABLE IF NOT EXISTS "v2"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "mindspace_categories" "jsonb" DEFAULT '[{"id": 1, "name": "All", "priority": 1}, {"id": 2, "name": "Client", "priority": 2}, {"id": 3, "name": "Snippets", "priority": 3}, {"id": 4, "name": "Notes", "priority": 4}]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "v2"."user_preferences" OWNER TO "postgres";


COMMENT ON TABLE "v2"."user_preferences" IS 'Stores user specific settings and preferences';



COMMENT ON COLUMN "v2"."user_preferences"."mindspace_categories" IS 'JSONB array of user defined mindspace categories';



ALTER TABLE ONLY "loopops"."document_embeddings"
    ADD CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."global_agent_templates"
    ADD CONSTRAINT "global_agent_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."global_deliverable_templates"
    ADD CONSTRAINT "global_deliverable_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."global_stage_templates"
    ADD CONSTRAINT "global_stage_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."global_team_templates"
    ADD CONSTRAINT "global_team_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "loopops"."global_team_templates"
    ADD CONSTRAINT "global_team_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."mindspace_buckets"
    ADD CONSTRAINT "mindspace_buckets_bucket_name_key" UNIQUE ("bucket_name");



ALTER TABLE ONLY "loopops"."mindspace_buckets"
    ADD CONSTRAINT "mindspace_buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."mindspace_files"
    ADD CONSTRAINT "mindspace_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."plugin_auth_codes"
    ADD CONSTRAINT "plugin_auth_codes_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "loopops"."plugin_events"
    ADD CONSTRAINT "plugin_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."project_agents"
    ADD CONSTRAINT "project_agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."project_buckets"
    ADD CONSTRAINT "project_buckets_bucket_name_key" UNIQUE ("bucket_name");



ALTER TABLE ONLY "loopops"."project_buckets"
    ADD CONSTRAINT "project_buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."project_files"
    ADD CONSTRAINT "project_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."project_stages"
    ADD CONSTRAINT "project_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."session_messages"
    ADD CONSTRAINT "session_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."stage_buckets"
    ADD CONSTRAINT "stage_buckets_bucket_name_key" UNIQUE ("bucket_name");



ALTER TABLE ONLY "loopops"."stage_buckets"
    ADD CONSTRAINT "stage_buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."stage_files"
    ADD CONSTRAINT "stage_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."thread_events"
    ADD CONSTRAINT "thread_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."threads"
    ADD CONSTRAINT "threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "loopops"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "v2"."onboarding"
    ADD CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "v2"."profile"
    ADD CONSTRAINT "profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "v2"."profile"
    ADD CONSTRAINT "profile_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "v2"."project"
    ADD CONSTRAINT "project_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "v2"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "v2"."user_preferences"
    ADD CONSTRAINT "user_preferences_profile_id_key" UNIQUE ("profile_id");



ALTER TABLE ONLY "v2"."workspace"
    ADD CONSTRAINT "workspace_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "v2"."workspace_profile"
    ADD CONSTRAINT "workspace_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "v2"."workspace_profile"
    ADD CONSTRAINT "workspace_profile_workspace_id_profile_id_key" UNIQUE ("workspace_id", "profile_id");



CREATE INDEX "idx_global_team_templates_name" ON "loopops"."global_team_templates" USING "btree" ("name");



CREATE INDEX "idx_global_team_templates_stage" ON "loopops"."global_team_templates" USING "btree" ("stage_template_id");



CREATE INDEX "idx_mindspace_buckets_project_id" ON "loopops"."mindspace_buckets" USING "btree" ("project_id");



CREATE UNIQUE INDEX "idx_mindspace_buckets_unique" ON "loopops"."mindspace_buckets" USING "btree" ("workspace_id", "project_id", "user_id");



CREATE INDEX "idx_mindspace_buckets_user_id" ON "loopops"."mindspace_buckets" USING "btree" ("user_id");



CREATE INDEX "idx_mindspace_buckets_workspace_id" ON "loopops"."mindspace_buckets" USING "btree" ("workspace_id");



CREATE INDEX "idx_mindspace_files_bucket_id" ON "loopops"."mindspace_files" USING "btree" ("mindspace_bucket_id");



CREATE INDEX "idx_plugin_auth_codes_expires_at" ON "loopops"."plugin_auth_codes" USING "btree" ("expires_at");



COMMENT ON INDEX "loopops"."idx_plugin_auth_codes_expires_at" IS 'Index on expires_at for efficient cleanup of expired codes and expiration checks.';



CREATE INDEX "idx_plugin_auth_codes_project_id" ON "loopops"."plugin_auth_codes" USING "btree" ("project_id");



COMMENT ON INDEX "loopops"."idx_plugin_auth_codes_project_id" IS 'Index on project_id for efficient project-specific queries.';



CREATE INDEX "idx_plugin_auth_codes_user_id" ON "loopops"."plugin_auth_codes" USING "btree" ("user_id");



COMMENT ON INDEX "loopops"."idx_plugin_auth_codes_user_id" IS 'Index on user_id for efficient user-specific queries and RLS policy enforcement.';



CREATE INDEX "idx_plugin_auth_codes_user_project_plugin" ON "loopops"."plugin_auth_codes" USING "btree" ("user_id", "project_id", "plugin_type");



COMMENT ON INDEX "loopops"."idx_plugin_auth_codes_user_project_plugin" IS 'Composite index for checking existing active codes per user, project, and plugin type.';



CREATE INDEX "idx_plugin_auth_codes_workspace_id" ON "loopops"."plugin_auth_codes" USING "btree" ("workspace_id");



COMMENT ON INDEX "loopops"."idx_plugin_auth_codes_workspace_id" IS 'Index on workspace_id for efficient workspace-specific queries.';



CREATE INDEX "idx_project_buckets_project_id" ON "loopops"."project_buckets" USING "btree" ("project_id");



CREATE UNIQUE INDEX "idx_project_buckets_unique" ON "loopops"."project_buckets" USING "btree" ("project_id");



CREATE INDEX "idx_project_files_bucket_id" ON "loopops"."project_files" USING "btree" ("project_bucket_id");



CREATE INDEX "idx_stage_buckets_stage_id" ON "loopops"."stage_buckets" USING "btree" ("project_stage_id");



CREATE UNIQUE INDEX "idx_stage_buckets_unique" ON "loopops"."stage_buckets" USING "btree" ("project_stage_id");



CREATE INDEX "idx_stage_files_bucket_id" ON "loopops"."stage_files" USING "btree" ("stage_bucket_id");



CREATE INDEX "idx_stage_files_mindspace_file_id" ON "loopops"."stage_files" USING "btree" ("mindspace_file_id");



CREATE UNIQUE INDEX "idx_stage_files_unique_mindspace_per_bucket" ON "loopops"."stage_files" USING "btree" ("stage_bucket_id", "mindspace_file_id") WHERE ("mindspace_file_id" IS NOT NULL);



CREATE INDEX "idx_onboarding_profile_id" ON "v2"."onboarding" USING "btree" ("profile_id");



CREATE INDEX "idx_profile_user_id" ON "v2"."profile" USING "btree" ("user_id");



CREATE INDEX "idx_project_workspace_id" ON "v2"."project" USING "btree" ("workspace_id");



CREATE INDEX "idx_workspace_profile_profile_id" ON "v2"."workspace_profile" USING "btree" ("profile_id");



CREATE INDEX "idx_workspace_profile_workspace_id" ON "v2"."workspace_profile" USING "btree" ("workspace_id");



CREATE OR REPLACE TRIGGER "update_onboarding_updated_at" BEFORE UPDATE ON "v2"."onboarding" FOR EACH ROW EXECUTE FUNCTION "v2"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profile_updated_at" BEFORE UPDATE ON "v2"."profile" FOR EACH ROW EXECUTE FUNCTION "v2"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_project_updated_at" BEFORE UPDATE ON "v2"."project" FOR EACH ROW EXECUTE FUNCTION "v2"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "v2"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "v2"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_workspace_profile_updated_at" BEFORE UPDATE ON "v2"."workspace_profile" FOR EACH ROW EXECUTE FUNCTION "v2"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_workspace_updated_at" BEFORE UPDATE ON "v2"."workspace" FOR EACH ROW EXECUTE FUNCTION "v2"."update_updated_at_column"();



ALTER TABLE ONLY "loopops"."document_embeddings"
    ADD CONSTRAINT "document_embeddings_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "loopops"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."documents"
    ADD CONSTRAINT "documents_origin_session_id_fkey" FOREIGN KEY ("origin_session_id") REFERENCES "loopops"."sessions"("id");



ALTER TABLE ONLY "loopops"."documents"
    ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "loopops"."projects"("id");



ALTER TABLE ONLY "loopops"."project_deliverables"
    ADD CONSTRAINT "fk_final_doc" FOREIGN KEY ("final_document_id") REFERENCES "loopops"."documents"("id");



ALTER TABLE ONLY "loopops"."plugin_auth_codes"
    ADD CONSTRAINT "fk_plugin_auth_codes_project_id" FOREIGN KEY ("project_id") REFERENCES "loopops"."projects"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "fk_plugin_auth_codes_project_id" ON "loopops"."plugin_auth_codes" IS 'Ensures project_id references a valid project. Deletes auth codes when project is deleted.';



ALTER TABLE ONLY "loopops"."plugin_auth_codes"
    ADD CONSTRAINT "fk_plugin_auth_codes_user_id" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "fk_plugin_auth_codes_user_id" ON "loopops"."plugin_auth_codes" IS 'Ensures user_id references a valid user in the auth schema. Deletes auth codes when user is deleted.';



ALTER TABLE ONLY "loopops"."plugin_auth_codes"
    ADD CONSTRAINT "fk_plugin_auth_codes_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "loopops"."workspaces"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "fk_plugin_auth_codes_workspace_id" ON "loopops"."plugin_auth_codes" IS 'Ensures workspace_id references a valid workspace. Deletes auth codes when workspace is deleted.';



ALTER TABLE ONLY "loopops"."global_team_templates"
    ADD CONSTRAINT "fk_team_stage_template" FOREIGN KEY ("stage_template_id") REFERENCES "loopops"."global_stage_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "loopops"."global_agent_templates"
    ADD CONSTRAINT "global_agent_templates_stage_template_id_fkey" FOREIGN KEY ("stage_template_id") REFERENCES "loopops"."global_stage_templates"("id");



ALTER TABLE ONLY "loopops"."global_deliverable_templates"
    ADD CONSTRAINT "global_deliverable_templates_stage_template_id_fkey" FOREIGN KEY ("stage_template_id") REFERENCES "loopops"."global_stage_templates"("id");



ALTER TABLE ONLY "loopops"."mindspace_buckets"
    ADD CONSTRAINT "mindspace_buckets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "loopops"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."mindspace_buckets"
    ADD CONSTRAINT "mindspace_buckets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "loopops"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."mindspace_files"
    ADD CONSTRAINT "mindspace_files_mindspace_bucket_id_fkey" FOREIGN KEY ("mindspace_bucket_id") REFERENCES "loopops"."mindspace_buckets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."plugin_events"
    ADD CONSTRAINT "plugin_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "loopops"."projects"("id");



ALTER TABLE ONLY "loopops"."project_agents"
    ADD CONSTRAINT "project_agents_project_stage_id_fkey" FOREIGN KEY ("project_stage_id") REFERENCES "loopops"."project_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."project_agents"
    ADD CONSTRAINT "project_agents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "loopops"."global_agent_templates"("id");



ALTER TABLE ONLY "loopops"."project_buckets"
    ADD CONSTRAINT "project_buckets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "loopops"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_project_stage_id_fkey" FOREIGN KEY ("project_stage_id") REFERENCES "loopops"."project_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "loopops"."global_deliverable_templates"("id");



ALTER TABLE ONLY "loopops"."project_files"
    ADD CONSTRAINT "project_files_project_bucket_id_fkey" FOREIGN KEY ("project_bucket_id") REFERENCES "loopops"."project_buckets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."project_stages"
    ADD CONSTRAINT "project_stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "loopops"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."project_stages"
    ADD CONSTRAINT "project_stages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "loopops"."global_stage_templates"("id");



ALTER TABLE ONLY "loopops"."projects"
    ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "loopops"."workspaces"("id");



ALTER TABLE ONLY "loopops"."session_messages"
    ADD CONSTRAINT "session_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "loopops"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."sessions"
    ADD CONSTRAINT "sessions_agent_instance_id_fkey" FOREIGN KEY ("agent_instance_id") REFERENCES "loopops"."project_agents"("id");



ALTER TABLE ONLY "loopops"."sessions"
    ADD CONSTRAINT "sessions_project_stage_id_fkey" FOREIGN KEY ("project_stage_id") REFERENCES "loopops"."project_stages"("id");



ALTER TABLE ONLY "loopops"."stage_buckets"
    ADD CONSTRAINT "stage_buckets_project_stage_id_fkey" FOREIGN KEY ("project_stage_id") REFERENCES "loopops"."project_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."stage_files"
    ADD CONSTRAINT "stage_files_mindspace_file_id_fkey" FOREIGN KEY ("mindspace_file_id") REFERENCES "loopops"."mindspace_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "loopops"."stage_files"
    ADD CONSTRAINT "stage_files_stage_bucket_id_fkey" FOREIGN KEY ("stage_bucket_id") REFERENCES "loopops"."stage_buckets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."thread_events"
    ADD CONSTRAINT "thread_events_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "loopops"."documents"("id");



ALTER TABLE ONLY "loopops"."thread_events"
    ADD CONSTRAINT "thread_events_source_plugin_event_id_fkey" FOREIGN KEY ("source_plugin_event_id") REFERENCES "loopops"."plugin_events"("id");



ALTER TABLE ONLY "loopops"."thread_events"
    ADD CONSTRAINT "thread_events_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "loopops"."threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "loopops"."threads"
    ADD CONSTRAINT "threads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "loopops"."projects"("id");



ALTER TABLE ONLY "loopops"."threads"
    ADD CONSTRAINT "threads_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "loopops"."project_stages"("id");



ALTER TABLE ONLY "v2"."onboarding"
    ADD CONSTRAINT "onboarding_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "v2"."profile"("id");



ALTER TABLE ONLY "v2"."profile"
    ADD CONSTRAINT "profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "v2"."project"
    ADD CONSTRAINT "project_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "v2"."workspace"("id");



ALTER TABLE ONLY "v2"."user_preferences"
    ADD CONSTRAINT "user_preferences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "v2"."profile"("id");



ALTER TABLE ONLY "v2"."workspace_profile"
    ADD CONSTRAINT "workspace_profile_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "v2"."profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "v2"."workspace_profile"
    ADD CONSTRAINT "workspace_profile_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "v2"."workspace"("id") ON DELETE CASCADE;



CREATE POLICY "Service role can manage all mindspace buckets" ON "loopops"."mindspace_buckets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all mindspace files" ON "loopops"."mindspace_files" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all project buckets" ON "loopops"."project_buckets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all project files" ON "loopops"."project_files" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all stage buckets" ON "loopops"."stage_buckets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all stage files" ON "loopops"."stage_files" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their own plugin auth codes" ON "loopops"."plugin_auth_codes" FOR DELETE USING (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users can delete their own plugin auth codes" ON "loopops"."plugin_auth_codes" IS 'RLS policy allowing users to delete only their own authentication codes.';



CREATE POLICY "Users can insert their own plugin auth codes" ON "loopops"."plugin_auth_codes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users can insert their own plugin auth codes" ON "loopops"."plugin_auth_codes" IS 'RLS policy allowing users to create authentication codes only for themselves.';



CREATE POLICY "Users can update their own plugin auth codes" ON "loopops"."plugin_auth_codes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users can update their own plugin auth codes" ON "loopops"."plugin_auth_codes" IS 'RLS policy allowing users to modify only their own authentication codes.';



CREATE POLICY "Users can view files in accessible project buckets" ON "loopops"."project_files" FOR SELECT TO "authenticated" USING (("project_bucket_id" IN ( SELECT "pb"."id"
   FROM (("loopops"."project_buckets" "pb"
     JOIN "loopops"."projects" "p" ON (("pb"."project_id" = "p"."id")))
     JOIN "loopops"."workspaces" "w" ON (("p"."workspace_id" = "w"."id")))
  WHERE ("w"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Users can view files in accessible stage buckets" ON "loopops"."stage_files" FOR SELECT TO "authenticated" USING (("stage_bucket_id" IN ( SELECT "sb"."id"
   FROM ((("loopops"."stage_buckets" "sb"
     JOIN "loopops"."project_stages" "ps" ON (("sb"."project_stage_id" = "ps"."id")))
     JOIN "loopops"."projects" "p" ON (("ps"."project_id" = "p"."id")))
     JOIN "loopops"."workspaces" "w" ON (("p"."workspace_id" = "w"."id")))
  WHERE ("w"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Users can view files in their own mindspace buckets" ON "loopops"."mindspace_files" FOR SELECT TO "authenticated" USING (("mindspace_bucket_id" IN ( SELECT "mindspace_buckets"."id"
   FROM "loopops"."mindspace_buckets"
  WHERE ("mindspace_buckets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view project buckets for accessible projects" ON "loopops"."project_buckets" FOR SELECT TO "authenticated" USING (("project_id" IN ( SELECT "p"."id"
   FROM ("loopops"."projects" "p"
     JOIN "loopops"."workspaces" "w" ON (("p"."workspace_id" = "w"."id")))
  WHERE ("w"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Users can view stage buckets for accessible projects" ON "loopops"."stage_buckets" FOR SELECT TO "authenticated" USING (("project_stage_id" IN ( SELECT "ps"."id"
   FROM (("loopops"."project_stages" "ps"
     JOIN "loopops"."projects" "p" ON (("ps"."project_id" = "p"."id")))
     JOIN "loopops"."workspaces" "w" ON (("p"."workspace_id" = "w"."id")))
  WHERE ("w"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own mindspace buckets" ON "loopops"."mindspace_buckets" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own plugin auth codes" ON "loopops"."plugin_auth_codes" FOR SELECT USING (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users can view their own plugin auth codes" ON "loopops"."plugin_auth_codes" IS 'RLS policy ensuring users can only query their own authentication codes based on user_id matching auth.uid().';



ALTER TABLE "loopops"."mindspace_buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "loopops"."mindspace_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "loopops"."plugin_auth_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "loopops"."project_buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "loopops"."project_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "loopops"."stage_buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "loopops"."stage_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Service role can manage all onboarding" ON "v2"."onboarding" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all preferences" ON "v2"."user_preferences" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all profiles" ON "v2"."profile" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all projects" ON "v2"."project" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all workspace profiles" ON "v2"."workspace_profile" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all workspaces" ON "v2"."workspace" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can update their own preferences" ON "v2"."user_preferences" FOR UPDATE TO "authenticated" USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "v2"."profile" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view projects in their workspaces" ON "v2"."project" FOR SELECT TO "authenticated" USING (("workspace_id" IN ( SELECT "workspace_profile"."workspace_id"
   FROM "v2"."workspace_profile"
  WHERE ("workspace_profile"."profile_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own onboarding" ON "v2"."onboarding" FOR SELECT TO "authenticated" USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own preferences" ON "v2"."user_preferences" FOR SELECT TO "authenticated" USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile" ON "v2"."profile" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own workspace memberships" ON "v2"."workspace_profile" FOR SELECT TO "authenticated" USING (("profile_id" IN ( SELECT "profile"."id"
   FROM "v2"."profile"
  WHERE ("profile"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their workspaces" ON "v2"."workspace" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "workspace_profile"."workspace_id"
   FROM "v2"."workspace_profile"
  WHERE ("workspace_profile"."profile_id" = "auth"."uid"()))));



ALTER TABLE "v2"."onboarding" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "v2"."profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "v2"."project" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "v2"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "v2"."workspace" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "v2"."workspace_profile" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT ALL ON SCHEMA "loopops" TO "anon";
GRANT ALL ON SCHEMA "loopops" TO "authenticated";
GRANT ALL ON SCHEMA "loopops" TO "service_role";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "v2" TO "anon";
GRANT USAGE ON SCHEMA "v2" TO "authenticated";
GRANT USAGE ON SCHEMA "v2" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "v2"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "v2"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "v2"."update_updated_at_column"() TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "loopops"."document_embeddings" TO "anon";
GRANT ALL ON TABLE "loopops"."document_embeddings" TO "authenticated";
GRANT ALL ON TABLE "loopops"."document_embeddings" TO "service_role";



GRANT ALL ON TABLE "loopops"."documents" TO "anon";
GRANT ALL ON TABLE "loopops"."documents" TO "authenticated";
GRANT ALL ON TABLE "loopops"."documents" TO "service_role";



GRANT ALL ON TABLE "loopops"."global_agent_templates" TO "anon";
GRANT ALL ON TABLE "loopops"."global_agent_templates" TO "authenticated";
GRANT ALL ON TABLE "loopops"."global_agent_templates" TO "service_role";



GRANT ALL ON TABLE "loopops"."global_deliverable_templates" TO "anon";
GRANT ALL ON TABLE "loopops"."global_deliverable_templates" TO "authenticated";
GRANT ALL ON TABLE "loopops"."global_deliverable_templates" TO "service_role";



GRANT ALL ON TABLE "loopops"."global_stage_templates" TO "anon";
GRANT ALL ON TABLE "loopops"."global_stage_templates" TO "authenticated";
GRANT ALL ON TABLE "loopops"."global_stage_templates" TO "service_role";



GRANT ALL ON TABLE "loopops"."global_team_templates" TO "anon";
GRANT ALL ON TABLE "loopops"."global_team_templates" TO "authenticated";
GRANT ALL ON TABLE "loopops"."global_team_templates" TO "service_role";



GRANT ALL ON TABLE "loopops"."mindspace_buckets" TO "anon";
GRANT ALL ON TABLE "loopops"."mindspace_buckets" TO "authenticated";
GRANT ALL ON TABLE "loopops"."mindspace_buckets" TO "service_role";



GRANT ALL ON TABLE "loopops"."mindspace_files" TO "anon";
GRANT ALL ON TABLE "loopops"."mindspace_files" TO "authenticated";
GRANT ALL ON TABLE "loopops"."mindspace_files" TO "service_role";



GRANT ALL ON TABLE "loopops"."plugin_auth_codes" TO "anon";
GRANT ALL ON TABLE "loopops"."plugin_auth_codes" TO "authenticated";
GRANT ALL ON TABLE "loopops"."plugin_auth_codes" TO "service_role";



GRANT ALL ON TABLE "loopops"."plugin_events" TO "anon";
GRANT ALL ON TABLE "loopops"."plugin_events" TO "authenticated";
GRANT ALL ON TABLE "loopops"."plugin_events" TO "service_role";



GRANT ALL ON TABLE "loopops"."project_agents" TO "anon";
GRANT ALL ON TABLE "loopops"."project_agents" TO "authenticated";
GRANT ALL ON TABLE "loopops"."project_agents" TO "service_role";



GRANT ALL ON TABLE "loopops"."project_buckets" TO "anon";
GRANT ALL ON TABLE "loopops"."project_buckets" TO "authenticated";
GRANT ALL ON TABLE "loopops"."project_buckets" TO "service_role";



GRANT ALL ON TABLE "loopops"."project_deliverables" TO "anon";
GRANT ALL ON TABLE "loopops"."project_deliverables" TO "authenticated";
GRANT ALL ON TABLE "loopops"."project_deliverables" TO "service_role";



GRANT ALL ON TABLE "loopops"."project_files" TO "anon";
GRANT ALL ON TABLE "loopops"."project_files" TO "authenticated";
GRANT ALL ON TABLE "loopops"."project_files" TO "service_role";



GRANT ALL ON TABLE "loopops"."project_stages" TO "anon";
GRANT ALL ON TABLE "loopops"."project_stages" TO "authenticated";
GRANT ALL ON TABLE "loopops"."project_stages" TO "service_role";



GRANT ALL ON TABLE "loopops"."projects" TO "anon";
GRANT ALL ON TABLE "loopops"."projects" TO "authenticated";
GRANT ALL ON TABLE "loopops"."projects" TO "service_role";



GRANT ALL ON TABLE "loopops"."session_messages" TO "anon";
GRANT ALL ON TABLE "loopops"."session_messages" TO "authenticated";
GRANT ALL ON TABLE "loopops"."session_messages" TO "service_role";



GRANT ALL ON TABLE "loopops"."sessions" TO "anon";
GRANT ALL ON TABLE "loopops"."sessions" TO "authenticated";
GRANT ALL ON TABLE "loopops"."sessions" TO "service_role";



GRANT ALL ON TABLE "loopops"."stage_buckets" TO "anon";
GRANT ALL ON TABLE "loopops"."stage_buckets" TO "authenticated";
GRANT ALL ON TABLE "loopops"."stage_buckets" TO "service_role";



GRANT ALL ON TABLE "loopops"."stage_files" TO "anon";
GRANT ALL ON TABLE "loopops"."stage_files" TO "authenticated";
GRANT ALL ON TABLE "loopops"."stage_files" TO "service_role";



GRANT ALL ON TABLE "loopops"."thread_events" TO "anon";
GRANT ALL ON TABLE "loopops"."thread_events" TO "authenticated";
GRANT ALL ON TABLE "loopops"."thread_events" TO "service_role";



GRANT ALL ON TABLE "loopops"."threads" TO "anon";
GRANT ALL ON TABLE "loopops"."threads" TO "authenticated";
GRANT ALL ON TABLE "loopops"."threads" TO "service_role";



GRANT ALL ON TABLE "loopops"."workspaces" TO "anon";
GRANT ALL ON TABLE "loopops"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "loopops"."workspaces" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_documents" TO "anon";
GRANT ALL ON TABLE "public"."loopops_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_documents" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_global_agent_templates" TO "anon";
GRANT ALL ON TABLE "public"."loopops_global_agent_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_global_agent_templates" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_global_deliverable_templates" TO "anon";
GRANT ALL ON TABLE "public"."loopops_global_deliverable_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_global_deliverable_templates" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_global_stage_templates" TO "anon";
GRANT ALL ON TABLE "public"."loopops_global_stage_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_global_stage_templates" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_mindspace_buckets" TO "anon";
GRANT ALL ON TABLE "public"."loopops_mindspace_buckets" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_mindspace_buckets" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_mindspace_files" TO "anon";
GRANT ALL ON TABLE "public"."loopops_mindspace_files" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_mindspace_files" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_plugin_auth_codes" TO "anon";
GRANT ALL ON TABLE "public"."loopops_plugin_auth_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_plugin_auth_codes" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_project_agents" TO "anon";
GRANT ALL ON TABLE "public"."loopops_project_agents" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_project_agents" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_project_buckets" TO "anon";
GRANT ALL ON TABLE "public"."loopops_project_buckets" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_project_buckets" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_project_files" TO "anon";
GRANT ALL ON TABLE "public"."loopops_project_files" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_project_files" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_project_stages" TO "anon";
GRANT ALL ON TABLE "public"."loopops_project_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_project_stages" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_projects" TO "anon";
GRANT ALL ON TABLE "public"."loopops_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_projects" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_session_messages" TO "anon";
GRANT ALL ON TABLE "public"."loopops_session_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_session_messages" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_sessions" TO "anon";
GRANT ALL ON TABLE "public"."loopops_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_stage_buckets" TO "anon";
GRANT ALL ON TABLE "public"."loopops_stage_buckets" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_stage_buckets" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_stage_files" TO "anon";
GRANT ALL ON TABLE "public"."loopops_stage_files" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_stage_files" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_threads" TO "anon";
GRANT ALL ON TABLE "public"."loopops_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_threads" TO "service_role";



GRANT ALL ON TABLE "public"."loopops_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."loopops_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."loopops_workspaces" TO "service_role";



GRANT ALL ON TABLE "v2"."onboarding" TO "anon";
GRANT ALL ON TABLE "v2"."onboarding" TO "authenticated";
GRANT ALL ON TABLE "v2"."onboarding" TO "service_role";



GRANT ALL ON TABLE "public"."v2_onboarding" TO "anon";
GRANT ALL ON TABLE "public"."v2_onboarding" TO "authenticated";
GRANT ALL ON TABLE "public"."v2_onboarding" TO "service_role";



GRANT ALL ON TABLE "v2"."profile" TO "anon";
GRANT ALL ON TABLE "v2"."profile" TO "authenticated";
GRANT ALL ON TABLE "v2"."profile" TO "service_role";



GRANT ALL ON TABLE "public"."v2_profile" TO "anon";
GRANT ALL ON TABLE "public"."v2_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."v2_profile" TO "service_role";



GRANT ALL ON TABLE "v2"."project" TO "anon";
GRANT ALL ON TABLE "v2"."project" TO "authenticated";
GRANT ALL ON TABLE "v2"."project" TO "service_role";



GRANT ALL ON TABLE "public"."v2_project" TO "anon";
GRANT ALL ON TABLE "public"."v2_project" TO "authenticated";
GRANT ALL ON TABLE "public"."v2_project" TO "service_role";



GRANT ALL ON TABLE "v2"."workspace" TO "anon";
GRANT ALL ON TABLE "v2"."workspace" TO "authenticated";
GRANT ALL ON TABLE "v2"."workspace" TO "service_role";



GRANT ALL ON TABLE "public"."v2_workspace" TO "anon";
GRANT ALL ON TABLE "public"."v2_workspace" TO "authenticated";
GRANT ALL ON TABLE "public"."v2_workspace" TO "service_role";



GRANT ALL ON TABLE "v2"."workspace_profile" TO "anon";
GRANT ALL ON TABLE "v2"."workspace_profile" TO "authenticated";
GRANT ALL ON TABLE "v2"."workspace_profile" TO "service_role";



GRANT ALL ON TABLE "public"."v2_workspace_profile" TO "anon";
GRANT ALL ON TABLE "public"."v2_workspace_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."v2_workspace_profile" TO "service_role";



GRANT ALL ON TABLE "v2"."user_preferences" TO "anon";
GRANT ALL ON TABLE "v2"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "v2"."user_preferences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON FUNCTIONS  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "loopops" GRANT ALL ON TABLES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON FUNCTIONS  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "v2" GRANT ALL ON TABLES  TO "service_role";



























