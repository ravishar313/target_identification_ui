import React, { useState, useRef, useEffect } from 'react';
import useChatStore from './store/chatStore';
import useAssistantStore from './store/assistantStore';

/**
 * Format a message's content to ensure it is properly displayed
 * @param {*} content The message content
 * @returns {String} Formatted content as a string
 */
const formatMessageContent = (content) => {
  if (content === null || content === undefined) {
    return '';
  }
  
  if (typeof content === 'object') {
    try {
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return String(content);
    }
  }
  
  return String(content);
};

/**
 * Format a timestamp to a readable time
 * @param {String} timestamp ISO timestamp
 * @returns {String} Formatted time
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

/**
 * Chat interface component for the assistant
 * Displays messages and provides input field
 */
const AssistantChat = () => {
  const { messages, isLoading, error, clearError } = useChatStore();
  const { isProcessing, isDebugMode, executionTrace, toggleDebugMode, clearExecutionTrace } = useAssistantStore();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [integrationAgent, setIntegrationAgent] = useState(null);

  // Load IntegrationAgent asynchronously on component mount
  useEffect(() => {
    const loadIntegrationAgent = async () => {
      try {
        const module = await import('./agents/IntegrationAgent');
        setIntegrationAgent(module.default);
      } catch (error) {
        console.error('Error loading IntegrationAgent:', error);
        useChatStore.getState().setError('Failed to load the assistant. Please refresh the page.');
      }
    };
    
    loadIntegrationAgent();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when not processing
  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessing || !integrationAgent) return;
    
    // Get the input value and clear the input field immediately
    const messageText = inputValue.trim();
    setInputValue('');
    
    // Clear previous execution trace
    clearExecutionTrace();
    
    // Process the message
    try {
      await integrationAgent.processUserMessage(messageText);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message if the agent failed completely
      useChatStore.getState().setError(`Failed to process message: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Workflow Assistant</h2>
        <div className="flex items-center">
          {/* Debug mode toggle */}
          <button
            onClick={toggleDebugMode}
            className={`mr-2 p-1 rounded-md ${
              isDebugMode 
                ? 'bg-pharma-blue dark:bg-pharma-teal text-white' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label={isDebugMode ? 'Disable debug mode' : 'Enable debug mode'}
            title={isDebugMode ? 'Disable debug mode' : 'Enable debug mode'}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" 
              />
            </svg>
          </button>
          
          {/* Clear chat button */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear the chat history?')) {
                useChatStore.getState().clearMessages();
              }
            }}
            className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
              />
            </svg>
            <p className="text-center">
              Hello! I'm your workflow assistant. Ask me anything about the current workflow or how to perform actions.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div 
                key={message.id || `msg-${index}-${Date.now().toString()}`} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user' 
                      ? 'bg-pharma-blue dark:bg-pharma-teal text-white rounded-br-none' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{formatMessageContent(message.content)}</div>
                  <div className="text-xs mt-1 opacity-70 text-right">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Error message */}
            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-red-700 dark:text-red-400">
                <div className="flex justify-between">
                  <span>Error: {error}</span>
                  <button onClick={clearError} className="text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            {/* Debug view */}
            {isDebugMode && executionTrace.length > 0 && (
              <div className="mt-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Execution Trace</h3>
                  <button
                    onClick={clearExecutionTrace}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
                <div className="text-xs font-mono text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
                  {executionTrace.map((step, index) => (
                    <div key={`trace-${index}`} className="mb-1">
                      <span className="text-gray-500 dark:text-gray-500">[{index + 1}]</span> <span className="text-pharma-blue dark:text-pharma-teal">{step.agent}</span>: {formatMessageContent(step.action)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question..."
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-pharma-blue dark:focus:ring-pharma-teal bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={isProcessing || !inputValue.trim()}
            className={`px-4 py-2 rounded-r-md ${
              isProcessing || !inputValue.trim()
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-pharma-blue dark:bg-pharma-teal text-white hover:bg-pharma-blue-dark dark:hover:bg-pharma-teal-dark'
            }`}
          >
            {isProcessing ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssistantChat; 