import { create } from 'zustand';
import { executeAction } from '../utils/actionExecutor';
import { BaseUrl } from '../constants/api';

/**
 * Store to manage chat messages and communication with the backend.
 */
export const useChatStore = create((set, get) => ({
  // Chat messages
  messages: [],
  
  // Loading state
  isLoading: false,
  
  // Add a new user message to the chat
  addUserMessage: (text) => set(state => ({
    messages: [...state.messages, { text, isUser: true }]
  })),
  
  // Add a new assistant response to the chat
  addAssistantMessage: (text, action = null) => set(state => ({
    messages: [...state.messages, { 
      text, 
      isUser: false
    }]
  })),
  
  // Add a loading message while waiting for response
  setLoadingMessage: () => set(state => {
    const messages = [...state.messages];
    if (messages.length > 0 && messages[messages.length - 1].isLoading) {
      return { messages }; // Already has a loading message
    }
    return {
      messages: [...messages, { isLoading: true, isUser: false }]
    };
  }),
  
  // Remove the last loading message
  removeLoadingMessage: () => set(state => ({
    messages: state.messages.filter(msg => !msg.isLoading)
  })),
  
  // Clear all messages
  clearMessages: () => set({ messages: [] }),
  
  // Send a message to the backend API
  sendMessage: async (text, context) => {
    // Get current state
    const { addUserMessage, setLoadingMessage, removeLoadingMessage, addAssistantMessage } = get();
    
    // Add user message to chat
    addUserMessage(text);
    
    // Set loading state
    set({ isLoading: true });
    setLoadingMessage();
    
    try {
      const response = await fetch(`${BaseUrl}/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          context: context,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Remove loading message
      removeLoadingMessage();
      
      // Add assistant response and auto-execute action if it exists
      if (data.action) {
        addAssistantMessage(data.message);
        
        // Auto-execute the action after a short delay to ensure the message is displayed first
        setTimeout(() => {
          console.log('Auto-executing action:', data.action);
          executeAction(data.action, get, set);
        }, 500);
      } else {
        addAssistantMessage(data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove loading message
      removeLoadingMessage();
      
      // Add error message with more details for debugging
      let errorMessage = 'I\'m sorry, but there was an error processing your request.';
      
      if (error.message) {
        errorMessage += ` Error: ${error.message}`;
        
        // Check for network errors
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the assistant service. Please check your network connection and try again.';
        }
      }
      
      // Log error details for development
      if (process.env.NODE_ENV !== 'production') {
        console.error('Full error details:', error);
      }
      
      addAssistantMessage(errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },
})); 