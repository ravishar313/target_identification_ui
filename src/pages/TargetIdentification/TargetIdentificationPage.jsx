import { useState } from 'react';
import DiseaseInput from '../../components/DiseaseInput';
import DiseaseExpertAnalysis from '../../components/DiseaseExpertAnalysis';
import TargetFiltering from '../../components/TargetFiltering';
import PDBFiltering from '../../components/PDBFiltering';
import ResearchReport from '../../components/ResearchReport';

const TargetIdentificationPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState({
    disease: '',
    projectName: '',
    projectId: null,
    similarDiseases: [],
    targets: [],
    structures: [],
    filteringResults: {}
  });

  const steps = [
    { component: DiseaseInput, title: 'Disease Input', icon: '🔍' },
    { component: DiseaseExpertAnalysis, title: 'Disease Analysis', icon: '🧬' },
    { component: TargetFiltering, title: 'Target Filtering', icon: '🎯' },
    { component: PDBFiltering, title: 'Structure Analysis', icon: '🧪' },
    { component: ResearchReport, title: 'Research Report', icon: '📑' }
  ];

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Determine if the Next button should be disabled
  const isNextDisabled = () => {
    // For DiseaseInput step, need a disease name and project name
    if (currentStep === 0) {
      return !analysisData.disease || !analysisData.projectName || analysisData.projectId === null;
    }
    
    // For DiseaseExpertAnalysis step, need similar diseases data or check if loading
    if (currentStep === 1) {
      return isStepLoading || !analysisData.similarDiseases || analysisData.similarDiseases.length === 0;
    }
    
    // For TargetFiltering step, need targets data
    if (currentStep === 2) {
      return isStepLoading || !analysisData.targets || analysisData.targets.length === 0;
    }
    
    // For PDBFiltering step, need structures data
    if (currentStep === 3) {
      return isStepLoading || !analysisData.structures || Object.keys(analysisData.filteringResults).length === 0;
    }
    
    return false;
  };

  const CurrentComponent = steps[currentStep].component;

  return (
    <div className="flex flex-col">
      {/* Progress Steps */}
      <div className="mb-6">
        <div className="relative">
          <div className="overflow-hidden h-2 flex rounded-full bg-blue-200 dark:bg-gray-700">
            <div
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              className="bg-pharma-green dark:bg-pharma-teal transition-all duration-500"
            />
          </div>
          <div className="mt-4 flex justify-between">
            {steps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => {
                  // Only allow navigating to steps we've already completed or the current one
                  // or one step ahead (prevents skipping multiple steps)
                  if (idx <= currentStep + 1) {
                    setCurrentStep(idx);
                  }
                }}
                disabled={idx > currentStep + 1}
                className={`flex flex-col items-center text-sm px-3 py-2 rounded-md focus:outline-none transition-colors duration-200 ${
                  idx === currentStep 
                    ? 'bg-white dark:bg-gray-700 text-pharma-blue dark:text-white shadow-sm' 
                    : idx < currentStep
                      ? 'text-pharma-blue dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700' 
                      : idx === currentStep + 1
                        ? 'text-pharma-blue/70 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                        : 'text-pharma-blue/30 dark:text-white/30 cursor-not-allowed'
                }`}
              >
                <span className="text-lg mb-1">{step.icon}</span>
                <span>{step.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card">
        <CurrentComponent
          onNext={handleNext}
          onBack={handleBack}
          data={analysisData}
          setData={setAnalysisData}
          setIsLoading={setIsStepLoading}
        />
      </div>
    </div>
  );
};

export default TargetIdentificationPage; 