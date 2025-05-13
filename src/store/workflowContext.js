import { create } from 'zustand';

/**
 * Store to manage the workflow context information.
 * Maintains a hierarchical structure of the current workflow state
 * that will be sent to the backend with each message.
 */
export const useWorkflowContext = create((set, get) => ({
  // The workflow context object that will be sent to the backend
  workflowContext: {
    workflow: null,        // e.g., 'lead-identification'
    currentStep: null,     // e.g., 'ligand-design'
    currentView: null,     // e.g., 'grid', 'summary', 'similarity'
    data: {},              // The data currently visible on screen
    availableActions: [],  // Actions that can be performed
  },
  
  // Update the entire context at once
  setWorkflowContext: (context) => set({ workflowContext: context }),
  
  // Update workflow name
  setWorkflow: (workflow) => set(state => ({
    workflowContext: { 
      ...state.workflowContext, 
      workflow,
      // Reset other properties when workflow changes
      currentStep: null,
      currentView: null,
      data: {},
      availableActions: [],
    }
  })),
  
  // Update current step
  setCurrentStep: (currentStep) => set(state => ({
    workflowContext: { 
      ...state.workflowContext, 
      currentStep,
      // Reset view, data and actions when step changes
      currentView: null,
      data: {},
      availableActions: [],
    }
  })),
  
  // Update current view
  setCurrentView: (currentView) => set(state => ({
    workflowContext: { 
      ...state.workflowContext, 
      currentView,
      // Reset data and actions when view changes
      data: {},
      availableActions: [],
    }
  })),
  
  // Update data object
  setData: (data) => set(state => ({
    workflowContext: { 
      ...state.workflowContext,
      data: {
        ...state.workflowContext.data,
        ...data
      }
    }
  })),
  
  // Add new action to available actions list
  addAction: (action) => set(state => {
    const actions = [...state.workflowContext.availableActions];
    // Check if action with same id already exists
    const existingActionIndex = actions.findIndex(a => a.id === action.id);
    if (existingActionIndex >= 0) {
      // Replace existing action
      actions[existingActionIndex] = action;
    } else {
      // Add new action
      actions.push(action);
    }
    
    return {
      workflowContext: {
        ...state.workflowContext,
        availableActions: actions
      }
    };
  }),
  
  // Remove action from available actions list
  removeAction: (actionId) => set(state => ({
    workflowContext: {
      ...state.workflowContext,
      availableActions: state.workflowContext.availableActions.filter(
        action => action.id !== actionId
      )
    }
  })),
  
  // Clear all available actions
  clearActions: () => set(state => ({
    workflowContext: {
      ...state.workflowContext,
      availableActions: []
    }
  })),
})); 