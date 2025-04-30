import { useState, useEffect } from 'react'
import './App.css'
import MainLayout from './components/layout/MainLayout'
import Sidebar from './components/layout/Sidebar'
import TargetIdentificationPage from './pages/TargetIdentification/TargetIdentificationPage'
import LeadIdentificationPage from './pages/LeadIdentification/LeadIdentificationPage'
import LeadOptimizationPage from './pages/LeadOptimization/LeadOptimizationPage'
import PCCEvaluationPage from './pages/PCCEvaluation/PCCEvaluationPage'
import PyMolChatPage from './pages/PyMolChat/PyMolChatPage'

function App() {
  const [activeModule, setActiveModule] = useState('target-identification');
  const [moduleKey, setModuleKey] = useState(Date.now());

  // Update the module key whenever the active module changes
  // This ensures components will be unmounted and remounted
  useEffect(() => {
    setModuleKey(Date.now());
  }, [activeModule]);

  // Render the active module
  const renderActiveModule = () => {
    switch (activeModule) {
      case 'target-identification':
        return <TargetIdentificationPage key={moduleKey} activeModule={activeModule} />;
      case 'lead-identification':
        return <LeadIdentificationPage key={moduleKey} activeModule={activeModule} />;
      case 'lead-optimization':
        return <LeadOptimizationPage key={moduleKey} activeModule={activeModule} />;
      case 'pcc-evaluation':
        return <PCCEvaluationPage key={moduleKey} activeModule={activeModule} />;
      case 'pymol-chat':
        return <PyMolChatPage key={moduleKey} activeModule={activeModule} />;
      default:
        return <TargetIdentificationPage key={moduleKey} activeModule={activeModule} />;
    }
  };

  return (
    <MainLayout>
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      {renderActiveModule()}
    </MainLayout>
  )
}

export default App
