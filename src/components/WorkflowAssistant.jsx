import React, { useState, useRef, useEffect } from 'react';
import { useWorkflowContext } from '../store/workflowContext';
import { useChatStore } from '../store/chatStore';
import { BaseUrl } from '../constants/api';

const WorkflowAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [apiStatus, setApiStatus] = useState('unknown'); // 'unknown', 'connected', 'error'
  const messagesEndRef = useRef(null);
  
  // Get the chat messages and actions from our store
  const { messages, sendMessage, isLoading, addAssistantMessage } = useChatStore();
  
  // Get workflow context to send with the message
  const { workflowContext } = useWorkflowContext();
  
  // Add margin to main content when sidebar is open
  useEffect(() => {
    const mainContentEl = document.querySelector('.bg-white.dark\\:bg-gray-800.rounded-lg.shadow-md.p-6');
    if (mainContentEl) {
      if (isOpen) {
        mainContentEl.style.marginRight = '384px'; // 96px (sidebar width) + some extra space
        mainContentEl.style.transition = 'margin-right 0.3s ease-in-out';
      } else {
        mainContentEl.style.marginRight = '0';
      }
    }
    return () => {
      // Reset on unmount
      if (mainContentEl) {
        mainContentEl.style.marginRight = '0';
      }
    };
  }, [isOpen]);
  
  // Console log the current context when it changes
  useEffect(() => {
    console.log('Current workflow context:', workflowContext);
  }, [workflowContext]);
  
  // Console log messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      console.log('Latest message:', messages[messages.length - 1]);
    }
  }, [messages]);
  
  // Test API connection when first opened
  useEffect(() => {
    if (isOpen && apiStatus === 'unknown' && messages.length === 0) {
      testApiConnection();
    }
  }, [isOpen, apiStatus, messages.length]);
  
  // Function to test API connection
  const testApiConnection = async () => {
    try {
      const response = await fetch(`${BaseUrl}/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '__connection_test__',
          context: workflowContext,
          chatHistory: []
        }),
      });
      
      if (response.ok) {
        setApiStatus('connected');
        console.log('Assistant API connection successful');
        // Only add a welcome message if there are no messages yet
        if (messages.length === 0) {
          const welcomeMessage = `Hello! I'm your workflow assistant for the ${
            workflowContext.workflow || 'current'
          } workflow. How can I help you today?`;
          addAssistantMessage(welcomeMessage);
        }
      } else {
        setApiStatus('error');
        console.error('Assistant API connection failed');
      }
    } catch (error) {
      setApiStatus('error');
      console.error('Error connecting to assistant API:', error);
    }
  };
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (input.trim() === '') return;
    
    // Send message to the backend with context
    sendMessage(input, workflowContext);
    setInput('');
  };

  return (
    <>
      {/* Chat toggle button */}
      <button
        className="fixed right-6 bottom-6 z-40 bg-pharma-blue dark:bg-pharma-teal text-white rounded-full p-3 shadow-lg hover:bg-opacity-90"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>
      
      {/* Chat sidebar */}
      <div 
        className={`fixed right-0 top-0 h-full bg-white dark:bg-gray-800 shadow-xl z-30 transition-all duration-300 ease-in-out ${
          isOpen ? 'w-96' : 'w-0'
        } flex flex-col`}
      >
        {isOpen && (
          <>
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Workflow Assistant</h2>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setIsOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {apiStatus === 'error' ? (
                <div className="text-center text-red-500 dark:text-red-400 p-6">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="font-medium mb-2">Connection Error</p>
                  <p className="text-sm">Unable to connect to the assistant service.</p>
                  <button 
                    className="mt-4 bg-pharma-blue dark:bg-pharma-teal text-white px-4 py-2 rounded-md hover:bg-opacity-90"
                    onClick={testApiConnection}
                  >
                    Retry Connection
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 p-6">
                  <p>Ask me anything about this workflow or how to perform specific actions.</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex flex-col ${
                      message.isUser 
                        ? 'items-end' 
                        : 'items-start'
                    }`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.isUser 
                          ? 'bg-pharma-blue dark:bg-pharma-teal text-white rounded-br-none' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      {message.action && (
                        <div className="mt-2 text-xs italic">
                          {message.action.type === 'NAVIGATE_STEP' && (
                            <span>Action: Navigated to {message.action.payload.step + 1}</span>
                          )}
                          {message.action.type === 'CHANGE_VIEW' && (
                            <span>Action: Changed view to {message.action.payload.view}</span>
                          )}
                          {message.action.type === 'EXECUTE_FILTER' && (
                            <span>Action: Applied filter {message.action.payload.filterType}</span>
                          )}
                          {message.action.type === 'EXECUTE_SORT' && (
                            <span>Action: Sorted by {message.action.payload.sortField}</span>
                          )}
                          {message.action.type === 'EXECUTE_SEARCH' && (
                            <span>Action: Searched for "{message.action.payload.searchQuery}"</span>
                          )}
                          {message.action.type === 'SELECT_ITEM' && (
                            <span>Action: Selected {message.action.payload.itemType} {message.action.payload.itemId}</span>
                          )}
                          {message.action.type === 'SUBMIT_FORM' && (
                            <span>Action: Submitted {message.action.payload.formId}</span>
                          )}
                          {message.action.type === 'RESET_STATE' && (
                            <span>Action: Reset {message.action.payload.stateType}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {message.isLoading && (
                      <div className="mt-2 flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '400ms' }}></div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input form */}
            <form 
              className="border-t border-gray-200 dark:border-gray-700 p-4"
              onSubmit={handleSendMessage}
            >
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  disabled={isLoading || apiStatus === 'error'}
                  className="flex-1 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-pharma-blue dark:focus:ring-pharma-teal disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={isLoading || apiStatus === 'error' || input.trim() === ''}
                  className="bg-pharma-blue dark:bg-pharma-teal text-white p-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
};

export default WorkflowAssistant; 