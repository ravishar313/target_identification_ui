import useContextStore from '../store/contextStore';

/**
 * Data Agent - Retrieves data from the application state
 * Provides access to workflow-specific data for answering questions
 */
class DataAgent {
  constructor() {
    this.contextStore = null;
  }

  /**
   * Initialize the agent with the latest store references
   */
  init() {
    this.contextStore = useContextStore.getState();
    return this;
  }

  /**
   * Get data based on a specific query type
   * @param {String} queryType The type of data being requested
   * @param {Object} params Additional parameters for the query
   * @returns {Object} The requested data
   */
  async getData(queryType, params = {}) {
    this.init();
    const { workflow, step, data } = this.contextStore;

    // Log the data retrieval attempt
    console.log(`DataAgent: Retrieving ${queryType} data for ${workflow}/${step}`, params);

    try {
      // Handle different query types
      switch (queryType) {
        case 'project-info':
          return this.getProjectInfo();
        case 'current-step-data':
          return this.getCurrentStepData();
        case 'lead-compounds':
          return this.getLeadCompounds(params);
        case 'filter-options':
          return this.getFilterOptions();
        case 'sorted-data':
          return this.getSortedData(params);
        case 'statistics':
          return this.getStatistics();
        case 'retrieve-context':
          // Return the entire context for the current workflow/step
          return { 
            workflow, 
            step, 
            data: this.getCurrentStepData() 
          };
        case 'projectName':
          // Return just the project name from the data
          return { projectName: data.projectName || 'Unknown Project' };
        case 'listAvailableProjects':
          // Return list of available projects
          return this.getAvailableProjects();
        case 'listCharacteristics':
          // Return characteristics for the current step
          return this.getCharacteristics();
        default:
          console.warn(`Unknown query type: ${queryType}, attempting fallback...`);
          // Try generic fallback based on the query type name
          return this.attemptFallbackQuery(queryType, params);
      }
    } catch (error) {
      console.error('DataAgent error:', error);
      // Return a graceful fallback response
      return {
        error: error.message,
        fallbackData: this.getFallbackData(queryType),
        queryType
      };
    }
  }

  /**
   * Attempt a fallback query based on the query name
   * @param {String} queryType The original query type
   * @param {Object} params Query parameters
   * @returns {Object} Best-effort data
   */
  attemptFallbackQuery(queryType, params) {
    const { data } = this.contextStore;
    
    // Try to infer what data might be needed from the query name
    if (queryType.toLowerCase().includes('project')) {
      return this.getAvailableProjects();
    }
    
    if (queryType.toLowerCase().includes('characteristic') || 
        queryType.toLowerCase().includes('analysis')) {
      return this.getCharacteristics();
    }
    
    if (queryType.toLowerCase().includes('lead') || 
        queryType.toLowerCase().includes('compound')) {
      return this.getLeadCompounds(params);
    }
    
    // Fall back to returning generic context data
    return {
      currentContext: {
        workflow: this.contextStore.workflow,
        step: this.contextStore.step,
        hasData: Object.keys(data || {}).length > 0,
        dataKeys: Object.keys(data || {})
      }
    };
  }

  /**
   * Get fallback data for when a query fails
   * @param {String} queryType The failed query type
   * @returns {Object} Fallback data
   */
  getFallbackData(queryType) {
    const { workflow, step } = this.contextStore;
    
    // Generic fallback based on current workflow step
    if (workflow === 'lead-identification') {
      switch (step) {
        case 'project-selection':
          return {
            message: "Currently on the project selection step. You can select from the available projects shown on screen."
          };
        case 'disease-analysis':
          return {
            message: "Currently analyzing disease characteristics for the selected target."
          };
        case 'target-analysis':
          return {
            message: "Currently analyzing target protein characteristics."
          };
        case 'pocket-analysis':
          return {
            message: "Currently analyzing binding pocket characteristics."
          };
        case 'review-lead-characteristics':
          return {
            message: "Currently reviewing lead compound characteristics."
          };
        case 'ligand-design':
          return {
            message: "Currently on the ligand design step where you can view and filter lead compounds."
          };
        default:
          return {
            message: "Currently in the lead identification workflow."
          };
      }
    }
    
    return {
      message: "Unable to retrieve specific data. Please try a different query."
    };
  }

  /**
   * Get information about the current project
   * @returns {Object} Project information
   */
  getProjectInfo() {
    const { data } = this.contextStore;
    return {
      projectId: data.projectId,
      projectName: data.projectName,
      disease: data.disease,
      pdbId: data.pdbId,
      targetName: data.targetName
    };
  }

  /**
   * Get list of available projects
   * @returns {Object} Available projects
   */
  getAvailableProjects() {
    const { data } = this.contextStore;
    
    // If available projects exist in the data, return them
    if (data.availableProjects && Array.isArray(data.availableProjects)) {
      return { availableProjects: data.availableProjects };
    }
    
    // Otherwise, return a placeholder set of projects
    return { 
      availableProjects: [
        { id: "malaria-1", name: "Malaria PfDHODH Inhibitor", disease: "Malaria", target: "Dihydroorotate dehydrogenase", pdbId: "5DEL" },
        { id: "tb-1", name: "Tuberculosis InhA Inhibitor", disease: "Tuberculosis", target: "Enoyl-ACP reductase", pdbId: "4TZK" }
      ],
      note: "These are example projects visible in the UI. Select one to proceed."
    };
  }

  /**
   * Get characteristics for the current step
   * @returns {Object} Characteristics data
   */
  getCharacteristics() {
    const { step, data } = this.contextStore;
    
    switch (step) {
      case 'disease-analysis':
        return {
          characteristics: data.characteristics || [
            { name: "Disease Burden", value: "High", description: "Significant global impact with millions affected annually" },
            { name: "Current Treatments", value: "Limited", description: "Existing treatments face resistance issues" },
            { name: "Target Validation", value: "Strong", description: "Well-validated drug target with known mechanism" }
          ]
        };
      case 'target-analysis':
        return {
          characteristics: data.characteristics || [
            { name: "Structure Available", value: "Yes (PDB: 5DEL)", description: "High-resolution crystal structure available" },
            { name: "Druggability", value: "High", description: "Contains well-defined binding pockets" },
            { name: "Essentiality", value: "Critical", description: "Organism cannot survive without this enzyme" }
          ]
        };
      case 'pocket-analysis':
        return {
          characteristics: data.characteristics || [
            { name: "Pocket Volume", value: "524 Å³", description: "Medium-sized binding pocket" },
            { name: "Hydrophobicity", value: "Mixed", description: "Contains both hydrophobic and hydrophilic regions" },
            { name: "Key Residues", value: "5 identified", description: "Several key interaction points identified" }
          ]
        };
      default:
        return {
          characteristics: []
        };
    }
  }

  /**
   * Get data for the current step in the workflow
   * @returns {Object} Step-specific data
   */
  getCurrentStepData() {
    const { workflow, step, data } = this.contextStore;

    // Return data based on workflow and step
    if (workflow === 'lead-identification') {
      switch (step) {
        case 'project-selection':
          return {
            availableProjects: data.availableProjects || this.getAvailableProjects().availableProjects,
            selectedProject: data.selectedProject
          };
        case 'disease-analysis':
        case 'target-analysis':
        case 'pocket-analysis':
          // If characteristics are missing, provide fallback data
          if (!data.characteristics || data.characteristics.length === 0) {
            return this.getCharacteristics();
          }
          return {
            characteristics: data.characteristics || [],
            analysisStatus: data.analysisStatus
          };
        case 'review-lead-characteristics':
          return {
            leadCharacteristics: data.leadCharacteristics || [],
            selectedCharacteristics: data.selectedCharacteristics || []
          };
        case 'ligand-design':
          return {
            leadData: data.leadData,
            activeView: data.activeView,
            filters: data.filters,
            sortOption: data.sortOption,
            sortDirection: data.sortDirection
          };
        default:
          return {};
      }
    }

    // Default return empty object if workflow/step not recognized
    return {};
  }

  /**
   * Get lead compound data with optional filtering
   * @param {Object} params Filter and sort parameters
   * @returns {Array} Filtered and sorted lead compounds
   */
  getLeadCompounds({ limit = 10, filter = {}, sort = {} } = {}) {
    const { data } = this.contextStore;
    const leads = data.leadData?.leads || [];
    const properties = data.leadsProperties || {};

    // Apply filters if provided
    let filteredLeads = leads;
    if (Object.keys(filter).length > 0) {
      filteredLeads = leads.filter(smiles => {
        const props = properties[smiles];
        if (!props) return false;

        // Apply each filter
        for (const [key, value] of Object.entries(filter)) {
          // Skip if property doesn't exist
          if (!props.properties?.[key]) return false;

          // Handle different filter types
          if (typeof value === 'object') {
            // Range filter
            const propValue = props.properties[key];
            if (value.min !== undefined && propValue < value.min) return false;
            if (value.max !== undefined && propValue > value.max) return false;
          } else {
            // Exact match
            if (props.properties[key] !== value) return false;
          }
        }

        return true;
      });
    }

    // Apply sorting if provided
    if (sort.by) {
      filteredLeads.sort((a, b) => {
        const propsA = properties[a]?.properties;
        const propsB = properties[b]?.properties;
        
        // Skip if any lead doesn't have properties
        if (!propsA || !propsB) return 0;
        
        const valueA = propsA[sort.by];
        const valueB = propsB[sort.by];
        
        // Apply sort direction
        return sort.direction === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      });
    }

    // Apply limit and return
    return filteredLeads.slice(0, limit).map(smiles => ({
      smiles,
      properties: properties[smiles]?.properties
    }));
  }

  /**
   * Get available filter options for the current step
   * @returns {Object} Available filters and their constraints
   */
  getFilterOptions() {
    const { workflow, step } = this.contextStore;

    if (workflow === 'lead-identification' && step === 'ligand-design') {
      return {
        molecularWeight: { type: 'range', min: 0, max: 1000, unit: 'Da' },
        logP: { type: 'range', min: -10, max: 10 },
        hbondDonors: { type: 'range', min: 0, max: 10 },
        hbondAcceptors: { type: 'range', min: 0, max: 20 },
        qed: { type: 'range', min: 0, max: 1 },
        solubility: { type: 'range', min: -10, max: 2 },
        lipinskiCompliant: { type: 'boolean' }
      };
    }

    return {};
  }

  /**
   * Get sorted data based on provided parameters
   * @param {Object} params Sort parameters
   * @returns {Array} Sorted data
   */
  getSortedData({ sortBy, direction = 'asc' } = {}) {
    return this.getLeadCompounds({ sort: { by: sortBy, direction } });
  }

  /**
   * Get statistics about the current data
   * @returns {Object} Statistical data
   */
  getStatistics() {
    const { data } = this.contextStore;
    
    // For lead compounds, return basic statistics
    if (data.leadData?.leads) {
      const leadsCount = data.leadData.leads.length;
      const propertiesCount = Object.keys(data.leadsProperties || {}).length;
      
      // Return basic stats
      return {
        leadsCount,
        propertiesCount,
        status: data.leadData.status,
        // Add more statistics as needed
      };
    }
    
    return {};
  }
}

export default new DataAgent(); 