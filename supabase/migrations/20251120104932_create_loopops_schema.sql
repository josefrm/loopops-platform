-- ==============================================================================
-- LOOPOPS DATABASE SCHEMA (Supabase / PostgreSQL)
-- 
-- Architecture: Template vs. Instance Pattern
-- Features: Vector Search (pgvector), JSONB for config, RBAC support
-- ==============================================================================

-- 1. EXTENSIONS & SCHEMA SETUP
-- Enable pgvector for the Knowledge Base embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a dedicated schema to keep things organized
CREATE SCHEMA IF NOT EXISTS loopops;

-- Grant usage and create permissions on loopops schema
-- Note: If schema already exists and is owned by a different user, 
-- these grants may fail silently, but that's okay if permissions are already set
DO $$
BEGIN
    -- Try to grant permissions (will fail silently if we don't have permission, but that's okay)
    BEGIN
        GRANT USAGE ON SCHEMA loopops TO postgres, anon, authenticated, service_role;
        GRANT CREATE ON SCHEMA loopops TO postgres, anon, authenticated, service_role;
    EXCEPTION WHEN OTHERS THEN
        -- Permissions might already be set or we don't have permission to grant
        -- This is okay, continue with the migration
        RAISE NOTICE 'Could not grant schema permissions (they may already be set): %', SQLERRM;
    END;
END $$;

-- Set default privileges for future tables in loopops schema
-- These will only apply to objects created by postgres role
ALTER DEFAULT PRIVILEGES IN SCHEMA loopops FOR ROLE postgres GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA loopops FOR ROLE postgres GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA loopops FOR ROLE postgres GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- ENUMS (Standardizing Statuses and Types)
-- ==============================================================================
-- Create types only if they don't exist
DO $$
BEGIN
    -- Create project_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'loopops')) THEN
        CREATE TYPE loopops.project_status AS ENUM ('planning', 'active', 'paused', 'archived');
    END IF;
    
    -- Create stage_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stage_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'loopops')) THEN
        CREATE TYPE loopops.stage_status AS ENUM ('pending', 'active', 'completed', 'skipped');
    END IF;
    
    -- Create doc_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'loopops')) THEN
        CREATE TYPE loopops.doc_status AS ENUM ('draft', 'review', 'final');
    END IF;
    
    -- Create thread_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thread_type' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'loopops')) THEN
        CREATE TYPE loopops.thread_type AS ENUM ('project_main', 'stage_main', 'plugin_stream');
    END IF;
    
    -- Create event_source enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_source' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'loopops')) THEN
        CREATE TYPE loopops.event_source AS ENUM ('user', 'agent', 'system', 'figma_plugin', 'cursor_plugin');
    END IF;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Insufficient privileges to create types in loopops schema. Please run: ALTER SCHEMA loopops OWNER TO postgres; GRANT CREATE ON SCHEMA loopops TO postgres;';
END $$;

-- ==============================================================================
-- 1. GLOBAL TEMPLATES ("The 90%" - System Level Data)
-- ==============================================================================

-- Defines the standard phases (e.g., "Discovery", "Design", "Development")
CREATE TABLE IF NOT EXISTS loopops.global_stage_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    default_order_index INT, -- To sort them conceptually (1, 2, 3)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Defines the standard Agent Personas (e.g., "Product Owner", "Lead Dev")
CREATE TABLE IF NOT EXISTS loopops.global_agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL,
    system_prompt TEXT NOT NULL, -- The heavy prompt text
    default_tools JSONB DEFAULT '[]'::JSONB, -- List of tool definitions
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Defines what needs to be produced (e.g., "PRD", "High-Fidelity Mockups")
CREATE TABLE IF NOT EXISTS loopops.global_deliverable_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_template_id UUID REFERENCES loopops.global_stage_templates(id),
    name TEXT NOT NULL,
    requirements_prompt TEXT NOT NULL, -- Instructions for the Agent on how to validate this
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. CORE HIERARCHY (Workspaces & Projects)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS loopops.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL, -- Maps to auth.users.id
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loopops.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES loopops.workspaces(id),
    name TEXT NOT NULL,
    description TEXT,
    status loopops.project_status DEFAULT 'planning',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. PROJECT INSTANCES ("The 10%" - State & Overrides)
-- ==============================================================================

-- Instance of a Stage for a specific project
CREATE TABLE IF NOT EXISTS loopops.project_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES loopops.projects(id) ON DELETE CASCADE,
    template_id UUID REFERENCES loopops.global_stage_templates(id),
    status loopops.stage_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Custom configurations specific to this project's stage
    custom_settings JSONB DEFAULT '{}'::JSONB 
);

-- Instance of an Agent for a specific Stage
-- LOGIC: If custom_prompt_override is NULL, use the Global Template's prompt.
CREATE TABLE IF NOT EXISTS loopops.project_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_stage_id UUID REFERENCES loopops.project_stages(id) ON DELETE CASCADE,
    template_id UUID REFERENCES loopops.global_agent_templates(id),
    
    -- THE OVERRIDE COLUMN: Stores the custom persona only if different from global
    custom_prompt_override TEXT, 
    custom_tools_override JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instance of a Deliverable to track completion
CREATE TABLE IF NOT EXISTS loopops.project_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_stage_id UUID REFERENCES loopops.project_stages(id) ON DELETE CASCADE,
    template_id UUID REFERENCES loopops.global_deliverable_templates(id),
    
    is_completed BOOLEAN DEFAULT FALSE,
    completion_metadata JSONB, -- Stores who approved it and when
    
    -- Links to the final document in the Knowledge Base
    final_document_id UUID, -- FK added later via ALTER TABLE to avoid circular dep issues
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. INTERACTION LAYER (Sessions & Plugins)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS loopops.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_stage_id UUID REFERENCES loopops.project_stages(id),
    user_id UUID NOT NULL, -- Maps to auth.users
    agent_instance_id UUID REFERENCES loopops.project_agents(id), -- Which specific agent persona?
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loopops.session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES loopops.sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores raw events from Figma/Cursor before they become threads
CREATE TABLE IF NOT EXISTS loopops.plugin_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES loopops.projects(id),
    source_tool loopops.event_source NOT NULL, -- 'figma_plugin', 'cursor_plugin'
    external_user_id TEXT, -- The ID from Figma/Cursor
    activity_type TEXT, -- 'commit', 'comment', 'frame_update'
    payload JSONB, -- Raw data from the plugin
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. MINDSPACE & KNOWLEDGE BASE
-- ==============================================================================

-- Mindspace: The drafting area
CREATE TABLE IF NOT EXISTS loopops.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES loopops.projects(id),
    origin_session_id UUID REFERENCES loopops.sessions(id),
    title TEXT NOT NULL,
    content TEXT, -- Markdown or JSON content
    status loopops.doc_status DEFAULT 'draft',
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base: The Vector Store
-- Only finalized documents get an entry here
CREATE TABLE IF NOT EXISTS loopops.document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES loopops.documents(id) ON DELETE CASCADE,
    chunk_index INT DEFAULT 0,
    chunk_content TEXT, -- The specific text chunk used for embedding
    embedding vector(1536), -- Compatible with OpenAI text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now we can link the deliverable to the document
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_final_doc' 
        AND conrelid = 'loopops.project_deliverables'::regclass
    ) THEN
        ALTER TABLE loopops.project_deliverables 
        ADD CONSTRAINT fk_final_doc 
        FOREIGN KEY (final_document_id) REFERENCES loopops.documents(id);
    END IF;
END $$;

-- ==============================================================================
-- 6. THREADS (The "Read-Only" Streams)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS loopops.threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES loopops.projects(id),
    stage_id UUID REFERENCES loopops.project_stages(id), -- Nullable (Project Thread has no stage)
    type loopops.thread_type NOT NULL,
    is_read_only BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loopops.thread_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES loopops.threads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'decision', 'milestone', 'summary'
    summary_content TEXT NOT NULL, -- The AI-generated summary
    
    -- Metadata to link back to source (Document, Session, or Plugin Event)
    source_document_id UUID REFERENCES loopops.documents(id),
    source_plugin_event_id UUID REFERENCES loopops.plugin_events(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add type column to global_agent_templates (added at the end to avoid issues if table exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'loopops' 
        AND table_name = 'global_agent_templates' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE loopops.global_agent_templates ADD COLUMN type varchar(128);
    END IF;
EXCEPTION WHEN insufficient_privilege THEN
    -- If we don't have permission, skip this (column may already exist or be added manually)
    RAISE NOTICE 'Could not add type column to global_agent_templates: insufficient privileges';
END $$;

