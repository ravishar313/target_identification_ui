import ContextAgent from './ContextAgent';
import DataAgent from './DataAgent';
import ActionAgent from './ActionAgent';
import useContextStore from '../store/contextStore';
import useAssistantStore from '../store/assistantStore';

/**
 * Planning Agent - Coordinates the execution of complex requests
 * Breaks down user queries into a sequence of operations
 */
class PlanningAgent {
  constructor() {
    this.contextStore = null;
    this.assistantStore = null;
    this.integrationAgentInstance = null;
  }

  /**
   * Initialize the agent with the latest store references
   */
  init() {
    this.contextStore = useContextStore.getState();
    this.assistantStore = useAssistantStore.getState();
    // Lazy-initialize agent references to avoid circular dependencies
    this.contextAgent = ContextAgent;
    this.dataAgent = DataAgent;
    this.actionAgent = ActionAgent;
    return this;
  }

  /**
   * Safely get the IntegrationAgent to avoid circular dependency issues
   * @returns {Promise<Object>} IntegrationAgent instance
   */
  async getIntegrationAgent() {
    if (this.integrationAgentInstance) {
      return this.integrationAgentInstance;
    }
    
    try {
      // Dynamic import avoids circular dependencies
      const module = await import('./IntegrationAgent');
      this.integrationAgentInstance = module.default;
      return this.integrationAgentInstance;
    } catch (error) {
      console.error('Error loading IntegrationAgent:', error);
      throw new Error('Failed to load IntegrationAgent');
    }
  }

  /**
   * Plan steps and execute based on user request
   * @param {String} userMessage The user's request message
   * @returns {Object} Execution results
   */
  async planAndExecute(userMessage) {
    this.init();
    
    try {
      // Store the user message in execution context for reference by other methods
      this.assistantStore.setState(state => ({
        ...state,
        executionContext: {
          ...(state.executionContext || {}),
          userMessage
        }
      }));
      
      // Try to generate a plan for the request
      const plan = await this.generatePlan(userMessage);
      
      // If we couldn't generate a plan, use LLM direct response
      if (!plan || !plan.steps || plan.steps.length === 0) {
        console.warn('Failed to generate a plan, using LLM direct response');
        return {
          success: true,
          results: [],
          response: await this.getDirectLLMResponse(userMessage)
        };
      }
      
      // Make sure all LLM steps have the user message
      if (plan.steps) {
        plan.steps = plan.steps.map(step => {
          if (step.type === 'llm') {
            return {
              ...step,
              params: {
                ...(step.params || {}),
                userMessage: userMessage
              }
            };
          }
          return step;
        });
      }
      
      // Execute the plan
      const results = await this.executePlan(plan);
      
      // Get the final response based on the execution results
      return {
        plan,
        results,
        response: this.getFinalResponse(plan, results, userMessage)
      };
    } catch (error) {
      console.error('Error in planning and execution:', error);
      
      // Fall back to direct LLM response
      return {
        success: false,
        error: error.message,
        results: [],
        response: await this.getDirectLLMResponse(userMessage, true)
      };
    }
  }
  
  /**
   * Get a direct response from the LLM without executing a complex plan
   * @param {String} userMessage User's original message
   * @param {Boolean} isError Whether this is being called due to an error
   * @returns {String} LLM response
   */
  async getDirectLLMResponse(userMessage, isError = false) {
    this.init();
    const { workflow, step } = this.contextStore || { workflow: 'unknown', step: 'unknown' };
    
    // Ensure we have a context description, or use a fallback
    let contextDescription = "You are a scientific workflow assistant.";
    try {
      contextDescription = this.contextAgent.getContextDescription() || contextDescription;
    } catch (error) {
      console.warn('Error getting context description:', error);
    }
    
    // Create a simple system prompt with the current context
    const systemContent = `You are a helpful scientific workflow assistant.
You are currently in the ${workflow} workflow, at the ${step} step.

${contextDescription}

${isError ? 'There was an error processing the request with the planning system. Provide a helpful response using just the context information available.' : ''}

Respond to the user's message in a concise, friendly way based on the current workflow context.
If you cannot provide specific information due to missing data, acknowledge this and suggest what the user can do.`;

    try {
      // Call the LLM directly
      const integrationAgent = await this.getIntegrationAgent();
      return await integrationAgent.callLLM({
        role: 'system',
        content: systemContent
      }, false, userMessage);
    } catch (error) {
      console.error('Error getting direct LLM response:', error);
      return "I'm having trouble processing your request right now. Please try asking a simple question about the current workflow.";
    }
  }

  /**
   * Execute a plan by running each step in sequence
   * @param {Object} plan The plan to execute
   * @returns {Array} Array of execution results for each step
   */
  async executePlan(plan) {
    this.init();
    
    // Make sure we have initialized agent references
    if (!this.dataAgent) this.dataAgent = DataAgent;
    if (!this.actionAgent) this.actionAgent = ActionAgent;
    if (!this.contextAgent) this.contextAgent = ContextAgent;
    
    const results = [];
    let abortExecution = false;
    
    // Execute each step in sequence
    for (const step of plan.steps) {
      if (abortExecution) {
        results.push({
          step,
          success: false,
          error: 'Execution aborted due to previous step failure',
          result: null
        });
        continue;
      }
      
      try {
        let result;
        
        // Execute the step based on its type
        switch (step.type) {
          case 'data':
            result = await this.dataAgent.getData(step.action, step.params);
            break;
          case 'action':
            result = await this.actionAgent.executeAction(step.action, step.params);
            break;
          case 'llm':
            result = await this.buildResponseFromLLM(step, results);
            break;
          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }
        
        // Record the successful execution
        results.push({
          step,
          success: true,
          result
        });
        
        // Check if we should abort remaining steps based on this result
        if (step.critical && (result === null || result.error)) {
          console.warn(`Critical step ${step.action} failed, aborting plan execution`);
          abortExecution = true;
        }
      } catch (error) {
        console.error(`Error executing step:`, error);
        
        // Record the failed execution
        results.push({
          step,
          success: false,
          error: error.message,
          result: null
        });
        
        // If this was a critical step, abort remaining executions
        if (step.critical) {
          console.warn(`Critical step ${step.action} failed, aborting plan execution`);
          abortExecution = true;
        }
      }
    }
    
    return results;
  }

  /**
   * Get the final response from a plan execution
   * @param {Object} plan The executed plan
   * @param {Array} results Execution results
   * @param {String} userMessage Original user message
   * @returns {String|Object} Final response
   */
  getFinalResponse(plan, results, userMessage) {
    // Check if there's an LLM response step
    const responseStep = results.find(r => 
      r.success && r.step.type === 'llm' && r.result
    );
    
    if (responseStep) {
      return responseStep.result;
    }
    
    // Check if there's a response in the plan itself
    if (plan.response) {
      let response = plan.response;
      
      // Get current context for template variables
      const { workflow, step, data } = this.contextStore || {};
      
      // Replace common template variables
      response = response
        .replace(/\{workflow\}/g, workflow || 'unknown workflow')
        .replace(/\{currentStep\}/g, step || 'unknown step')
        .replace(/\{step\}/g, step || 'unknown step');
      
      // Replace data placeholders in the response
      if (data) {
        Object.keys(data).forEach(key => {
          const value = typeof data[key] === 'object' 
            ? JSON.stringify(data[key])
            : String(data[key] || '');
            
          response = response.replace(new RegExp(`\\{data\\.${key}\\}`, 'g'), value);
        });
      }
      
      // Replace any placeholders from execution results
      results.forEach(result => {
        if (result.success && result.result) {
          const data = result.result;
          
          if (typeof data === 'object') {
            Object.keys(data).forEach(key => {
              const placeholder = `{{${result.step.action}.${key}}}`;
              const value = typeof data[key] === 'object' 
                ? JSON.stringify(data[key]) 
                : data[key];
                
              response = response.replace(placeholder, value || '');
            });
          }
        }
      });
      
      // Remove any remaining template placeholders
      response = response.replace(/\{[^{}]*\}/g, 'unknown');
      
      return response;
    }
    
    // Check if all steps were successful
    const allSuccessful = results.every(r => r.success);
    
    if (allSuccessful) {
      // Collect data from data steps
      const dataResults = results
        .filter(r => r.success && r.step.type === 'data')
        .map(r => r.result);
      
      // Check if we have action results
      const actionResults = results
        .filter(r => r.success && r.step.type === 'action')
        .map(r => r.result);
      
      if (actionResults.length > 0) {
        return {
          message: `I've completed the requested operation${actionResults.length > 1 ? 's' : ''}.`,
          actions: actionResults
        };
      }
      
      if (dataResults.length > 0) {
        // Combine all data results
        const combinedData = dataResults.reduce((acc, data) => {
          if (data && typeof data === 'object') {
            return { ...acc, ...data };
          }
          return acc;
        }, {});
        
        return combinedData;
      }
    }
    
    // Fallback to a generic response
    return plan.fallbackResponse || 
      "I've processed your request, but I'm not sure what specific information you were looking for. Could you provide more details?";
  }

  /**
   * Generate a plan for handling a user request
   * @param {String} userMessage The user's message
   * @returns {Object} Generated plan
   */
  async generatePlan(userMessage) {
    this.init();
    
    try {
      // Ensure we have context information
      if (!this.contextStore) {
        console.warn('Context store not available, initializing again');
        this.init();
      }
      
      // Get context data with fallback for missing values
      const { workflow = 'unknown', step = 'unknown' } = this.contextStore || {};
      
      // Get context description safely
      let contextDescription = "Current workflow context unavailable.";
      try {
        if (this.contextAgent && typeof this.contextAgent.getContextDescription === 'function') {
          contextDescription = this.contextAgent.getContextDescription() || contextDescription;
        }
      } catch (error) {
        console.warn('Error getting context description:', error);
      }
      
      // Get available actions safely
      let availableActions = [];
      try {
        if (this.actionAgent && typeof this.actionAgent.getAvailableActions === 'function') {
          availableActions = this.actionAgent.getAvailableActions() || [];
        }
      } catch (error) {
        console.warn('Error getting available actions:', error);
      }
      
      // Format available actions for the prompt
      const formattedActions = availableActions.map(action => {
        return {
          id: action.id,
          description: action.description,
          params: action.params || {}
        };
      });
      
      // Create a planning prompt
      const systemContent = `You are a planning agent for a scientific workflow assistant.
Your task is to create a plan to respond to the user's request in the context of their current workflow.

Current context:
- Workflow: ${workflow}
- Step: ${step}
- Context: ${contextDescription}

Available actions:
${JSON.stringify(formattedActions, null, 2)}

Available data queries:
- project-info: Get information about the current project
- current-step-data: Get data for the current workflow step
- lead-compounds: Get information about lead compounds
- filter-options: Get available filtering options
- listAvailableProjects: Get list of available projects
- listCharacteristics: Get characteristics for the current step

Create a JSON plan with these fields:
1. "steps": An array of steps to execute, where each step has:
   - "type": One of "data" (retrieve data), "action" (perform action), or "llm" (generate response)
   - "action": The specific query type or action ID to execute
   - "params": Parameters for the query or action (if needed)
   - "critical": Boolean indicating if this step is critical (failing aborts plan)
2. "fallbackResponse": A simple response if the plan fails
3. "response": Optional template response with placeholders for data

Return ONLY valid JSON without explanation or markdown. The JSON should be directly parseable.`;

      // Call the LLM to generate a plan
      const integrationAgent = await this.getIntegrationAgent();
      const planResponse = await integrationAgent.callLLM({
        role: 'system',
        content: systemContent
      }, false, userMessage);
      
      // Parse the response as JSON
      let plan;
      try {
        // Extract JSON if it's wrapped in code blocks
        const jsonMatch = planResponse.match(/```(?:json)?([\s\S]*?)```/) || 
                         planResponse.match(/\{[\s\S]*\}/);
        
        const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '').trim() : planResponse;
        plan = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse plan JSON:', e);
        
        // Create a simple fallback plan
        plan = {
          steps: [{
            type: 'llm',
            action: 'generate-response',
            params: { userMessage }
          }],
          fallbackResponse: "I'm not sure how to handle that request in the current context."
        };
      }
      
      return plan;
    } catch (error) {
      console.error('Error generating plan:', error);
      
      // Return a minimal fallback plan that will work even with errors
      return {
        steps: [{
          type: 'llm',
          action: 'generate-response',
          params: { userMessage }
        }],
        fallbackResponse: "I'm having trouble processing your request right now. Could you try rephrasing it?"
      };
    }
  }

  /**
   * Build a response from the LLM based on execution results
   * @param {Object} step The LLM step from the plan
   * @param {Array} previousResults Results from previous steps
   * @returns {String} Generated response
   */
  async buildResponseFromLLM(step, previousResults) {
    this.init();
    
    // Extract userMessage with fallback
    let userMessage = '';
    if (step.params && step.params.userMessage) {
      userMessage = step.params.userMessage;
    } else {
      // Fallback: check if originalMessage was passed instead
      if (step.originalMessage) {
        userMessage = step.originalMessage;
      } else if (step.message) {
        userMessage = step.message;
      } else {
        // Last resort: try to find it in the execution context
        const executionContext = this.assistantStore.getState()?.executionContext;
        if (executionContext && executionContext.userMessage) {
          userMessage = executionContext.userMessage;
        } else {
          console.warn('LLM step missing userMessage, using generic query');
          userMessage = "What is the current context?";
        }
      }
    }
    
    // Ensure we have a context description, or use a fallback
    let contextDescription = "You are a scientific workflow assistant.";
    try {
      contextDescription = this.contextAgent.getContextDescription() || contextDescription;
    } catch (error) {
      console.warn('Error getting context description for LLM response:', error);
    }
    
    // Collect data from previous steps
    const dataResults = previousResults
      .filter(r => r.success && r.step.type === 'data')
      .map(r => r.result);
    
    // Format data results for the prompt
    const formattedData = dataResults.map(data => {
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }
      return String(data);
    }).join('\n\n');
    
    // Create a prompt for the LLM
    const systemContent = `You are a helpful scientific workflow assistant.
Generate a natural language response to the user's message based on the following data.
Make your response concise, friendly, and focused on the user's request.

Context: ${contextDescription}

Available data:
${formattedData || 'No specific data available.'}

User Message: "${userMessage}"

Format your response in natural language. Do not include JSON, code blocks, or other formatting.
Focus on being helpful and concise. If you don't have enough information to answer completely,
be honest about limitations but still provide what help you can.`;

    try {
      // Call the LLM to generate a response
      const integrationAgent = await this.getIntegrationAgent();
      return await integrationAgent.callLLM({
        role: 'system',
        content: systemContent
      }, false, userMessage);
    } catch (error) {
      console.error('Error building LLM response:', error);
      return `I found some information, but I'm having trouble formatting a complete response. ${formattedData ? 'Here is what I found: ' + formattedData.substring(0, 200) + '...' : 'Could you try a more specific question?'}`;
    }
  }
}

export default new PlanningAgent(); 