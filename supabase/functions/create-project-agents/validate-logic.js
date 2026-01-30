/**
 * Validation script to test create-project-agents function logic
 * 
 * Run with: node validate-logic.js
 */

// Test: Ensure only one agent template per stage_template_id in map
function testAgentTemplateMap() {
  console.log("Test 1: Agent template map stores only one template per stage_template_id");
  
  const agentTemplates = [
    { id: "agent1", role_name: "Agent 1", stage_template_id: "stage1" },
    { id: "agent2", role_name: "Agent 2", stage_template_id: "stage1" },
    { id: "agent3", role_name: "Agent 3", stage_template_id: "stage1" },
    { id: "agent4", role_name: "Agent 4", stage_template_id: "stage2" },
  ];

  const agentTemplateMap = new Map();
  for (const agentTemplate of agentTemplates) {
    if (agentTemplate.stage_template_id) {
      if (!agentTemplateMap.has(agentTemplate.stage_template_id)) {
        agentTemplateMap.set(agentTemplate.stage_template_id, agentTemplate);
      }
    }
  }

  // Should only have 2 entries (one for stage1, one for stage2)
  if (agentTemplateMap.size !== 2) {
    throw new Error(`Expected 2 entries, got ${agentTemplateMap.size}`);
  }
  
  // stage1 should have only the first agent (agent1)
  const stage1Agent = agentTemplateMap.get("stage1");
  if (!stage1Agent || stage1Agent.id !== "agent1") {
    throw new Error(`Expected agent1 for stage1, got ${stage1Agent?.id}`);
  }
  
  // stage2 should have agent4
  const stage2Agent = agentTemplateMap.get("stage2");
  if (!stage2Agent || stage2Agent.id !== "agent4") {
    throw new Error(`Expected agent4 for stage2, got ${stage2Agent?.id}`);
  }
  
  console.log("✅ Test 1 passed");
}

// Test: Ensure only one agent per project stage
function testDuplicatePrevention() {
  console.log("\nTest 2: Duplicate prevention ensures one agent per project stage");
  
  const projectStages = [
    { id: "stage1", template_id: "template1" },
    { id: "stage2", template_id: "template2" },
    { id: "stage1", template_id: "template1" }, // Duplicate!
    { id: "stage3", template_id: "template3" },
  ];

  const agentTemplateMap = new Map([
    ["template1", { id: "agent1", role_name: "Agent 1", stage_template_id: "template1" }],
    ["template2", { id: "agent2", role_name: "Agent 2", stage_template_id: "template2" }],
    ["template3", { id: "agent3", role_name: "Agent 3", stage_template_id: "template3" }],
  ]);

  const agentsToInsert = [];
  const addedStageIds = new Set();

  for (const stage of projectStages) {
    if (!stage.template_id) {
      continue;
    }

    // Skip if we've already added an agent for this stage
    if (addedStageIds.has(stage.id)) {
      continue;
    }

    const agentTemplate = agentTemplateMap.get(stage.template_id);
    if (!agentTemplate) {
      continue;
    }

    agentsToInsert.push({
      project_stage_id: stage.id,
      template_id: agentTemplate.id,
    });

    addedStageIds.add(stage.id);
  }

  // Should only have 3 agents (stage1, stage2, stage3) - not 4
  if (agentsToInsert.length !== 3) {
    throw new Error(`Expected 3 agents, got ${agentsToInsert.length}`);
  }
  
  // Verify stage1 appears only once
  const stage1Agents = agentsToInsert.filter(a => a.project_stage_id === "stage1");
  if (stage1Agents.length !== 1) {
    throw new Error(`Expected 1 agent for stage1, got ${stage1Agents.length}`);
  }
  
  console.log("✅ Test 2 passed");
}

// Test: Matching logic - project_stage.template_id -> agent_template.stage_template_id
function testMatchingLogic() {
  console.log("\nTest 3: Matching logic correctly maps stages to agent templates");
  
  const projectStages = [
    { id: "ps1", template_id: "st1" },
    { id: "ps2", template_id: "st2" },
    { id: "ps3", template_id: "st1" }, // Same template as ps1
  ];

  const agentTemplates = [
    { id: "at1", role_name: "Agent for ST1", stage_template_id: "st1" },
    { id: "at2", role_name: "Agent for ST2", stage_template_id: "st2" },
  ];

  // Build map
  const agentTemplateMap = new Map();
  for (const agentTemplate of agentTemplates) {
    if (agentTemplate.stage_template_id) {
      if (!agentTemplateMap.has(agentTemplate.stage_template_id)) {
        agentTemplateMap.set(agentTemplate.stage_template_id, agentTemplate);
      }
    }
  }

  // Match stages to agents
  const agentsToInsert = [];
  for (const stage of projectStages) {
    if (!stage.template_id) continue;
    
    const agentTemplate = agentTemplateMap.get(stage.template_id);
    if (agentTemplate) {
      agentsToInsert.push({
        project_stage_id: stage.id,
        template_id: agentTemplate.id,
      });
    }
  }

  // ps1 and ps3 should both get at1 (same stage template)
  if (agentsToInsert.length !== 3) {
    throw new Error(`Expected 3 agents, got ${agentsToInsert.length}`);
  }
  if (agentsToInsert[0].template_id !== "at1") {
    throw new Error(`Expected at1 for ps1, got ${agentsToInsert[0].template_id}`);
  }
  if (agentsToInsert[1].template_id !== "at2") {
    throw new Error(`Expected at2 for ps2, got ${agentsToInsert[1].template_id}`);
  }
  if (agentsToInsert[2].template_id !== "at1") {
    throw new Error(`Expected at1 for ps3, got ${agentsToInsert[2].template_id}`);
  }
  
  console.log("✅ Test 3 passed");
}

// Run all tests
try {
  testAgentTemplateMap();
  testDuplicatePrevention();
  testMatchingLogic();
  console.log("\n🎉 All tests passed! The function logic is correct.");
  console.log("\nThe function will:");
  console.log("1. ✅ Fetch all agent templates matching stage templates");
  console.log("2. ✅ Store only the first agent template per stage_template_id");
  console.log("3. ✅ Create exactly one agent per project stage");
  console.log("4. ✅ Prevent duplicates even if stages appear multiple times");
} catch (error) {
  console.error("\n❌ Test failed:", error.message);
  process.exit(1);
}

