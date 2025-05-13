import { create } from 'zustand';

/**
 * Store to track the current workflow context
 * Maintains awareness of the current workflow, step, section, and data
 */
const useContextStore = create((set, get) => ({
  // Current workflow state
  workflow: null,
  step: null,
  section: null,
  
  // Workflow data context
  data: {},
  
  // UI state
  uiState: {},
  
  // Set the current workflow
  setWorkflow: (workflow) => set({ workflow }),
  
  // Set the current step in the workflow
  setStep: (step) => set({ step }),
  
  // Set the current section within a step
  setSection: (section) => set({ section }),
  
  // Update the data context
  updateData: (newData) => set((state) => ({
    data: { ...state.data, ...newData }
  })),
  
  // Update UI state
  updateUIState: (newUIState) => set((state) => ({
    uiState: { ...state.uiState, ...newUIState }
  })),
  
  // Reset the context for a new workflow
  resetContext: () => set({
    step: null,
    section: null,
    data: {},
    uiState: {}
  }),
  
  // Get the current context as a formatted object for the LLM
  getFormattedContext: () => {
    const { workflow, step, section, data, uiState } = get();
    return {
      workflow,
      step,
      section,
      data,
      uiState
    };
  }
}));

export default useContextStore; 