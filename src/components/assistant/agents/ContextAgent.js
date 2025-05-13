import useContextStore from '../store/contextStore';

/**
 * Context Agent - Maintains awareness of the current workflow state
 * Provides context information to other agents for decision making
 */
class ContextAgent {
  constructor() {
    // Store references that will be accessed dynamically
    this.contextStore = null;
  }

  /**
   * Initialize the agent with the latest store references
   * Called before each use to ensure current store state
   */
  init() {
    this.contextStore = useContextStore.getState();
    return this;
  }

  /**
   * Get the current workflow context
   * @returns {Object} The current context
   */
  getCurrentContext() {
    this.init();
    return this.contextStore.getFormattedContext();
  }

  /**
   * Get a description of the current workflow state
   * @returns {String} Human-readable description of the current context
   */
  getContextDescription() {
    this.init();
    const { workflow, step, section } = this.contextStore;
    
    if (!workflow) {
      return "You're currently not in any specific workflow.";
    }

    let description = `You're currently in the ${formatName(workflow)} workflow.`;
    
    if (step) {
      description += ` You're on the ${formatName(step)} step.`;
      
      if (section) {
        description += ` Specifically, you're in the ${formatName(section)} section.`;
      }
    }
    
    return description;
  }

  /**
   * Determine if a workflow transition is possible
   * @param {String} targetWorkflow The workflow to transition to
   * @returns {Boolean} Whether the transition is possible
   */
  canTransitionToWorkflow(targetWorkflow) {
    // In this implementation, we allow transitioning to any workflow
    return true;
  }

  /**
   * Determine if a step transition is possible
   * @param {String} targetStep The step to transition to
   * @returns {Object} Status and reason
   */
  canTransitionToStep(targetStep) {
    this.init();
    const { workflow } = this.contextStore;
    
    if (!workflow) {
      return { 
        possible: false, 
        reason: "No active workflow. Please select a workflow first." 
      };
    }
    
    // For Lead Identification workflow, specific logic
    if (workflow === 'lead-identification') {
      const steps = [
        'project-selection',
        'disease-analysis',
        'target-analysis',
        'pocket-analysis',
        'review-lead-characteristics',
        'ligand-design'
      ];
      
      if (!steps.includes(targetStep)) {
        return { 
          possible: false, 
          reason: `Invalid step for ${formatName(workflow)} workflow. Available steps are: ${steps.map(formatName).join(', ')}.`
        };
      }
      
      return { possible: true };
    }
    
    // Default behavior for other workflows
    return { possible: true };
  }

  /**
   * Extract workflow context from a component's props and state
   * @param {Object} props Component props
   * @param {Object} state Component state
   * @returns {Object} Extracted context
   */
  extractContextFromComponent(props, state) {
    // Extract workflow data based on component type
    const context = {};
    
    // Extract basic props
    if (props.data) {
      context.projectId = props.data.projectId;
      context.pdbId = props.data.pdbId;
      context.projectName = props.data.projectName;
      context.disease = props.data.disease;
      context.targetName = props.data.targetName;
    }
    
    // Extract state based on component type
    if (state) {
      // LigandDesign specific context
      if (state.leadData) {
        context.leadData = {
          status: state.leadData.status,
          leadCount: state.leadData.leads?.length || 0
        };
      }
      
      if (state.filters) {
        context.filters = state.filters;
      }
      
      if (state.sortOption) {
        context.sortOption = state.sortOption;
        context.sortDirection = state.sortDirection;
      }
      
      if (state.activeView) {
        context.activeView = state.activeView;
      }
    }
    
    return context;
  }
}

/**
 * Format an ID into a display name
 * @param {String} id The ID to format
 * @returns {String} Formatted name
 */
function formatName(id) {
  if (!id) return '';
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default new ContextAgent(); 