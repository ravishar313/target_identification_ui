import React, { useEffect, useState } from 'react';
import AssistantChat from './AssistantChat';
import useAssistantStore from './store/assistantStore';
import useContextStore from './store/contextStore';

/**
 * Sidebar container for the assistant interface
 * @param {Object} props Component properties
 * @param {Object} props.workflowProps Props from the current workflow component
 * @param {Object} props.workflowState State from the current workflow component
 * @param {Object} props.actionCallbacks Callbacks for executing actions
 */
const AssistantSidebar = ({ workflowProps, workflowState, actionCallbacks }) => {
  const { isVisible } = useAssistantStore();
  const { setWorkflow, setStep, updateData } = useContextStore();
  const [actionAgent, setActionAgent] = useState(null);

  // Load ActionAgent dynamically
  useEffect(() => {
    const loadActionAgent = async () => {
      try {
        const module = await import('./agents/ActionAgent');
        setActionAgent(module.default);
      } catch (error) {
        console.error('Error loading ActionAgent:', error);
      }
    };
    
    loadActionAgent();
  }, []);

  // Update context when workflow props or state change
  useEffect(() => {
    if (workflowProps) {
      // Detect workflow and step from props
      // For example, in LeadIdentificationPage, we'd have data and step props
      
      // Set the workflow
      if (workflowProps.onNext && workflowProps.onBack) {
        setWorkflow('lead-identification');
      }
      
      // Set the step based on the component's currentStep prop if available
      if (workflowState && workflowState.currentStep !== undefined) {
        const stepNames = [
          'project-selection',
          'disease-analysis', 
          'target-analysis', 
          'pocket-analysis',
          'review-lead-characteristics',
          'ligand-design'
        ];
        setStep(stepNames[workflowState.currentStep] || null);
      }
      
      // Update data context with relevant data from props and state
      const contextData = {
        ...workflowProps.data,
      };
      
      // Include state data
      if (workflowState) {
        // For LigandDesign component
        if (workflowState.activeView) {
          contextData.activeView = workflowState.activeView;
        }
        
        if (workflowState.leadData) {
          contextData.leadData = workflowState.leadData;
        }
        
        if (workflowState.filters) {
          contextData.filters = workflowState.filters;
        }
        
        if (workflowState.sortOption) {
          contextData.sortOption = workflowState.sortOption;
          contextData.sortDirection = workflowState.sortDirection;
        }
        
        if (workflowState.leadsProperties) {
          contextData.leadsProperties = workflowState.leadsProperties;
        }
      }
      
      updateData(contextData);
    }
  }, [workflowProps, workflowState, setWorkflow, setStep, updateData]);

  // Register action callbacks with the ActionAgent
  useEffect(() => {
    if (actionCallbacks && actionAgent) {
      actionAgent.registerCallbacks(actionCallbacks);
    }
  }, [actionCallbacks, actionAgent]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 z-10 w-80 bg-white dark:bg-gray-800 shadow-lg border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 transform">
      <AssistantChat />
    </div>
  );
};

export default AssistantSidebar; 