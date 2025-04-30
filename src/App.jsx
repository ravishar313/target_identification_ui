import { useState } from 'react'
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

  // Render the active module
  const renderActiveModule = () => {
    switch (activeModule) {
      case 'target-identification':
        return <TargetIdentificationPage />;
      case 'lead-identification':
        return <LeadIdentificationPage />;
      case 'lead-optimization':
        return <LeadOptimizationPage />;
      case 'pcc-evaluation':
        return <PCCEvaluationPage />;
      case 'pymol-chat':
        return <PyMolChatPage />;
      default:
        return <TargetIdentificationPage />;
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
