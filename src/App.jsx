import { useState } from 'react'
import './App.css'
import DiseaseInput from './components/DiseaseInput'
import DiseaseExpertAnalysis from './components/DiseaseExpertAnalysis'
import TargetFiltering from './components/TargetFiltering'
import PDBFiltering from './components/PDBFiltering'
import ResearchReport from './components/ResearchReport'

function App() {
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
    { component: DiseaseInput, title: 'Disease Input' },
    { component: DiseaseExpertAnalysis, title: 'Disease Expert Analysis' },
    { component: TargetFiltering, title: 'Target Filtering' },
    { component: PDBFiltering, title: 'PDB Filtering' },
    { component: ResearchReport, title: 'Research Report' }
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Target Identification Pipeline</h1>
          
          {/* Progress Steps */}
          <div className="mt-4">
            <div className="relative">
              <div className="overflow-hidden h-2 flex rounded bg-gray-200">
                <div
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                  className="bg-blue-500 transition-all duration-500"
                />
              </div>
              <div className="mt-2 flex justify-between">
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
                    className={`text-sm px-2 py-1 rounded focus:outline-none transition-colors duration-200 ${
                      idx <= currentStep 
                        ? 'text-blue-600 font-medium hover:bg-blue-50' 
                        : idx === currentStep + 1
                          ? 'text-gray-600 hover:bg-gray-50 cursor-pointer'
                          : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {step.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CurrentComponent
            onNext={handleNext}
            onBack={handleBack}
            data={analysisData}
            setData={setAnalysisData}
            setIsLoading={setIsStepLoading}
          />
        </div>
      </main>

      {/* Footer Navigation - Removed as requested */}
    </div>
  )
}

export default App
