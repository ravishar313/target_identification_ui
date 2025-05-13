import React from 'react';
import AssistantSidebar from './AssistantSidebar';
import AssistantToggle from './AssistantToggle';

/**
 * Main component for the workflow assistant
 * This component should be included in each workflow page
 * 
 * @param {Object} props Component properties
 * @param {Object} props.workflowProps Props from the current workflow component
 * @param {Object} props.workflowState State from the current workflow component
 * @param {Object} props.actionCallbacks Callbacks for executing actions
 */
const WorkflowAssistant = ({ workflowProps, workflowState, actionCallbacks }) => {
  return (
    <>
      <AssistantToggle />
      <AssistantSidebar 
        workflowProps={workflowProps}
        workflowState={workflowState}
        actionCallbacks={actionCallbacks}
      />
    </>
  );
};

export default WorkflowAssistant; 