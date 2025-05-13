import React, { useState, useEffect } from 'react';
import ProjectPDBSelection from '../../components/ProjectPDBSelection';
import CharacteristicsDisplay from '../../components/CharacteristicsDisplay';
import ReviewLeadCharacteristics from '../../components/ReviewLeadCharacteristics';
import LigandDesign from '../../components/LigandDesign';
import { endpoints } from '../../constants/api';
import WorkflowAssistant from '../../components/WorkflowAssistant';
import WorkflowContextProvider from '../../components/WorkflowContextProvider';

const LeadIdentificationPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({
    projectName: '',
    disease: '',
    projectId: null,
    pdbId: null,
    targetName: null,
    goodStructure: false
  });

  const steps = [
    { 
      title: 'Project Selection', 
      icon: '🔍', 
      component: ProjectPDBSelection,
      description: 'Select a project and target structure to begin lead identification'
    },
    { 
      title: 'Disease Analysis', 
      icon: '🧬', 
      component: CharacteristicsDisplay,
      description: 'Review disease-specific lead characteristics',
    },
    { 
      title: 'Target Analysis', 
      icon: '🎯', 
      component: CharacteristicsDisplay,
      description: 'Review target-specific lead characteristics',
    },
    { 
      title: 'Pocket Analysis', 
      icon: '🧪', 
      component: CharacteristicsDisplay,
      description: 'Review binding pocket-specific lead characteristics',
    },
    { 
      title: 'Review Lead Characteristics', 
      icon: '📋', 
      component: ReviewLeadCharacteristics,
      description: 'Review all lead characteristics for drug design'
    },
    { 
      title: 'Ligand Design', 
      icon: '💊', 
      component: LigandDesign,
      description: 'Design lead compounds based on identified characteristics'
    }
  ];

  // Generate step props based on current data and step
  const getStepProps = (stepIndex) => {
    switch(stepIndex) {
      case 1: // Disease Analysis
        return {
          title: 'Disease Analysis',
          icon: '🧬',
          endpointUrl: endpoints.diseaseCharacteristicsUrl,
          requestData: { project_id: data.projectId }
        };
      case 2: // Target Analysis
        return {
          title: 'Target Analysis',
          icon: '🎯',
          endpointUrl: endpoints.targetCharacteristicsUrl,
          requestData: { project_id: data.projectId, pdb_id: data.pdbId }
        };
      case 3: // Pocket Analysis
        return {
          title: 'Pocket Analysis',
          icon: '🧪',
          endpointUrl: endpoints.pocketCharacteristicsUrl,
          requestData: { project_id: data.projectId, pdb_id: data.pdbId }
        };
      default:
        return {};
    }
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Navigate to a specific step
  const goToStep = (stepIndex) => {
    // Only allow going to previous steps or current step
    // For future steps, user needs to complete the current step first
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  // Get current step component
  const CurrentStepComponent = steps[currentStep].component;
  const additionalProps = getStepProps(currentStep);
  
  // Handle data changes from child components
  const handleDataChange = (childData) => {
    setData(prevData => ({
      ...prevData,
      ...childData
    }));
  };
  
  // Generate workflow context data
  const getWorkflowContextData = () => {
    // Basic workflow info
    const contextData = {
      workflow: 'lead-identification',
      currentStep: steps[currentStep].title.toLowerCase().replace(/\s+/g, '-'),
      data: { ...data },
    };
    
    // Add available steps
    contextData.data.steps = steps.map((step, index) => ({
      id: index,
      title: step.title,
      description: step.description,
      isComplete: index < currentStep,
      isCurrent: index === currentStep,
      isAccessible: index <= currentStep
    }));
    
    // Add step-specific data and actions
    switch(currentStep) {
      case 0: // Project Selection
        // Include available projects list and selected project/PDB details
        contextData.data.availableProjects = data.availableProjects || [];
        contextData.data.availablePDBs = data.availablePDBs || [];
        contextData.data.selectedProject = {
          projectId: data.projectId,
          projectName: data.projectName,
          disease: data.disease
        };
        contextData.data.selectedPDB = {
          pdbId: data.pdbId,
          targetName: data.targetName,
          resolution: data.resolution,
          releaseDate: data.releaseDate
        };
        break;
        
      case 1: // Disease Analysis
        // Include disease characteristics data
        contextData.data.diseaseCharacteristics = data.diseaseCharacteristics || [];
        contextData.data.diseaseAnalysis = {
          disease: data.disease,
          analysisComplete: data.diseaseAnalysisComplete || false,
          summaryPoints: data.diseaseSummaryPoints || []
        };
        break;
        
      case 2: // Target Analysis
        // Include target characteristics data
        contextData.data.targetCharacteristics = data.targetCharacteristics || [];
        contextData.data.targetAnalysis = {
          targetName: data.targetName,
          pdbId: data.pdbId,
          analysisComplete: data.targetAnalysisComplete || false,
          summaryPoints: data.targetSummaryPoints || []
        };
        break;
        
      case 3: // Pocket Analysis
        // Include pocket characteristics data
        contextData.data.pocketCharacteristics = data.pocketCharacteristics || [];
        contextData.data.pocketAnalysis = {
          pdbId: data.pdbId,
          pocketId: data.pocketId,
          pocketVolume: data.pocketVolume,
          pocketSurface: data.pocketSurface,
          pocketResidues: data.pocketResidues || [],
          analysisComplete: data.pocketAnalysisComplete || false,
          summaryPoints: data.pocketSummaryPoints || []
        };
        break;
        
      case 4: // Review Lead Characteristics
        // Include all gathered characteristics
        contextData.data.allCharacteristics = {
          disease: data.diseaseCharacteristics || [],
          target: data.targetCharacteristics || [],
          pocket: data.pocketCharacteristics || []
        };
        contextData.data.selectedCharacteristics = data.selectedCharacteristics || [];
        contextData.data.characteristicsReview = {
          reviewComplete: data.reviewComplete || false,
          notes: data.reviewNotes || ''
        };
        break;
        
      case 5: // Ligand Design
        // Include current view and detailed data for various views
        contextData.currentView = data.currentView || 'grid';
        
        // Common lead design data
        contextData.data.leadDesign = {
          pdbId: data.pdbId,
          designParams: data.designParams || { max_rounds: 5, max_leads: 100 },
          status: data.leadStatus || 'not_started',
          leadCount: data.leads?.length || 0,
        };
        
        // Include all leads data
        if (data.leads && data.leads.length > 0) {
          contextData.data.leads = data.leads;
        }
        
        // Include lead properties data
        if (data.leadsProperties) {
          contextData.data.leadsProperties = data.leadsProperties;
        }
        
        // View-specific data
        if (data.currentView === 'grid') {
          contextData.data.gridView = {
            sortOption: data.sortOption || 'none',
            sortDirection: data.sortDirection || 'asc',
            searchQuery: data.searchQuery || '',
            filters: data.filters || {},
            filteredLeadCount: data.filteredLeads?.length || 0
          };
        } else if (data.currentView === 'summary') {
          contextData.data.summaryView = {
            propertyStats: data.propertyStats || {},
            chartData: data.chartData || {}
          };
        } else if (data.currentView === 'similarity') {
          contextData.data.similarityView = {
            similarityMatrix: data.similarityMatrix ? true : false, // Just indicate if it exists, don't send full matrix
            clusterCount: data.clusterCount || 5,
            similarityCutoff: data.similarityCutoff || 0.7,
            clusters: data.clusters?.map(c => ({ 
              id: c.id, 
              size: c.members?.length || 0 
            })) || [],
            selectedCluster: data.selectedCluster?.id
          };
        }
        
        // Selected molecule data if any
        if (data.selectedMolecule) {
          contextData.data.selectedMolecule = {
            smiles: data.selectedMolecule,
            properties: data.selectedMoleculeProps?.properties || {}
          };
        }
        break;
        
      default:
        break;
    }
    
    // Generate available actions
    const availableActions = [];
    
    // Common navigation actions
    if (currentStep > 0) {
      availableActions.push({
        id: 'navigate-previous',
        type: 'NAVIGATE_STEP',
        label: `Go back to ${steps[currentStep - 1].title}`,
        payload: { step: currentStep - 1 }
      });
    }
    
    if (currentStep < steps.length - 1) {
      availableActions.push({
        id: 'navigate-next',
        type: 'NAVIGATE_STEP',
        label: `Continue to ${steps[currentStep + 1].title}`,
        payload: { step: currentStep + 1 }
      });
    }
    
    // Step-specific actions
    switch(currentStep) {
      case 0: // Project Selection
        // Project and PDB selection actions
        if (data.availableProjects && data.availableProjects.length > 0) {
          data.availableProjects.forEach(project => {
            availableActions.push({
              id: `select-project-${project.id}`,
              type: 'SELECT_ITEM',
              label: `Select Project: ${project.name}`,
              payload: { 
                itemType: 'project', 
                itemId: project.id,
                itemName: project.name,
                itemDisease: project.disease
              }
            });
          });
        }
        
        if (data.availablePDBs && data.availablePDBs.length > 0) {
          data.availablePDBs.forEach(pdb => {
            availableActions.push({
              id: `select-pdb-${pdb.id}`,
              type: 'SELECT_ITEM',
              label: `Select PDB: ${pdb.id}`,
              payload: { 
                itemType: 'pdb', 
                itemId: pdb.id,
                itemName: pdb.targetName
              }
            });
          });
        }
        break;
        
      case 1: // Disease Analysis
      case 2: // Target Analysis  
      case 3: // Pocket Analysis
        // Characteristics toggle actions
        if (
          (currentStep === 1 && data.diseaseCharacteristics) ||
          (currentStep === 2 && data.targetCharacteristics) ||
          (currentStep === 3 && data.pocketCharacteristics)
        ) {
          const characteristics = 
            currentStep === 1 ? data.diseaseCharacteristics :
            currentStep === 2 ? data.targetCharacteristics :
            data.pocketCharacteristics;
            
          if (characteristics && characteristics.length > 0) {
            characteristics.forEach((char, index) => {
              availableActions.push({
                id: `toggle-characteristic-${index}`,
                type: 'SELECT_ITEM',
                label: `Toggle: ${char.name}`,
                payload: { 
                  itemType: 'characteristic', 
                  itemId: index,
                  itemName: char.name,
                  itemValue: char.value
                }
              });
              
              if (char.details) {
                availableActions.push({
                  id: `view-details-${index}`,
                  type: 'SELECT_ITEM',
                  label: `View Details: ${char.name}`,
                  payload: { 
                    itemType: 'characteristic-details', 
                    itemId: index,
                    itemName: char.name
                  }
                });
              }
            });
          }
        }
        break;
        
      case 4: // Review Lead Characteristics
        // Characteristic selection actions
        if (data.allCharacteristics) {
          ['disease', 'target', 'pocket'].forEach(type => {
            if (data.allCharacteristics[type] && data.allCharacteristics[type].length > 0) {
              data.allCharacteristics[type].forEach((char, index) => {
                availableActions.push({
                  id: `toggle-${type}-characteristic-${index}`,
                  type: 'SELECT_ITEM',
                  label: `Toggle ${type} characteristic: ${char.name}`,
                  payload: { 
                    itemType: `${type}-characteristic`, 
                    itemId: index,
                    itemName: char.name
                  }
                });
              });
            }
          });
        }
        break;
        
      case 5: // Ligand Design
        // View change actions
        availableActions.push({
          id: 'change-view-grid',
          type: 'CHANGE_VIEW',
          label: 'Show Grid View',
          payload: { view: 'grid' }
        });
        
        availableActions.push({
          id: 'change-view-summary',
          type: 'CHANGE_VIEW',
          label: 'Show Summary View',
          payload: { view: 'summary' }
        });
        
        availableActions.push({
          id: 'change-view-similarity',
          type: 'CHANGE_VIEW',
          label: 'Show Similarity View',
          payload: { view: 'similarity' }
        });
        
        // Ligand design specific actions
        if (data.leads && data.leads.length > 0) {
          // Add sorting actions
          const sortFields = ['mw', 'logp', 'solubility', 'donors', 'acceptors', 'qed'];
          sortFields.forEach(field => {
            availableActions.push({
              id: `sort-by-${field}`,
              type: 'EXECUTE_SORT',
              label: `Sort by ${field.toUpperCase()}`,
              payload: { 
                sortField: field, 
                sortDirection: 'asc'
              }
            });
          });
          
          // Add filtering actions
          if (data.currentView === 'grid') {
            const filterTypes = [
              { type: 'molecularWeight', label: 'Molecular Weight' },
              { type: 'logP', label: 'LogP' },
              { type: 'solubility', label: 'Solubility' },
              { type: 'hbondDonors', label: 'H-Bond Donors' },
              { type: 'hbondAcceptors', label: 'H-Bond Acceptors' },
              { type: 'qed', label: 'QED' },
              { type: 'lipinskiCompliant', label: 'Lipinski Compliant' }
            ];
            
            filterTypes.forEach(filter => {
              availableActions.push({
                id: `toggle-filter-${filter.type}`,
                type: 'EXECUTE_FILTER',
                label: `Toggle ${filter.label} filter`,
                payload: { 
                  filterType: filter.type,
                  filterToggle: true
                }
              });
            });
            
            // Add search action
            availableActions.push({
              id: 'search-compounds',
              type: 'EXECUTE_SEARCH',
              label: 'Search compounds',
              payload: { searchQuery: '' }
            });
          }
          
          // Add molecule selection actions for first 10 molecules
          const moléculesToShow = data.leads.slice(0, 10);
          moléculesToShow.forEach((smiles, index) => {
            availableActions.push({
              id: `select-molecule-${index}`,
              type: 'SELECT_ITEM',
              label: `View molecule ${index + 1}`,
              payload: { 
                itemType: 'molecule', 
                itemId: smiles
              }
            });
          });
          
          // In similarity view, add cluster selection
          if (data.currentView === 'similarity' && data.clusters) {
            data.clusters.forEach((cluster, index) => {
              availableActions.push({
                id: `select-cluster-${index}`,
                type: 'SELECT_ITEM',
                label: `View cluster ${index + 1}`,
                payload: { 
                  itemType: 'cluster', 
                  itemId: cluster.id
                }
              });
            });
          }
        } else {
          // If no leads yet, add submit design action
          availableActions.push({
            id: 'submit-design',
            type: 'SUBMIT_FORM',
            label: 'Design Leads',
            payload: { 
              formId: 'design-leads-form',
              formData: {
                max_rounds: data.designParams?.max_rounds || 5,
                max_leads: data.designParams?.max_leads || 100
              }
            }
          });
          
          // Add design parameter adjustment actions
          availableActions.push({
            id: 'adjust-max-rounds',
            type: 'SUBMIT_FORM',
            label: 'Adjust Max Rounds',
            payload: { 
              formId: 'adjust-max-rounds',
              formData: { max_rounds: data.designParams?.max_rounds || 5 }
            }
          });
          
          availableActions.push({
            id: 'adjust-max-leads',
            type: 'SUBMIT_FORM',
            label: 'Adjust Max Leads',
            payload: { 
              formId: 'adjust-max-leads',
              formData: { max_leads: data.designParams?.max_leads || 100 }
            }
          });
        }
        break;
        
      default:
        break;
    }
    
    return {
      ...contextData,
      availableActions
    };
  };
  
  // Update context when view changes in Ligand Design
  const handleViewChange = (view) => {
    setData(prevData => ({
      ...prevData,
      currentView: view
    }));
  };
  
  // Listen for custom events from the action executor
  useEffect(() => {
    const navigateToStepHandler = (event) => {
      const { step } = event.detail;
      setCurrentStep(step);
    };
    
    const changeViewHandler = (event) => {
      const { view } = event.detail;
      handleViewChange(view);
    };
    
    const applyFilterHandler = (event) => {
      const { filterType, filterValue, filterToggle } = event.detail;
      // Update data with filter information
      setData(prevData => {
        const currentFilters = prevData.filters || {};
        let updatedFilters;
        
        if (filterToggle) {
          // Toggle the enabled state of the filter
          updatedFilters = {
            ...currentFilters,
            [filterType]: {
              ...currentFilters[filterType],
              enabled: !currentFilters[filterType]?.enabled
            }
          };
        } else {
          // Set specific filter value
          updatedFilters = {
            ...currentFilters,
            [filterType]: {
              ...currentFilters[filterType],
              ...filterValue,
              enabled: true
            }
          };
        }
        
        return {
          ...prevData,
          filters: updatedFilters
        };
      });
    };
    
    const applySortHandler = (event) => {
      const { sortField, sortDirection } = event.detail;
      setData(prevData => ({
        ...prevData,
        sortOption: sortField,
        sortDirection: sortDirection
      }));
    };
    
    const executeSearchHandler = (event) => {
      const { searchQuery } = event.detail;
      setData(prevData => ({
        ...prevData,
        searchQuery
      }));
    };
    
    const selectItemHandler = (event) => {
      const { itemType, itemId, itemName } = event.detail;
      
      switch (itemType) {
        case 'project':
          setData(prevData => ({
            ...prevData,
            projectId: itemId,
            projectName: itemName,
            disease: event.detail.itemDisease
          }));
          break;
          
        case 'pdb':
          setData(prevData => ({
            ...prevData,
            pdbId: itemId,
            targetName: itemName
          }));
          break;
        
        case 'molecule':
          setData(prevData => ({
            ...prevData,
            selectedMolecule: itemId
          }));
          break;
          
        case 'characteristic':
        case 'disease-characteristic':
        case 'target-characteristic':
        case 'pocket-characteristic':
          // Toggle a characteristic selection
          setData(prevData => {
            const selectedCharacteristics = prevData.selectedCharacteristics || [];
            const itemExists = selectedCharacteristics.findIndex(item => 
              item.id === itemId && item.type === itemType
            );
            
            let updatedCharacteristics;
            if (itemExists >= 0) {
              // Remove the characteristic
              updatedCharacteristics = [
                ...selectedCharacteristics.slice(0, itemExists),
                ...selectedCharacteristics.slice(itemExists + 1)
              ];
            } else {
              // Add the characteristic
              updatedCharacteristics = [
                ...selectedCharacteristics,
                { id: itemId, type: itemType, name: itemName }
              ];
            }
            
            return {
              ...prevData,
              selectedCharacteristics: updatedCharacteristics
            };
          });
          break;
          
        case 'cluster':
          setData(prevData => ({
            ...prevData,
            selectedCluster: { id: itemId }
          }));
          break;
          
        default:
          console.warn('Unknown item type:', itemType);
      }
    };
    
    const submitFormHandler = (event) => {
      const { formId, formData } = event.detail;
      
      switch (formId) {
        case 'design-leads-form':
          setData(prevData => ({
            ...prevData,
            designParams: formData
          }));
          break;
          
        case 'adjust-max-rounds':
          setData(prevData => ({
            ...prevData,
            designParams: {
              ...prevData.designParams,
              max_rounds: formData.max_rounds
            }
          }));
          break;
          
        case 'adjust-max-leads':
          setData(prevData => ({
            ...prevData,
            designParams: {
              ...prevData.designParams,
              max_leads: formData.max_leads
            }
          }));
          break;
          
        default:
          console.warn('Unknown form ID:', formId);
      }
    };
    
    const resetStateHandler = (event) => {
      const { stateType } = event.detail;
      
      switch (stateType) {
        case 'filters':
          // Reset all filters
          setData(prevData => ({
            ...prevData,
            filters: {},
            searchQuery: ''
          }));
          break;
          
        case 'sort':
          // Reset sorting
          setData(prevData => ({
            ...prevData,
            sortOption: 'none',
            sortDirection: 'asc'
          }));
          break;
          
        default:
          console.warn('Unknown state type to reset:', stateType);
      }
    };
    
    // Add event listeners
    window.addEventListener('navigateToStep', navigateToStepHandler);
    window.addEventListener('changeView', changeViewHandler);
    window.addEventListener('applyFilter', applyFilterHandler);
    window.addEventListener('applySort', applySortHandler);
    window.addEventListener('executeSearch', executeSearchHandler);
    window.addEventListener('selectItem', selectItemHandler);
    window.addEventListener('submitForm', submitFormHandler);
    window.addEventListener('resetState', resetStateHandler);
    
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('navigateToStep', navigateToStepHandler);
      window.removeEventListener('changeView', changeViewHandler);
      window.removeEventListener('applyFilter', applyFilterHandler);
      window.removeEventListener('applySort', applySortHandler);
      window.removeEventListener('executeSearch', executeSearchHandler);
      window.removeEventListener('selectItem', selectItemHandler);
      window.removeEventListener('submitForm', submitFormHandler);
      window.removeEventListener('resetState', resetStateHandler);
    };
  }, []);

  // Get workflow context data
  const workflowContextData = getWorkflowContextData();

  return (
    <WorkflowContextProvider
      workflow={workflowContextData.workflow}
      currentStep={workflowContextData.currentStep}
      currentView={workflowContextData.currentView}
      data={workflowContextData.data}
      availableActions={workflowContextData.availableActions}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-pharma-blue dark:text-pharma-teal">Lead Identification</h2>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center"
                onClick={() => goToStep(index)}
              >
                <div 
                  className={`flex items-center justify-center w-12 h-12 rounded-full text-lg cursor-pointer ${
                    index === currentStep
                      ? 'bg-pharma-blue dark:bg-pharma-teal text-white'
                      : index < currentStep
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-pharma-blue dark:text-pharma-teal hover:bg-blue-200 dark:hover:bg-blue-900/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.icon}
                </div>
                <span 
                  className={`mt-2 text-xs font-medium max-w-[80px] text-center cursor-pointer ${
                    index === currentStep
                      ? 'text-pharma-blue dark:text-pharma-teal'
                      : index < currentStep
                        ? 'text-pharma-blue dark:text-pharma-teal/80'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          
          {/* Progress Bar */}
          <div className="hidden sm:block w-full bg-gray-200 dark:bg-gray-700 h-1 mt-6 mb-4">
            <div 
              className="bg-pharma-blue dark:bg-pharma-teal h-1 transition-all duration-300" 
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="mt-8">
          <CurrentStepComponent 
            onNext={handleNext} 
            onBack={handleBack}
            data={data}
            setData={setData}
            onViewChange={handleViewChange}
            onDataChange={handleDataChange}
            {...additionalProps}
          />
        </div>
        
        {/* Workflow Assistant */}
        <WorkflowAssistant />
      </div>
    </WorkflowContextProvider>
  );
};

export default LeadIdentificationPage; 