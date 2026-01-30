-- ============================================================================
-- COMPREHENSIVE SCRIPT: Update Agent Templates & Recreate Project Agents
-- ============================================================================
-- This script:
-- 1. Updates agent templates with their corresponding stage_template_id
-- 2. Cleans up existing project_agents (removes duplicates)
-- 3. Provides instructions for recreating agents with the new logic
-- ============================================================================

-- ============================================================================
-- PART 1: Update Agent Templates with stage_template_id
-- ============================================================================

-- Step 1.1: Preview what will be updated (run this first to verify)
SELECT 
    gat.id as agent_template_id,
    gat.role_name,
    CASE 
        WHEN gat.role_name ILIKE '%Discovery%Define%' OR gat.role_name ILIKE '%Discover%Define%' THEN
            (SELECT id FROM loopops.global_stage_templates WHERE name ILIKE '%Discovery%' OR name ILIKE '%Discover%' LIMIT 1)
        WHEN gat.role_name ILIKE '%Design Strategy%' THEN
            (SELECT id FROM loopops.global_stage_templates WHERE name ILIKE '%Design Strategy%' LIMIT 1)
        WHEN gat.role_name ILIKE '%Onboarding%' THEN
            (SELECT id FROM loopops.global_stage_templates WHERE name ILIKE '%Onboarding%' LIMIT 1)
        ELSE NULL
    END as matched_stage_template_id,
    (SELECT name FROM loopops.global_stage_templates WHERE id = (
        CASE 
            WHEN gat.role_name ILIKE '%Discovery%Define%' OR gat.role_name ILIKE '%Discover%Define%' THEN
                (SELECT id FROM loopops.global_stage_templates WHERE name ILIKE '%Discovery%' OR name ILIKE '%Discover%' LIMIT 1)
            WHEN gat.role_name ILIKE '%Design Strategy%' THEN
                (SELECT id FROM loopops.global_stage_templates WHERE name ILIKE '%Design Strategy%' LIMIT 1)
            WHEN gat.role_name ILIKE '%Onboarding%' THEN
                (SELECT id FROM loopops.global_stage_templates WHERE name ILIKE '%Onboarding%' LIMIT 1)
            ELSE NULL
        END
    )) as matched_stage_name
FROM loopops.global_agent_templates gat
WHERE gat.stage_template_id IS NULL
ORDER BY gat.role_name;

-- Step 1.2: Update "Discovery and Define Orchestrator" or similar
UPDATE loopops.global_agent_templates
SET stage_template_id = (
    SELECT id 
    FROM loopops.global_stage_templates 
    WHERE name ILIKE '%Discovery%' OR name ILIKE '%Discover%' 
    ORDER BY 
        CASE 
            WHEN name ILIKE '%Discover%Define%' THEN 1
            WHEN name ILIKE '%Discovery%Define%' THEN 2
            WHEN name ILIKE '%Discovery%' THEN 3
            ELSE 4
        END
    LIMIT 1
)
WHERE (role_name ILIKE '%Discovery%Define%' OR role_name ILIKE '%Discover%Define%')
   AND stage_template_id IS NULL;

-- Step 1.3: Update "Design Strategy Orchestrator"
UPDATE loopops.global_agent_templates
SET stage_template_id = (
    SELECT id 
    FROM loopops.global_stage_templates 
    WHERE name ILIKE '%Design Strategy%'
    LIMIT 1
)
WHERE role_name ILIKE '%Design Strategy%'
   AND stage_template_id IS NULL;

-- Step 1.4: Update "Onboarding"
UPDATE loopops.global_agent_templates
SET stage_template_id = (
    SELECT id 
    FROM loopops.global_stage_templates 
    WHERE name ILIKE '%Onboarding%'
    LIMIT 1
)
WHERE role_name ILIKE '%Onboarding%'
   AND stage_template_id IS NULL;

-- Step 1.5: Verify agent template updates
SELECT 
    gat.id,
    gat.role_name,
    gat.stage_template_id,
    gst.name as stage_template_name,
    CASE WHEN gat.stage_template_id IS NULL THEN '⚠️ NEEDS MANUAL UPDATE' ELSE '✅ OK' END as status
FROM loopops.global_agent_templates gat
LEFT JOIN loopops.global_stage_templates gst ON gat.stage_template_id = gst.id
ORDER BY gat.role_name;

-- Step 1.6: Check for agent templates that still need manual update
SELECT 
    id,
    role_name,
    '❌ NO MATCHING STAGE TEMPLATE - MANUAL UPDATE REQUIRED' as status
FROM loopops.global_agent_templates
WHERE stage_template_id IS NULL;

-- ============================================================================
-- PART 2: Clean up existing project_agents (remove duplicates)
-- ============================================================================

-- Step 2.1: Preview current state - show projects with duplicate agents
SELECT 
    p.id as project_id,
    p.name as project_name,
    ps.id as project_stage_id,
    gst.name as stage_name,
    COUNT(pa.id) as current_agent_count,
    CASE 
        WHEN COUNT(pa.id) > 1 THEN '⚠️ HAS DUPLICATES'
        WHEN COUNT(pa.id) = 1 THEN '✅ OK'
        ELSE '❌ MISSING AGENTS'
    END as status
FROM loopops.projects p
JOIN loopops.project_stages ps ON p.id = ps.project_id
LEFT JOIN loopops.project_agents pa ON ps.id = pa.project_stage_id
LEFT JOIN loopops.global_stage_templates gst ON ps.template_id = gst.id
GROUP BY p.id, p.name, ps.id, gst.name
ORDER BY p.name, gst.name;

-- Step 2.2: Show total count of agents to be deleted
SELECT 
    COUNT(*) as total_project_agents_to_delete,
    COUNT(DISTINCT project_stage_id) as unique_stages_with_agents
FROM loopops.project_agents;

-- Step 2.3: DELETE ALL existing project_agents
-- ⚠️ WARNING: This will delete all existing project agents
-- Make sure you've backed up if needed, and agent templates are properly linked
DELETE FROM loopops.project_agents;

-- Step 2.4: Verify cleanup
SELECT 
    COUNT(*) as remaining_project_agents,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Cleanup successful'
        ELSE '⚠️ Some agents still exist'
    END as status
FROM loopops.project_agents;

-- ============================================================================
-- PART 3: Recreate project_agents with the new logic (ONE agent per stage)
-- ============================================================================

-- Step 3.1: Preview what agents will be created
SELECT 
    ps.id as project_stage_id,
    ps.project_id,
    p.name as project_name,
    ps.template_id as stage_template_id,
    gst.name as stage_template_name,
    gat.id as agent_template_id,
    gat.role_name as agent_role_name,
    CASE 
        WHEN gat.id IS NULL THEN '❌ NO AGENT TEMPLATE FOUND'
        ELSE '✅ WILL CREATE AGENT'
    END as status
FROM loopops.project_stages ps
JOIN loopops.projects p ON ps.project_id = p.id
LEFT JOIN loopops.global_stage_templates gst ON ps.template_id = gst.id
LEFT JOIN loopops.global_agent_templates gat ON ps.template_id = gat.stage_template_id
WHERE ps.template_id IS NOT NULL
ORDER BY p.name, gst.name;

-- Step 3.2: Insert project_agents (ONE per stage, matched by stage_template_id)
INSERT INTO loopops.project_agents (project_stage_id, template_id, custom_prompt_override, custom_tools_override)
SELECT 
    ps.id as project_stage_id,
    gat.id as template_id,
    NULL as custom_prompt_override,
    NULL as custom_tools_override
FROM loopops.project_stages ps
JOIN loopops.global_agent_templates gat ON ps.template_id = gat.stage_template_id
WHERE ps.template_id IS NOT NULL
  AND gat.stage_template_id IS NOT NULL
  -- Only insert one agent per stage (in case multiple agent templates match the same stage)
  -- We use DISTINCT ON to ensure one agent per stage, prioritizing by agent template id
  AND gat.id = (
      SELECT id 
      FROM loopops.global_agent_templates 
      WHERE stage_template_id = ps.template_id 
        AND stage_template_id IS NOT NULL
      ORDER BY id
      LIMIT 1
  )
  -- Don't insert if agent already exists for this stage
  AND NOT EXISTS (
      SELECT 1 
      FROM loopops.project_agents pa 
      WHERE pa.project_stage_id = ps.id
  );

-- Step 3.3: Verify the recreation
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(DISTINCT ps.id) as total_stages,
    COUNT(DISTINCT pa.id) as total_agents_created,
    CASE 
        WHEN COUNT(DISTINCT ps.id) = COUNT(DISTINCT pa.id) THEN '✅ ALL STAGES HAVE AGENTS'
        WHEN COUNT(DISTINCT pa.id) = 0 THEN '❌ NO AGENTS CREATED'
        ELSE '⚠️ SOME STAGES MISSING AGENTS'
    END as status
FROM loopops.projects p
LEFT JOIN loopops.project_stages ps ON p.id = ps.project_id
LEFT JOIN loopops.project_agents pa ON ps.id = pa.project_stage_id
GROUP BY p.id, p.name
ORDER BY p.name;

-- Step 3.4: Show details of created agents
SELECT 
    pa.id as project_agent_id,
    p.name as project_name,
    gst.name as stage_name,
    gat.role_name as agent_role_name,
    pa.created_at
FROM loopops.project_agents pa
JOIN loopops.project_stages ps ON pa.project_stage_id = ps.id
JOIN loopops.projects p ON ps.project_id = p.id
JOIN loopops.global_stage_templates gst ON ps.template_id = gst.id
JOIN loopops.global_agent_templates gat ON pa.template_id = gat.id
ORDER BY p.name, gst.name;

-- Step 3.5: Find stages without agents (if any)
SELECT 
    ps.id as project_stage_id,
    p.name as project_name,
    gst.name as stage_template_name,
    ps.template_id as stage_template_id,
    CASE 
        WHEN ps.template_id IS NULL THEN '❌ Stage has no template_id'
        WHEN NOT EXISTS (
            SELECT 1 
            FROM loopops.global_agent_templates 
            WHERE stage_template_id = ps.template_id
        ) THEN '❌ No agent template matches this stage template'
        ELSE '⚠️ Unknown issue'
    END as reason
FROM loopops.project_stages ps
JOIN loopops.projects p ON ps.project_id = p.id
LEFT JOIN loopops.global_stage_templates gst ON ps.template_id = gst.id
LEFT JOIN loopops.project_agents pa ON ps.id = pa.project_stage_id
WHERE pa.id IS NULL
ORDER BY p.name, gst.name;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- The script has:
-- 1. ✅ Updated agent templates with stage_template_id
-- 2. ✅ Deleted all duplicate project_agents
-- 3. ✅ Recreated project_agents (one per stage)
-- 
-- Check the verification queries above to ensure everything worked correctly.
-- ============================================================================

