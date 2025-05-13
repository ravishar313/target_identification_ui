import useContextStore from '../store/contextStore';
import useAssistantStore from '../store/assistantStore';

/**
 * Action Agent - Executes UI actions based on user requests
 * Translates natural language commands into UI actions
 */
class ActionAgent {
  constructor() {
    this.contextStore = null;
    this.assistantStore = null;
    
    // Registry of available actions by workflow and step
    this.actionRegistry = {
      // Lead Identification workflow actions
      'lead-identification': {
        // Actions available across all steps
        '_global': [
          {
            id: 'navigate-next',
            description: 'Navigate to the next step in the workflow',
            execute: this.navigateToNextStep
          },
          {
            id: 'navigate-back',
            description: 'Navigate to the previous step in the workflow',
            execute: this.navigateToPrevStep
          },
          {
            id: 'navigate-to-step',
            description: 'Navigate to a specific step in the workflow',
            execute: this.navigateToStep,
            params: ['stepId']
          }
        ],
        
        // Ligand Design step actions
        'ligand-design': [
          {
            id: 'switch-view',
            description: 'Switch between grid, summary, and similarity views',
            execute: this.switchView,
            params: ['viewName']
          },
          {
            id: 'apply-filter',
            description: 'Apply a filter to the lead compounds',
            execute: this.applyFilter,
            params: ['filterType', 'filterValue']
          },
          {
            id: 'sort-compounds',
            description: 'Sort lead compounds by a specific property',
            execute: this.sortCompounds,
            params: ['sortBy', 'sortDirection']
          },
          {
            id: 'reset-filters',
            description: 'Reset all filters and sorting',
            execute: this.resetFilters
          },
          {
            id: 'show-compound-details',
            description: 'Show details for a specific compound',
            execute: this.showCompoundDetails,
            params: ['compoundId']
          },
          {
            id: 'calculate-similarity',
            description: 'Calculate similarity between compounds',
            execute: this.calculateSimilarity
          }
        ]
      }
    };
    
    // Action execution callbacks - will be set by the components
    this.actionCallbacks = {};
  }

  /**
   * Initialize the agent with the latest store references
   */
  init() {
    this.contextStore = useContextStore.getState();
    this.assistantStore = useAssistantStore.getState();
    return this;
  }

  /**
   * Register action callbacks from components
   * @param {Object} callbacks Map of action callbacks
   */
  registerCallbacks(callbacks) {
    this.actionCallbacks = { ...this.actionCallbacks, ...callbacks };
    console.log('Registered action callbacks:', Object.keys(callbacks));
    return this;
  }

  /**
   * Get available actions for the current context
   * @returns {Array} List of available actions with descriptions
   */
  getAvailableActions() {
    this.init();
    const { workflow, step } = this.contextStore;
    
    if (!workflow) return [];
    
    // Get global actions for the workflow
    const globalActions = this.actionRegistry[workflow]?._global || [];
    
    // Get step-specific actions
    const stepActions = step && this.actionRegistry[workflow]?.[step] || [];
    
    // Combine and return all available actions
    return [...globalActions, ...stepActions].map(action => ({
      id: action.id,
      description: action.description,
      params: action.params || []
    }));
  }

  /**
   * Execute an action based on its ID
   * @param {String} actionId The ID of the action to execute
   * @param {Object} params Parameters for the action
   * @returns {Object} Result of the action execution
   */
  async executeAction(actionId, params = {}) {
    this.init();
    const { workflow, step } = this.contextStore;
    
    // Log the action execution
    console.log(`ActionAgent: Executing ${actionId} in ${workflow}/${step}`, params);
    
    try {
      // Find the action in the available actions
      const action = this.findAction(workflow, step, actionId);
      
      if (!action) {
        console.warn(`Action ${actionId} not found for ${workflow}/${step}`);
        
        // Try to find a close match or fallback action
        const fallbackAction = this.findFallbackAction(actionId, workflow, step);
        
        if (fallbackAction) {
          console.log(`Using fallback action ${fallbackAction.id} instead of ${actionId}`);
          return this.executeActionHandler(fallbackAction.id, params);
        }
        
        throw new Error(`Action ${actionId} not available in current context`);
      }
      
      // Execute the action
      return this.executeActionHandler(actionId, params);
    } catch (error) {
      console.error('Action execution error:', error);
      
      // Try to recover with a fallback if possible
      if (actionId.includes('navigate') || actionId.includes('go-to')) {
        console.log('Attempting navigation fallback...');
        try {
          // Try generic navigation as fallback
          if (actionId.includes('next')) {
            return await this.navigateToNextStep();
          } else if (actionId.includes('prev') || actionId.includes('back')) {
            return await this.navigateToPrevStep();
          }
        } catch (fallbackError) {
          console.error('Navigation fallback failed:', fallbackError);
        }
      }
      
      // Return error result that indicates the action failed but provides context
      return {
        success: false,
        error: error.message,
        actionId,
        params,
        context: {
          workflow,
          step,
          availableActions: this.getAvailableActions()
        }
      };
    }
  }

  /**
   * Find a fallback action when the requested action isn't available
   * @param {String} requestedActionId The action ID that was requested
   * @param {String} workflow Current workflow
   * @param {String} step Current step
   * @returns {Object|null} Fallback action or null if none available
   */
  findFallbackAction(requestedActionId, workflow, step) {
    const availableActions = this.getAvailableActions();
    
    // Try to find a similar action by matching parts of the name
    if (requestedActionId.includes('navigate') || requestedActionId.includes('go-to')) {
      // Find any available navigation action
      return availableActions.find(a => 
        a.id.includes('navigate') || a.id.includes('go-to')
      );
    }
    
    if (requestedActionId.includes('filter')) {
      // Find any available filter action
      return availableActions.find(a => a.id.includes('filter'));
    }
    
    if (requestedActionId.includes('sort')) {
      // Find any available sort action
      return availableActions.find(a => a.id.includes('sort'));
    }
    
    // No good fallback found
    return null;
  }

  /**
   * Execute the appropriate action handler based on action ID
   * @param {String} actionId The ID of the action to execute
   * @param {Object} params Parameters for the action
   * @returns {Object} Result of the action execution
   */
  executeActionHandler(actionId, params = {}) {
    // Execute the appropriate action based on ID
    switch (actionId) {
      case 'navigate-next':
        return this.navigateToNextStep();
      case 'navigate-prev':
        return this.navigateToPrevStep();
      case 'navigate-to-step':
        return this.navigateToStep(params);
      case 'switch-view':
        return this.switchView(params);
      case 'apply-filter':
        return this.applyFilter(params);
      case 'sort-compounds':
        return this.sortCompounds(params);
      case 'reset-filters':
        return this.resetFilters();
      case 'show-compound-details':
        return this.showCompoundDetails(params);
      case 'calculate-similarity':
        return this.calculateSimilarity();
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  /**
   * Find an action in the registry
   * @param {String} workflow The current workflow
   * @param {String} step The current step
   * @param {String} actionId The action ID to find
   * @returns {Object} The action object if found
   */
  findAction(workflow, step, actionId) {
    // Check in global actions for the workflow
    const globalActions = this.actionRegistry[workflow]?._global || [];
    let action = globalActions.find(a => a.id === actionId);
    
    // If not found in global, check in step-specific actions
    if (!action && step) {
      const stepActions = this.actionRegistry[workflow]?.[step] || [];
      action = stepActions.find(a => a.id === actionId);
    }
    
    return action;
  }

  /**
   * Navigate to the next step in the workflow
   */
  navigateToNextStep = async () => {
    if (!this.actionCallbacks.onNext) {
      throw new Error('onNext callback not registered');
    }
    
    this.actionCallbacks.onNext();
    return { success: true, message: 'Navigated to next step' };
  }

  /**
   * Navigate to the previous step in the workflow
   */
  navigateToPrevStep = async () => {
    if (!this.actionCallbacks.onBack) {
      throw new Error('onBack callback not registered');
    }
    
    this.actionCallbacks.onBack();
    return { success: true, message: 'Navigated to previous step' };
  }

  /**
   * Navigate to a specific step in the workflow
   * @param {Object} params Navigation parameters
   */
  navigateToStep = async ({ stepId }) => {
    if (!this.actionCallbacks.goToStep) {
      throw new Error('goToStep callback not registered');
    }
    
    this.actionCallbacks.goToStep(stepId);
    return { 
      success: true, 
      message: `Navigated to ${stepId} step` 
    };
  }

  /**
   * Switch between views in the ligand design step
   * @param {Object} params View parameters
   */
  switchView = async ({ viewName }) => {
    if (!this.actionCallbacks.setActiveView) {
      throw new Error('setActiveView callback not registered');
    }
    
    // Validate view name
    const validViews = ['grid', 'summary', 'similarity'];
    if (!validViews.includes(viewName)) {
      throw new Error(`Invalid view name: ${viewName}. Valid views are: ${validViews.join(', ')}`);
    }
    
    this.actionCallbacks.setActiveView(viewName);
    return { 
      success: true, 
      message: `Switched to ${viewName} view` 
    };
  }

  /**
   * Apply a filter to the lead compounds
   * @param {Object} params Filter parameters
   */
  applyFilter = async ({ filterType, filterValue }) => {
    if (!this.actionCallbacks.applyFilter) {
      throw new Error('applyFilter callback not registered');
    }
    
    this.actionCallbacks.applyFilter(filterType, filterValue);
    return { 
      success: true, 
      message: `Applied ${filterType} filter with value ${JSON.stringify(filterValue)}` 
    };
  }

  /**
   * Sort lead compounds by a specific property
   * @param {Object} params Sort parameters
   */
  sortCompounds = async ({ sortBy, sortDirection = 'asc' }) => {
    if (!this.actionCallbacks.sortCompounds) {
      throw new Error('sortCompounds callback not registered');
    }
    
    this.actionCallbacks.sortCompounds(sortBy, sortDirection);
    return { 
      success: true, 
      message: `Sorted compounds by ${sortBy} in ${sortDirection} order` 
    };
  }

  /**
   * Reset all filters and sorting
   */
  resetFilters = async () => {
    if (!this.actionCallbacks.resetFilters) {
      throw new Error('resetFilters callback not registered');
    }
    
    this.actionCallbacks.resetFilters();
    return { success: true, message: 'Reset all filters and sorting' };
  }

  /**
   * Show details for a specific compound
   * @param {Object} params Compound parameters
   */
  showCompoundDetails = async ({ compoundId }) => {
    if (!this.actionCallbacks.showCompoundDetails) {
      throw new Error('showCompoundDetails callback not registered');
    }
    
    this.actionCallbacks.showCompoundDetails(compoundId);
    return { 
      success: true, 
      message: `Showing details for compound ${compoundId}` 
    };
  }

  /**
   * Calculate similarity between compounds
   */
  calculateSimilarity = async () => {
    if (!this.actionCallbacks.calculateSimilarity) {
      throw new Error('calculateSimilarity callback not registered');
    }
    
    this.actionCallbacks.calculateSimilarity();
    return { success: true, message: 'Calculating similarity between compounds' };
  }
}

export default new ActionAgent(); 