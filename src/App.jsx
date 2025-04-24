import { useState } from 'react'
import './App.css'
import DiseaseInput from './components/DiseaseInput'
import DiseaseExpertAnalysis from './components/DiseaseExpertAnalysis'
import StructureExpertAnalysis from './components/StructureExpertAnalysis'
import PDBFiltering from './components/PDBFiltering'
import ResearchReport from './components/ResearchReport'

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisData, setAnalysisData] = useState({
    disease: '',
    similarDiseases: [],
    targets: [],
    structures: [],
    filteringResults: {}
  });

  const steps = [
    { component: DiseaseInput, title: 'Disease Input' },
    { component: DiseaseExpertAnalysis, title: 'Disease Expert Analysis' },
    { component: StructureExpertAnalysis, title: 'Structure Expert Analysis' },
    { component: PDBFiltering, title: 'PDB Filtering' },
    { component: ResearchReport, title: 'Research Report' }
  ];

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
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
                  <div
                    key={idx}
                    className={`text-sm ${
                      idx <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </div>
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
          />
        </div>
      </main>

      {/* Footer Navigation */}
      {currentStep !== steps.length - 1 && (
        <footer className="bg-white border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className={`px-4 py-2 rounded-md ${
                  currentStep === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {currentStep === steps.length - 2 ? 'Generate Report' : 'Next'}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

export default App
