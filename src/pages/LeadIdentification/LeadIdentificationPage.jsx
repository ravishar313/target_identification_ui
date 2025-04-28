import React, { useState, useEffect } from 'react';
import ProjectPDBSelection from '../../components/ProjectPDBSelection';
import CharacteristicsDisplay from '../../components/CharacteristicsDisplay';
import ReviewLeadCharacteristics from '../../components/ReviewLeadCharacteristics';
import { endpoints } from '../../constants/api';

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

  return (
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
          {...additionalProps}
        />
      </div>
    </div>
  );
};

export default LeadIdentificationPage; 