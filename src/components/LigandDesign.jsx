import React, { useState, useEffect } from 'react';
import { endpoints } from '../constants/api';

const LigandDesign = ({ data, onNext, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [leadData, setLeadData] = useState(null);
  const [designParams, setDesignParams] = useState({
    max_rounds: 5,
    max_leads: 100
  });
  const [poolingInterval, setPoolingInterval] = useState(null);

  // Function to submit lead design job
  const submitLeadDesignJob = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(endpoints.designLeadsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: data.projectId,
          pdb_id: data.pdbId,
          max_rounds: designParams.max_rounds,
          max_leads: designParams.max_leads
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit lead design job. Status: ${response.status}`);
      }

      const responseData = await response.json();
      setLeadData(responseData);
      
      // If status is not completed, start polling
      if (responseData.status !== 'completed') {
        startPolling();
      }
    } catch (error) {
      console.error('Error submitting lead design job:', error);
      setError(error.message || 'Failed to submit lead design job');
    } finally {
      setSubmitting(false);
    }
  };

  // Function to poll for lead design status
  const checkLeadDesignStatus = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${endpoints.leadStatusUrl}/${data.projectId}/${data.pdbId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to check lead design status. Status: ${response.status}`);
      }

      const responseData = await response.json();
      setLeadData(responseData);
      
      // If status is completed, stop polling
      if (responseData.status === 'completed' || responseData.error) {
        stopPolling();
      }
    } catch (error) {
      console.error('Error checking lead design status:', error);
      setError(error.message || 'Failed to check lead design status');
      stopPolling();
    } finally {
      setLoading(false);
    }
  };

  // Start polling for status
  const startPolling = () => {
    if (!poolingInterval) {
      const interval = setInterval(checkLeadDesignStatus, 10000); // Poll every 10 seconds
      setPoolingInterval(interval);
    }
  };

  // Stop polling
  const stopPolling = () => {
    if (poolingInterval) {
      clearInterval(poolingInterval);
      setPoolingInterval(null);
    }
  };

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (poolingInterval) {
        clearInterval(poolingInterval);
      }
    };
  }, [poolingInterval]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDesignParams(prev => ({
      ...prev,
      [name]: parseInt(value, 10)
    }));
  };

  // Format SMILES string for display
  const formatSmiles = (smiles) => {
    // For now, just return the SMILES string
    // In a real app, you might want to use a library to render the molecule
    return smiles;
  };

  return (
    <div className="w-full">
      <div className="space-y-6">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">💊</span>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Ligand Design</h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Design lead compounds based on the identified characteristics.
        </p>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        
        {/* Project and Target Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Project</h3>
              <p className="text-gray-900 dark:text-white font-medium">{data.projectName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Disease: {data.disease}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Target</h3>
              <p className="text-gray-900 dark:text-white font-medium">PDB ID: {data.pdbId}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{data.targetName}</p>
            </div>
          </div>
        </div>

        {/* Design Parameters Form (only shown before submission) */}
        {!leadData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Design Parameters</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="max-rounds" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Maximum Rounds
                </label>
                <input
                  type="number"
                  id="max-rounds"
                  name="max_rounds"
                  value={designParams.max_rounds}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-pharma-blue dark:focus:border-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Number of design rounds to perform
                </p>
              </div>
              
              <div>
                <label htmlFor="max-leads" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Maximum Leads
                </label>
                <input
                  type="number"
                  id="max-leads"
                  name="max_leads"
                  value={designParams.max_leads}
                  onChange={handleInputChange}
                  min="10"
                  max="500"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-pharma-blue dark:focus:border-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Maximum number of lead compounds to generate
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Results Display */}
        {leadData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Lead Compounds
                {leadData.status === 'running' && <span className="ml-2 text-sm text-amber-500">(In Progress)</span>}
                {leadData.status === 'completed' && <span className="ml-2 text-sm text-green-500">(Completed)</span>}
              </h3>
              
              {leadData.status === 'running' && (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-pharma-blue dark:text-pharma-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Round {leadData.current_round} of {leadData.max_rounds}
                  </span>
                </div>
              )}
            </div>
            
            {/* Progress indicator */}
            {leadData.status === 'running' && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                <div 
                  className="bg-pharma-blue dark:bg-pharma-teal h-2.5 rounded-full" 
                  style={{ width: `${(leadData.current_round / leadData.max_rounds) * 100}%` }}
                ></div>
              </div>
            )}
            
            {/* Error message */}
            {leadData.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-red-700 dark:text-red-400 mb-4">
                {leadData.error}
              </div>
            )}
            
            {/* Lead compounds list */}
            {leadData.leads && leadData.leads.length > 0 ? (
              <div className="mt-4 max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {leadData.leads.map((smiles, index) => (
                    <div 
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600"
                    >
                      <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mb-2 truncate" title={smiles}>
                        {formatSmiles(smiles)}
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>Lead #{index + 1}</span>
                        <button 
                          className="text-pharma-blue dark:text-pharma-teal hover:underline"
                          onClick={() => navigator.clipboard.writeText(smiles)}
                        >
                          Copy SMILES
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                {leadData.status === 'running' 
                  ? 'Generating lead compounds...' 
                  : 'No lead compounds generated yet.'}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pharma-blue dark:focus:ring-pharma-teal"
          >
            Back
          </button>
          
          <div>
            {!leadData ? (
              <button
                type="button"
                onClick={submitLeadDesignJob}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pharma-blue dark:bg-pharma-teal hover:bg-pharma-blue-dark dark:hover:bg-pharma-teal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pharma-blue dark:focus:ring-pharma-teal disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Design Leads'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pharma-blue dark:bg-pharma-teal hover:bg-pharma-blue-dark dark:hover:bg-pharma-teal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pharma-blue dark:focus:ring-pharma-teal"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LigandDesign; 