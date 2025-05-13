import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store to manage chat messages and history
 * Persists chat history between sessions
 */
const useChatStore = create(
  persist(
    (set, get) => ({
      // List of chat messages
      messages: [],
      
      // Loading state for when a message is being processed
      isLoading: false,
      
      // Error state
      error: null,
      
      // Add a user message to the chat
      addUserMessage: (content) => {
        // Ensure content is always a string
        const safeContent = typeof content === 'object' 
          ? JSON.stringify(content, null, 2)
          : String(content || '');
          
        const message = {
          id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          role: 'user',
          content: safeContent,
          timestamp: new Date().toISOString()
        };
        set((state) => ({
          messages: [...state.messages, message]
        }));
        return message;
      },
      
      // Add an assistant message to the chat
      addAssistantMessage: (content) => {
        // Ensure content is always a string
        const safeContent = typeof content === 'object' 
          ? JSON.stringify(content, null, 2)
          : String(content || '');
          
        const message = {
          id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          role: 'assistant',
          content: safeContent,
          timestamp: new Date().toISOString()
        };
        set((state) => ({
          messages: [...state.messages, message]
        }));
        return message;
      },
      
      // Update a message by ID (used for streaming responses)
      updateMessage: (id, content) => {
        // Ensure content is always a string
        const safeContent = typeof content === 'object' 
          ? JSON.stringify(content, null, 2) 
          : String(content || '');
          
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === id ? { ...msg, content: safeContent } : msg
          )
        }));
      },
      
      // Set loading state
      setLoading: (isLoading) => set({ isLoading }),
      
      // Set error state
      setError: (error) => set({ error }),
      
      // Clear error
      clearError: () => set({ error: null }),
      
      // Clear all messages
      clearMessages: () => set({ messages: [] }),
      
      // Get recent messages for context
      getRecentMessages: (count = 10) => {
        const { messages } = get();
        return messages.slice(-count);
      }
    }),
    {
      name: 'assistant-chat-storage', // Storage key
      partialize: (state) => ({ messages: state.messages.slice(-50) }) // Only store last 50 messages
    }
  )
);

export default useChatStore; 