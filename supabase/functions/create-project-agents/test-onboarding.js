/**
 * Test script to run full onboarding flow and verify create-project-agents function
 * 
 * This script:
 * 1. Creates a new user account (cursor1@test.com / abc12345)
 * 2. Updates profile (name: cursor, role: developer)
 * 3. Creates workspace (CURSOR TEST)
 * 4. Creates project (WEBSITE) - which triggers setup-project-loopops -> create-project-agents
 * 5. Verifies that exactly one agent was created per stage
 * 
 * Run with: node test-onboarding.js
 * 
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment or .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local if it exists
let SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY;

const envPath = join(__dirname, '../../../.env.local');
if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key === 'VITE_SUPABASE_URL') SUPABASE_URL = value;
        if (key === 'VITE_SUPABASE_ANON_KEY') SUPABASE_ANON_KEY = value;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_ROLE_KEY = value;
      }
    });
  } catch (e) {
    console.log('Could not read .env.local, using environment variables');
  }
}

// Use environment variables or defaults from client.ts
SUPABASE_URL = SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://penzhrrqhmjgwcqnugeq.supabase.co';
SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbnpocnJxaG1qZ3djcW51Z2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwODY5MDcsImV4cCI6MjA2MTY2MjkwN30.fhhCcqBmYXUbxiX62gZX5GAwrXIeQ-8jDcU76SrdpJU';
SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local or environment variables');
  process.exit(1);
}

console.log('🔧 Configuration:');
console.log(`   SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`   Using service role: ${SUPABASE_SERVICE_ROLE_KEY ? 'Yes' : 'No'}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const TEST_EMAIL = 'cursor1@test.com';
const TEST_PASSWORD = 'abc12345';
const TEST_NAME = 'cursor';
const TEST_ROLE = 'developer';
const TEST_WORKSPACE = 'CURSOR TEST';
const TEST_PROJECT = 'WEBSITE';

async function cleanupExistingUser() {
  console.log('🧹 Cleaning up existing test user if exists...');
  if (supabaseAdmin) {
    try {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const testUser = users.users.find(u => u.email === TEST_EMAIL);
      if (testUser) {
        await supabaseAdmin.auth.admin.deleteUser(testUser.id);
        console.log('   ✅ Deleted existing test user');
      } else {
        console.log('   ℹ️  No existing test user found');
      }
    } catch (error) {
      console.log('   ⚠️  Could not cleanup (this is okay if user doesn\'t exist)');
    }
  }
}

async function signUp() {
  console.log('\n📝 Step 1: Creating user account...');
  console.log(`   Email: ${TEST_EMAIL}`);
  
  const { data, error } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('   ℹ️  User already exists, signing in instead...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (signInError) throw signInError;
      return signInData.user;
    }
    throw error;
  }

  if (!data.user) {
    throw new Error('User creation failed - no user returned');
  }

  console.log(`   ✅ User created: ${data.user.id}`);
  return data.user;
}

async function updateProfile(userId) {
  console.log('\n👤 Step 2: Updating profile...');
  console.log(`   Name: ${TEST_NAME}`);
  console.log(`   Role: ${TEST_ROLE}`);

  const { data, error } = await supabase.functions.invoke('update-profile-v2', {
    body: {
      name: TEST_NAME,
      role: TEST_ROLE,
      user_id: userId,
    },
  });

  if (error) throw error;
  console.log('   ✅ Profile updated');
  return data;
}

async function createWorkspace(userId) {
  console.log('\n🏢 Step 3: Creating workspace...');
  console.log(`   Name: ${TEST_WORKSPACE}`);

  const { data, error } = await supabase.functions.invoke('create-workspace-v2', {
    body: {
      name: TEST_WORKSPACE,
      role: 'admin',
      user_id: userId,
    },
  });

  if (error) throw error;
  console.log(`   ✅ Workspace created: ${data.workspace.id}`);
  return data.workspace;
}

async function createProject(workspaceId, userId) {
  console.log('\n🚀 Step 4: Creating project...');
  console.log(`   Name: ${TEST_PROJECT}`);
  console.log('   This will trigger setup-project-loopops -> create-project-agents');

  const { data, error } = await supabase.functions.invoke('create-project-v2', {
    body: {
      name: TEST_PROJECT,
      workspace_id: workspaceId,
      user_id: userId,
    },
  });

  if (error) {
    // Try to get more details from the error
    let errorMessage = error.message || 'Unknown error';
    if (error.context && error.context.body) {
      try {
        const errorBody = await error.context.body.text();
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {
        // Ignore parsing errors
      }
    }
    throw new Error(`Failed to create project: ${errorMessage}`);
  }
  console.log(`   ✅ Project created: ${data.project.id}`);
  return data.project;
}

async function verifyAgents(projectId) {
  console.log('\n🔍 Step 5: Verifying agents were created correctly...');
  
  if (!supabaseAdmin) {
    console.log('   ⚠️  Cannot verify (no service role key)');
    return;
  }

  // Get all project stages
  const { data: stages, error: stagesError } = await supabaseAdmin
    .from('loopops_project_stages')
    .select('id, template_id')
    .eq('project_id', projectId);

  if (stagesError) throw stagesError;

  console.log(`   Found ${stages.length} project stages`);

  // Get all agents for these stages
  const { data: agents, error: agentsError } = await supabaseAdmin
    .from('loopops_project_agents')
    .select('id, project_stage_id, template_id')
    .in('project_stage_id', stages.map(s => s.id));

  if (agentsError) throw agentsError;

  console.log(`   Found ${agents.length} project agents`);

  // Verify: one agent per stage
  const agentsPerStage = {};
  agents.forEach(agent => {
    if (!agentsPerStage[agent.project_stage_id]) {
      agentsPerStage[agent.project_stage_id] = [];
    }
    agentsPerStage[agent.project_stage_id].push(agent);
  });

  let hasErrors = false;
  for (const stage of stages) {
    const stageAgents = agentsPerStage[stage.id] || [];
    if (stageAgents.length === 0) {
      console.log(`   ❌ Stage ${stage.id} has NO agents`);
      hasErrors = true;
    } else if (stageAgents.length > 1) {
      console.log(`   ❌ Stage ${stage.id} has ${stageAgents.length} agents (expected 1)`);
      hasErrors = true;
    } else {
      console.log(`   ✅ Stage ${stage.id} has exactly 1 agent`);
    }
  }

  if (!hasErrors) {
    console.log('\n🎉 SUCCESS! All stages have exactly one agent!');
  } else {
    console.log('\n❌ FAILURE! Some stages have incorrect number of agents');
    process.exit(1);
  }

  return { stages, agents };
}

async function runTest() {
  try {
    await cleanupExistingUser();
    
    const user = await signUp();
    await updateProfile(user.id);
    const workspace = await createWorkspace(user.id);
    const project = await createProject(workspace.id, user.id);
    
    // Wait a bit for async operations to complete
    console.log('\n⏳ Waiting for async operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await verifyAgents(project.id);
    
    console.log('\n✅ Test completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Workspace ID: ${workspace.id}`);
    console.log(`   Project ID: ${project.id}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runTest();

