import React from 'react';
import useAssistantStore from './store/assistantStore';

/**
 * Toggle button for showing/hiding the assistant sidebar
 */
const AssistantToggle = () => {
  const { isVisible, toggleVisibility } = useAssistantStore();

  return (
    <button
      className={`fixed right-4 bottom-4 z-20 p-3 rounded-full shadow-lg transition-colors duration-300 ${
        isVisible 
          ? 'bg-pharma-blue dark:bg-pharma-teal text-white' 
          : 'bg-white dark:bg-gray-700 text-pharma-blue dark:text-pharma-teal hover:bg-gray-100 dark:hover:bg-gray-600'
      }`}
      onClick={toggleVisibility}
      aria-label={isVisible ? 'Close assistant' : 'Open assistant'}
    >
      {isVisible ? (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M6 18L18 6M6 6l12 12" 
          />
        </svg>
      ) : (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
          />
        </svg>
      )}
    </button>
  );
};

export default AssistantToggle; 