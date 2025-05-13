import React, { useEffect } from 'react';
import { useWorkflowContext } from '../store/workflowContext';

/**
 * Component that updates the workflow context based on its props.
 * This should be used in each page/step component to update the context
 * with the current state of the workflow.
 */
const WorkflowContextProvider = ({ 
  workflow,
  currentStep,
  currentView,
  data,
  availableActions,
  children
}) => {
  const { 
    setWorkflow, 
    setCurrentStep, 
    setCurrentView, 
    setData, 
    clearActions,
    addAction 
  } = useWorkflowContext();
  
  // Update workflow context when props change
  useEffect(() => {
    if (workflow) {
      setWorkflow(workflow);
    }
  }, [workflow, setWorkflow]);
  
  useEffect(() => {
    if (currentStep) {
      setCurrentStep(currentStep);
    }
  }, [currentStep, setCurrentStep]);
  
  useEffect(() => {
    if (currentView) {
      setCurrentView(currentView);
    }
  }, [currentView, setCurrentView]);
  
  useEffect(() => {
    if (data) {
      setData(data);
    }
  }, [data, setData]);
  
  useEffect(() => {
    // Clear existing actions and add new ones
    clearActions();
    
    if (availableActions && availableActions.length > 0) {
      availableActions.forEach(action => {
        addAction(action);
      });
    }
  }, [availableActions, clearActions, addAction]);
  
  return <>{children}</>;
};

export default WorkflowContextProvider; 