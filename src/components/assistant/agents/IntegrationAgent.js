import useChatStore from '../store/chatStore';
import useAssistantStore from '../store/assistantStore';
import ContextAgent from './ContextAgent';

/**
 * Integration Agent - Handles communication with the LLM
 * Manages API calls, streaming responses, and result formatting
 */
class IntegrationAgent {
  constructor() {
    this.chatStore = null;
    this.assistantStore = null;
    this.apiKey = null;
    this.planningAgentInstance = null;
  }

  /**
   * Initialize the agent with the latest store references
   */
  init() {
    this.chatStore = useChatStore.getState();
    this.assistantStore = useAssistantStore.getState();
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    return this;
  }
  
  /**
   * Get PlanningAgent safely without circular dependencies
   * @returns {Promise<Object>} PlanningAgent instance
   */
  async getPlanningAgent() {
    if (this.planningAgentInstance) {
      return this.planningAgentInstance;
    }
    
    try {
      // Dynamic import avoids circular dependencies
      const module = await import('./PlanningAgent');
      this.planningAgentInstance = module.default;
      return this.planningAgentInstance;
    } catch (error) {
      console.error('Error loading PlanningAgent:', error);
      throw new Error('Failed to load PlanningAgent. Please refresh the page and try again.');
    }
  }

  /**
   * Process a user message through the assistant workflow
   * @param {String} userMessage The user's message
   * @returns {Object} Processing result
   */
  async processUserMessage(userMessage) {
    this.init();
    
    try {
      // Set the application to processing state
      this.assistantStore.setProcessing(true);
      
      // Add the user message to the chat
      const userMsg = this.chatStore.addUserMessage(userMessage);
      
      // Create a placeholder for the assistant's response
      const assistantMsg = this.chatStore.addAssistantMessage('...');
      
      // Clear any previous execution trace
      this.assistantStore.clearExecutionTrace();
      
      // Start tracking execution for debugging
      this.assistantStore.addExecutionStep({
        agent: 'IntegrationAgent',
        action: 'process-message',
        message: userMessage
      });
      
      try {
        // Use the planning agent to plan and execute the request
        const PlanningAgent = await this.getPlanningAgent();
        const executionResult = await PlanningAgent.planAndExecute(userMessage);
        
        // Format the final response
        const formattedResponse = await this.formatResponse(userMessage, executionResult);
        
        // Update the assistant message with the response
        this.chatStore.updateMessage(assistantMsg.id, formattedResponse);
        
        // Log execution results for debugging
        this.assistantStore.addExecutionStep({
          agent: 'IntegrationAgent',
          action: 'execution-complete',
          result: { 
            executionSuccess: true,
            hasResponse: !!formattedResponse
          }
        });
        
        return {
          success: true,
          message: formattedResponse
        };
      } catch (error) {
        console.error('Error processing message:', error);
        
        // Get the current context for fallback
        const context = ContextAgent.getContextDescription();
        
        // Generate a fallback response
        const fallbackResponse = `I'm having trouble processing your request right now. ${
          this.assistantStore.isDebugMode ? `Error: ${error.message}` : 'Please try again or rephrase your question.'
        }`;
        
        // Update the assistant message with the fallback
        this.chatStore.updateMessage(assistantMsg.id, fallbackResponse);
        
        // Log the error for debugging
        this.assistantStore.addExecutionStep({
          agent: 'IntegrationAgent',
          action: 'execution-error',
          error: error.message
        });
        
        return {
          success: false,
          error: error.message,
          message: fallbackResponse
        };
      }
    } catch (error) {
      console.error('Critical error in IntegrationAgent:', error);
      return {
        success: false,
        error: error.message,
        message: "I encountered a system error while processing your request."
      };
    } finally {
      // Always set processing to false when done
      this.assistantStore.setProcessing(false);
    }
  }

  /**
   * Call the LLM API to get a response
   * @param {Object} systemPrompt System prompt for the LLM
   * @param {Boolean} streamResponse Whether to stream the response
   * @param {String} userMessage The user's message
   * @returns {String} LLM response
   */
  async callLLM(systemPrompt, streamResponse = false, userMessage = '') {
    this.init();
    
    if (!this.apiKey) {
      console.warn('Missing API key for OpenRouter, using fallback response');
      return `I'm currently unable to process your request due to a configuration issue. Please check the API key setup.`;
    }
    
    // Track API call in debug trace
    this.assistantStore.addExecutionStep({
      agent: 'IntegrationAgent',
      action: 'llm-call',
      systemPrompt,
      userMessage
    });
    
    try {
      // Use the OpenRouter API to call Claude
      const messages = [];
      
      // Handle different prompt formats
      if (typeof systemPrompt === 'string') {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      } else if (systemPrompt.role && systemPrompt.content) {
        messages.push({
          role: systemPrompt.role,
          content: systemPrompt.content
        });
      } else if (Array.isArray(systemPrompt)) {
        // If it's already an array of messages, use it directly
        messages.push(...systemPrompt);
      } else {
        // Default system message
        messages.push({
          role: 'system',
          content: 'You are a helpful scientific workflow assistant.'
        });
      }
      
      // Add user message if provided
      if (userMessage) {
        messages.push({
          role: 'user',
          content: userMessage
        });
      }
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Scientific Workflow Assistant'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-sonnet',
          messages,
          temperature: 0.3,
          max_tokens: 1500,
          stream: streamResponse
        })
      });
      
      // Handle streaming responses
      if (streamResponse) {
        return this.handleStreamingResponse(response);
      }
      
      // Handle regular responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      
      // Log the response for debugging
      this.assistantStore.addExecutionStep({
        agent: 'IntegrationAgent',
        action: 'llm-response',
        response: data
      });
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM API error:', error);
      
      // Log the error for debugging
      this.assistantStore.addExecutionStep({
        agent: 'IntegrationAgent',
        action: 'llm-error',
        error: error.message
      });
      
      // Try one more time with a simpler prompt if the original fails
      if (!error.message.includes('retry')) {
        try {
          console.log('Attempting LLM retry with simplified prompt...');
          
          // Create a simplified prompt
          const simplifiedPrompt = {
            role: 'system',
            content: `You are a helpful scientific workflow assistant. 
Please provide a brief, helpful response to: "${userMessage}"`
          };
          
          // Add retry marker to prevent infinite retries
          const retryMessages = [
            simplifiedPrompt,
            {
              role: 'user', 
              content: `${userMessage} [retry]`
            }
          ];
          
          const retryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Scientific Workflow Assistant'
            },
            body: JSON.stringify({
              model: 'anthropic/claude-3-haiku', // Use a smaller model for the retry
              messages: retryMessages,
              temperature: 0.3,
              max_tokens: 800
            })
          });
          
          if (!retryResponse.ok) {
            throw new Error('Retry failed');
          }
          
          const retryData = await retryResponse.json();
          return retryData.choices[0].message.content;
        } catch (retryError) {
          console.error('LLM retry failed:', retryError);
        }
      }
      
      // If all attempts fail, return a fallback response
      return "I'm having trouble generating a response right now. Please try again or rephrase your question.";
    }
  }
  
  /**
   * Handle streaming response from the LLM API
   * @param {Response} response Fetch API response object
   * @returns {Promise<String>} Complete response text
   */
  async handleStreamingResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API streaming request failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = '';
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode and process this chunk
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.choices && data.choices[0]?.delta?.content) {
                const content = data.choices[0].delta.content;
                responseText += content;
                
                // We could update the message incrementally here if needed
              }
            } catch (e) {
              console.warn('Error parsing streaming data:', e);
            }
          }
        }
      }
      
      return responseText;
    } catch (error) {
      console.error('Error processing stream:', error);
      throw error;
    }
  }

  /**
   * Format the final response based on execution results
   * @param {String} userMessage The original user message
   * @param {Object} executionResult Result from the planning agent
   * @returns {String} Formatted response
   */
  async formatResponse(userMessage, executionResult) {
    try {
      // Check if there were errors in any steps
      const errors = executionResult.results
        .filter(r => !r.success)
        .map(r => r.error || 'Unknown error');
      
      // Get all successful data retrieval results
      const dataResults = executionResult.results
        .filter(r => r.success && r.step.type === 'data')
        .map(r => r.result);
      
      // Check if any actions were performed
      const actions = executionResult.results
        .filter(r => r.success && r.step.type === 'action')
        .map(r => r.result);
      
      // If the execution included a response step, use that
      if (executionResult.response) {
        // But ensure it's in natural language and not JSON
        let response = executionResult.response;
        
        // Check if the response is an object
        if (typeof response === 'object') {
          // If the object has a 'response' or 'message' property, use it
          if (response.response) {
            return response.response;
          }
          if (response.message) {
            return response.message;
          }
          if (response.responseText) {
            // Special handling for responseText that might contain placeholders
            // Format with data from data results if possible
            let text = response.responseText;
            dataResults.forEach(data => {
              if (data) {
                Object.keys(data).forEach(key => {
                  // Handle array data
                  if (Array.isArray(data[key])) {
                    const formatted = data[key].map(item => {
                      if (typeof item === 'object') {
                        return Object.entries(item)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ");
                      }
                      return item;
                    }).join(", ");
                    text = text.replace(`{{data.${key}}}`, formatted);
                  } else if (typeof data[key] === 'object') {
                    text = text.replace(`{{data.${key}}}`, JSON.stringify(data[key]));
                  } else {
                    text = text.replace(`{{data.${key}}}`, data[key]);
                  }
                });
              }
            });
            return text;
          }
          
          // Otherwise format the entire object as natural language
          return this.formatObjectAsNaturalLanguage(response);
        }
        
        return response;
      }
      
      // If there was an error but we have fallback data, use it
      if (errors.length > 0 && dataResults.some(d => d && d.fallbackData)) {
        const fallbackData = dataResults.find(d => d && d.fallbackData).fallbackData;
        if (fallbackData.message) {
          return fallbackData.message;
        }
      }
      
      // Format the data results if available
      if (dataResults.length > 0) {
        // Try to create a natural language response from the data
        return this.formatDataResultsAsNaturalLanguage(dataResults, userMessage);
      }
      
      // If actions were performed, mention what was done
      if (actions.length > 0) {
        return `I've completed the requested operation${actions.length > 1 ? 's' : ''}.`;
      }
      
      // Otherwise, generate a response using the LLM
      const contextDescription = ContextAgent.getContextDescription();
      
      const prompt = {
        role: 'system',
        content: `You are a helpful scientific workflow assistant.
Generate a natural language response to the user's message based on the following execution results.
Make your response concise, friendly, and focused on the user's request.

Context: ${contextDescription}

Execution Results:
${JSON.stringify(executionResult, null, 2)}

User Message: "${userMessage}"

Format your response as natural language, directly addressing the user's question without mentioning the execution details.
Focus on what was done and what the user can do next.
DO NOT include JSON objects, messageText, responseText, or other formatting markers. Just respond in plain language.`
      };
      
      // Generate a response using the LLM
      const response = await this.callLLM(prompt, false);
      
      return response;
    } catch (error) {
      console.error('Error formatting response:', error);
      
      // Use fallback response if available
      if (executionResult.plan?.fallbackResponse) {
        return executionResult.plan.fallbackResponse;
      }
      
      // Default fallback
      return `I'm sorry, I encountered an issue processing your request. Could you please try rephrasing your question?`;
    }
  }

  /**
   * Format an object as natural language
   * @param {Object} obj The object to format
   * @returns {String} Natural language description
   */
  formatObjectAsNaturalLanguage(obj) {
    // Handle empty or null objects
    if (!obj || Object.keys(obj).length === 0) {
      return "I don't have any specific information to share at this time.";
    }
    
    // Special handling for common object formats
    if (obj.projectName) {
      return `You're currently in the ${obj.projectName} project.`;
    }
    
    if (obj.availableProjects) {
      if (Array.isArray(obj.availableProjects) && obj.availableProjects.length > 0) {
        const projectDescriptions = obj.availableProjects.map(p => 
          `${p.name} (${p.disease}, Target: ${p.target})`
        ).join(", ");
        return `The available projects are: ${projectDescriptions}. You can select one to proceed.`;
      }
      return "There are no projects available at the moment.";
    }
    
    if (obj.characteristics) {
      if (Array.isArray(obj.characteristics) && obj.characteristics.length > 0) {
        const charDescriptions = obj.characteristics.map(c => 
          `${c.name}: ${c.value}`
        ).join(", ");
        return `The key characteristics are: ${charDescriptions}.`;
      }
      return "There are no characteristics available for this analysis.";
    }
    
    // Generic object formatting
    const sentences = Object.entries(obj).map(([key, value]) => {
      // Format the key into a more readable form
      const readableKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/Id$/i, 'ID')
        .replace(/Pdb/i, 'PDB');
      
      // Format the value based on its type
      if (value === null || value === undefined) {
        return `${readableKey} is not available.`;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          return `There are no ${key}.`;
        }
        const items = value.map(item => 
          typeof item === 'object' ? JSON.stringify(item) : item
        ).join(", ");
        return `${readableKey}: ${items}.`;
      } else if (typeof value === 'object') {
        return `${readableKey}: ${JSON.stringify(value)}.`;
      } else {
        return `${readableKey}: ${value}.`;
      }
    });
    
    return sentences.join(" ");
  }

  /**
   * Format data results as natural language
   * @param {Array} dataResults Array of data results
   * @param {String} userMessage Original user message
   * @returns {String} Natural language response
   */
  formatDataResultsAsNaturalLanguage(dataResults, userMessage) {
    // Combine all data results
    const combinedData = dataResults.reduce((acc, data) => {
      if (data && typeof data === 'object') {
        return { ...acc, ...data };
      }
      return acc;
    }, {});
    
    // Format the combined data
    return this.formatObjectAsNaturalLanguage(combinedData);
  }
}

export default new IntegrationAgent(); 