import { useState, useEffect } from 'react'
import './App.css'
import DiseaseInput from './components/DiseaseInput'
import DiseaseExpertAnalysis from './components/DiseaseExpertAnalysis'
import TargetFiltering from './components/TargetFiltering'
import PDBFiltering from './components/PDBFiltering'
import ResearchReport from './components/ResearchReport'

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Check for user preference in localStorage or system preference
    if (localStorage.getItem('darkMode') !== null) {
      return localStorage.getItem('darkMode') === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [analysisData, setAnalysisData] = useState({
    disease: '',
    projectName: '',
    projectId: null,
    similarDiseases: [],
    targets: [],
    structures: [],
    filteringResults: {}
  });

  // Toggle dark mode and save preference
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', newValue);
      return newValue;
    });
  };

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
    <div className="flex flex-col min-h-screen bg-white dark:bg-pharma-dark text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <header className="bg-pharma-blue dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd" />
              </svg>
              <h1 className="text-2xl font-bold text-white">MoleculeAI Discovery</h1>
            </div>
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="rounded-full p-2 bg-white/10 hover:bg-white/20 text-white"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-6">
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
                          ? 'text-white hover:bg-white/10' 
                          : idx === currentStep + 1
                            ? 'text-white/70 hover:bg-white/10 cursor-pointer'
                            : 'text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-lg mb-1">{step.icon}</span>
                    <span>{step.title}</span>
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
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2023 MoleculeAI Discovery. All rights reserved.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-pharma-blue dark:hover:text-pharma-teal">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-pharma-blue dark:hover:text-pharma-teal">Terms of Service</a>
              <a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-pharma-blue dark:hover:text-pharma-teal">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
