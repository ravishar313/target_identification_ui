import { create } from 'zustand';

/**
 * Main store for the assistant UI state
 * Controls visibility, active features, and UI state
 */
const useAssistantStore = create((set) => ({
  // Whether the assistant sidebar is visible
  isVisible: false,
  
  // Whether the assistant is processing a request
  isProcessing: false,
  
  // Whether the assistant is in debugging mode (shows agent thoughts)
  isDebugMode: false,
  
  // Execution trace for the current request (used in debug mode)
  executionTrace: [],
  
  // Toggle the assistant visibility
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  
  // Set visibility explicitly
  setVisibility: (isVisible) => set({ isVisible }),
  
  // Set processing state
  setProcessing: (isProcessing) => set({ isProcessing }),
  
  // Toggle debug mode
  toggleDebugMode: () => set((state) => ({ isDebugMode: !state.isDebugMode })),
  
  // Add a step to the execution trace
  addExecutionStep: (step) => set((state) => ({
    executionTrace: [...state.executionTrace, { ...step, timestamp: Date.now() }]
  })),
  
  // Clear the execution trace
  clearExecutionTrace: () => set({ executionTrace: [] })
}));

export default useAssistantStore; 