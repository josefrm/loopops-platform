import {
  validateAgentName,
  validateKey,
  validateLLMModel,
  validateAgentPrompt,
} from '@/utils/agentValidation';

// Test the validation functions
export const testValidations = () => {
  console.log('Testing Agent Validation Functions:');

  // Test agent_name validation
  console.log('\n--- Agent Name Tests ---');
  console.log('Empty string:', validateAgentName(''));
  console.log('Only spaces:', validateAgentName('   '));
  console.log('Too short:', validateAgentName('abc'));
  console.log('Valid name:', validateAgentName('DataAnalyst'));
  console.log('Valid with spaces:', validateAgentName('  DataAnalyst  '));

  // Test key validation
  console.log('\n--- Key Tests ---');
  console.log('Empty string:', validateKey(''));
  console.log('Only spaces:', validateKey('   '));
  console.log('Too long:', validateKey('ABCD'));
  console.log('Valid key:', validateKey('DA'));
  console.log('Valid with spaces:', validateKey('  DA  '));

  // Test LLM model validation
  console.log('\n--- LLM Model Tests ---');
  console.log('Undefined:', validateLLMModel(undefined));
  console.log('Empty string:', validateLLMModel(''));
  console.log('Valid model:', validateLLMModel('gpt-4'));

  // Test agent prompt validation
  console.log('\n--- Agent Prompt Tests ---');
  console.log('Empty string:', validateAgentPrompt(''));
  console.log('Only spaces:', validateAgentPrompt('   '));
  console.log(
    'Valid prompt:',
    validateAgentPrompt('You are a helpful assistant'),
  );

  console.log('\n--- Validation Tests Complete ---');
};

// Call this in the browser console to test: testValidations()
if (typeof window !== 'undefined') {
  (window as any).testValidations = testValidations;
}
