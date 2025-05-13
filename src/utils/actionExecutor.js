import { useWorkflowContext } from '../store/workflowContext';

/**
 * Executes an action returned from the backend.
 * Actions can be navigation, data manipulation, or UI updates.
 * 
 * @param {Object} action - The action to execute
 * @param {Function} get - The get function from Zustand store
 * @param {Function} set - The set function from Zustand store
 * @returns {Promise<any>} - Result of the action execution
 */
export const executeAction = async (action, get, set) => {
  if (!action || !action.type) {
    console.error('Invalid action object:', action);
    return null;
  }
  
  console.log('Executing action:', action);
  
  try {
    switch (action.type) {
      case 'NAVIGATE_STEP':
        // Navigate to a different step in the workflow
        return navigateToStep(action.payload, get, set);
        
      case 'CHANGE_VIEW':
        // Change the current view (e.g., grid, summary, similarity)
        return changeView(action.payload, get, set);
        
      case 'EXECUTE_FILTER':
        // Apply filter to data
        return executeFilter(action.payload, get, set);
        
      case 'EXECUTE_SORT':
        // Sort data
        return executeSort(action.payload, get, set);
        
      case 'EXECUTE_SEARCH':
        // Search data
        return executeSearch(action.payload, get, set);
        
      case 'EXECUTE_API_CALL':
        // Make an API call to perform an action
        return executeApiCall(action.payload, get, set);
        
      case 'SELECT_ITEM':
        // Select an item (e.g., a molecule)
        return selectItem(action.payload, get, set);
        
      case 'SUBMIT_FORM':
        // Submit a form
        return submitForm(action.payload, get, set);
        
      case 'RESET_STATE':
        // Reset some state
        return resetState(action.payload, get, set);
        
      default:
        console.warn('Unknown action type:', action.type);
        return null;
    }
  } catch (error) {
    console.error('Error executing action:', error);
    // Add error message to the chat
    const { addAssistantMessage } = get();
    addAssistantMessage(`I was unable to complete that action. Error: ${error.message}`);
    return null;
  }
};

// Action implementation functions

const navigateToStep = (payload, get, set) => {
  const { step } = payload;
  // This would trigger navigation through whatever mechanism the app uses
  // For example, this might call a setCurrentStep function that's passed from a parent component
  console.log('Navigating to step:', step);
  
  // This is a placeholder - actual implementation would depend on app structure
  return new Promise((resolve) => {
    // Navigate to the step using whatever router or state management the app uses
    window.dispatchEvent(new CustomEvent('navigateToStep', { detail: { step } }));
    resolve({ success: true, step });
  });
};

const changeView = (payload, get, set) => {
  const { view } = payload;
  console.log('Changing view to:', view);
  
  // This would trigger the view change in the current component
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('changeView', { detail: { view } }));
    resolve({ success: true, view });
  });
};

const executeFilter = (payload, get, set) => {
  const { filterType, filterValue } = payload;
  console.log('Applying filter:', filterType, filterValue);
  
  // This would apply filters on the current data
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('applyFilter', { 
      detail: { filterType, filterValue } 
    }));
    resolve({ success: true, filter: { type: filterType, value: filterValue } });
  });
};

const executeSort = (payload, get, set) => {
  const { sortField, sortDirection } = payload;
  console.log('Sorting by:', sortField, sortDirection);
  
  // This would sort the current data
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('applySort', { 
      detail: { sortField, sortDirection } 
    }));
    resolve({ success: true, sort: { field: sortField, direction: sortDirection } });
  });
};

const executeSearch = (payload, get, set) => {
  const { searchQuery } = payload;
  console.log('Searching for:', searchQuery);
  
  // This would perform a search on the current data
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('executeSearch', { 
      detail: { searchQuery } 
    }));
    resolve({ success: true, search: searchQuery });
  });
};

const executeApiCall = async (payload, get, set) => {
  const { endpoint, method = 'GET', data = null } = payload;
  console.log('Executing API call:', endpoint, method, data);
  
  // This would make an API call to perform some action
  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    return { success: true, data: responseData };
  } catch (error) {
    console.error('API call error:', error);
    return { success: false, error: error.message };
  }
};

const selectItem = (payload, get, set) => {
  const { itemId, itemType } = payload;
  console.log('Selecting item:', itemType, itemId);
  
  // This would select an item in the UI
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('selectItem', { 
      detail: { itemId, itemType } 
    }));
    resolve({ success: true, selected: { id: itemId, type: itemType } });
  });
};

const submitForm = (payload, get, set) => {
  const { formId, formData } = payload;
  console.log('Submitting form:', formId, formData);
  
  // This would submit a form
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('submitForm', { 
      detail: { formId, formData } 
    }));
    resolve({ success: true, form: { id: formId, data: formData } });
  });
};

const resetState = (payload, get, set) => {
  const { stateType } = payload;
  console.log('Resetting state:', stateType);
  
  // This would reset some state
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('resetState', { 
      detail: { stateType } 
    }));
    resolve({ success: true, reset: stateType });
  });
}; 