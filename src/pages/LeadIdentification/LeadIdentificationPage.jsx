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
    
    // Add step-specific data
    if (currentStep === 5 && data.currentView) { // For Ligand Design step
      contextData.currentView = data.currentView;
    }
    
    // Generate available actions
    const availableActions = [];
    
    // Add navigation actions
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
    if (currentStep === 5) { // Ligand Design
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
    
    // Add event listeners
    window.addEventListener('navigateToStep', navigateToStepHandler);
    window.addEventListener('changeView', changeViewHandler);
    
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('navigateToStep', navigateToStepHandler);
      window.removeEventListener('changeView', changeViewHandler);
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