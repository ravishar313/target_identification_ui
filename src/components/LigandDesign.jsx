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
  const [selectedMolecule, setSelectedMolecule] = useState(null);
  const [selectedMoleculeProps, setSelectedMoleculeProps] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propertiesError, setPropertiesError] = useState(null);
  const [leadsProperties, setLeadsProperties] = useState({});
  const [loadingLeadsProperties, setLoadingLeadsProperties] = useState(false);

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
      } else {
        // Fetch properties for all leads if the job is already completed
        fetchAllLeadProperties(responseData.leads);
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
      
      // If status is completed, stop polling and fetch properties
      if (responseData.status === 'completed') {
        stopPolling();
        fetchAllLeadProperties(responseData.leads);
      } else if (responseData.error) {
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

  // Function to fetch properties for all leads
  const fetchAllLeadProperties = async (leads) => {
    if (!leads || leads.length === 0 || loadingLeadsProperties) return;
    
    setLoadingLeadsProperties(true);
    
    // Create a copy of the current properties
    const newLeadsProperties = { ...leadsProperties };
    
    // Process leads in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      // Filter out leads that already have properties
      const leadsToFetch = batch.filter(smiles => !newLeadsProperties[smiles]);
      
      if (leadsToFetch.length === 0) continue;
      
      // Fetch properties for each lead in the batch
      await Promise.all(
        leadsToFetch.map(async (smiles) => {
          try {
            const properties = await fetchMoleculePropertiesData(smiles);
            newLeadsProperties[smiles] = properties;
          } catch (error) {
            console.error(`Error fetching properties for ${smiles}:`, error);
            // Set null to indicate failed fetch
            newLeadsProperties[smiles] = null;
          }
        })
      );
      
      // Update state after each batch to show progress
      setLeadsProperties({ ...newLeadsProperties });
    }
    
    setLoadingLeadsProperties(false);
  };

  // Function to fetch molecule properties and return data
  const fetchMoleculePropertiesData = async (smiles) => {
    try {
      const response = await fetch(endpoints.getMoleculePropertiesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ smiles }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch molecule properties. Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  // Function to fetch molecule properties and update state
  const fetchMoleculeProperties = async (smiles) => {
    // If we already have properties for this molecule, use them
    if (leadsProperties[smiles]) {
      setSelectedMoleculeProps(leadsProperties[smiles]);
      return;
    }
    
    setLoadingProperties(true);
    setPropertiesError(null);
    
    try {
      const responseData = await fetchMoleculePropertiesData(smiles);
      setSelectedMoleculeProps(responseData);
      
      // Update the leads properties cache
      setLeadsProperties(prev => ({
        ...prev,
        [smiles]: responseData
      }));
    } catch (error) {
      console.error('Error fetching molecule properties:', error);
      setPropertiesError(error.message || 'Failed to fetch molecule properties');
    } finally {
      setLoadingProperties(false);
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
    // Truncate long SMILES strings for display
    return smiles.length > 40 ? smiles.substring(0, 37) + '...' : smiles;
  };

  // Handle molecule selection
  const handleMoleculeSelect = (smiles) => {
    setSelectedMolecule(smiles);
    fetchMoleculeProperties(smiles);
  };

  // Close the molecule details modal
  const closeMoleculeDetails = () => {
    setSelectedMolecule(null);
    setSelectedMoleculeProps(null);
    setPropertiesError(null);
  };

  // Format property value for display
  const formatPropertyValue = (key, value) => {
    if (key === 'Molecule Image (base64)') return null;
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };

  // Render molecule details modal
  const renderMoleculeDetailsModal = () => {
    if (!selectedMolecule) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Molecule Properties
              </h3>
              <button 
                onClick={closeMoleculeDetails}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingProperties && (
              <div className="flex justify-center items-center p-8">
                <svg className="animate-spin h-8 w-8 text-pharma-blue dark:text-pharma-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-gray-600 dark:text-gray-300">Loading molecule properties...</span>
              </div>
            )}

            {propertiesError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-red-700 dark:text-red-400 mb-4">
                {propertiesError}
              </div>
            )}

            {selectedMoleculeProps && !loadingProperties && (
              <div className="space-y-6">
                {/* Molecule Image */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200 max-w-md">
                    <img 
                      src={selectedMoleculeProps.properties['Molecule Image (base64)']} 
                      alt="Molecular Structure" 
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Card: Basic Properties */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Basic Properties</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">SMILES</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200 font-mono break-all">
                          {formatSmiles(selectedMoleculeProps.smiles)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Molecular Formula</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {selectedMoleculeProps.properties['Molecular Formula']}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Molecular Weight</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {formatPropertyValue('Molecular Weight', selectedMoleculeProps.properties['Molecular Weight'])} Da
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">LogP</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {formatPropertyValue('LogP', selectedMoleculeProps.properties['LogP'])}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">QED</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {formatPropertyValue('QED', selectedMoleculeProps.properties['QED'])}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Second Card: Structural Features */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Structural Features</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">H-Bond Donors</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {selectedMoleculeProps.properties['H-Bond Donors']}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">H-Bond Acceptors</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {selectedMoleculeProps.properties['H-Bond Acceptors']}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Rotatable Bonds</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {selectedMoleculeProps.properties['Rotatable Bonds']}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">TPSA</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {formatPropertyValue('TPSA', selectedMoleculeProps.properties['TPSA'])} Å²
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Rings</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {selectedMoleculeProps.properties['Number of Rings']}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Third Card: Additional Properties */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Additional Properties</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Heavy Atom Count</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {selectedMoleculeProps.properties['Heavy Atom Count']}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Fraction Csp3</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {formatPropertyValue('Fraction Csp3', selectedMoleculeProps.properties['Fraction Csp3'])}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Stereocenters</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {selectedMoleculeProps.properties['Number of Stereocenters']}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lipinski's Rule of Five compliance card */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Drug-likeness</h4>
                    
                    {/* Lipinski's Rule of Five */}
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Lipinski's Rule of Five</div>
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-2 ${selectedMoleculeProps.properties['Molecular Weight'] <= 500 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            MW ≤ 500 ({formatPropertyValue('Molecular Weight', selectedMoleculeProps.properties['Molecular Weight'])})
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-2 ${selectedMoleculeProps.properties['LogP'] <= 5 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            LogP ≤ 5 ({formatPropertyValue('LogP', selectedMoleculeProps.properties['LogP'])})
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-2 ${selectedMoleculeProps.properties['H-Bond Donors'] <= 5 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            H-Bond Donors ≤ 5 ({selectedMoleculeProps.properties['H-Bond Donors']})
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-2 ${selectedMoleculeProps.properties['H-Bond Acceptors'] <= 10 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            H-Bond Acceptors ≤ 10 ({selectedMoleculeProps.properties['H-Bond Acceptors']})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QED Score */}
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">QED Score: {formatPropertyValue('QED', selectedMoleculeProps.properties['QED'])}</div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                        <div 
                          className="bg-pharma-blue dark:bg-pharma-teal h-2.5 rounded-full" 
                          style={{ width: `${selectedMoleculeProps.properties['QED'] * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>0.0</span>
                        <span>1.0 (Ideal)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={closeMoleculeDetails}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render a single lead card with image and properties
  const renderLeadCard = (smiles, index) => {
    const properties = leadsProperties[smiles];
    const isLoading = loadingLeadsProperties && !properties;
    
    return (
      <div 
        key={index}
        onClick={() => handleMoleculeSelect(smiles)}
        className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-1 flex flex-col h-full"
      >
        {/* Molecule Image */}
        <div className="flex justify-center bg-gray-50 dark:bg-gray-800 rounded-md p-2 mb-3 h-32 items-center">
          {isLoading ? (
            <svg className="animate-spin h-8 w-8 text-gray-300 dark:text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : properties ? (
            <img 
              src={properties.properties['Molecule Image (base64)']} 
              alt="Molecular Structure" 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-sm text-gray-400 dark:text-gray-500 text-center">
              Image not available
            </div>
          )}
        </div>
        
        {/* Top section - ID and basic info */}
        <div className="flex justify-between items-start mb-2">
          <div className="text-xs font-medium bg-pharma-blue/10 dark:bg-pharma-teal/10 text-pharma-blue dark:text-pharma-teal px-2 py-1 rounded-md">
            Lead #{index + 1}
          </div>
          <button 
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(smiles);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        
        {/* SMILES string */}
        <div className="text-xs font-mono text-gray-600 dark:text-gray-300 mb-3 truncate" title={smiles}>
          {formatSmiles(smiles)}
        </div>
        
        {/* Properties display */}
        {properties ? (
          <div className="space-y-2 mt-auto">
            <div className="grid grid-cols-2 gap-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Formula</div>
              <div className="text-xs text-gray-800 dark:text-gray-200">
                {properties.properties['Molecular Formula']}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">MW</div>
              <div className="text-xs text-gray-800 dark:text-gray-200">
                {formatPropertyValue('Molecular Weight', properties.properties['Molecular Weight'])}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">LogP</div>
              <div className="text-xs text-gray-800 dark:text-gray-200">
                {formatPropertyValue('LogP', properties.properties['LogP'])}
              </div>
            </div>
            
            {/* QED Score Bar */}
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  QED Score
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200">
                  {formatPropertyValue('QED', properties.properties['QED'])}
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                <div 
                  className="bg-pharma-blue dark:bg-pharma-teal h-1.5 rounded-full" 
                  style={{ width: `${properties.properties['QED'] * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* View Details button */}
            <div className="flex justify-center mt-3">
              <span className="text-xs text-pharma-blue dark:text-pharma-teal hover:underline inline-flex items-center">
                View Details
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        ) : !isLoading ? (
          <div className="flex items-center justify-center py-2 mt-auto">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Properties not available
            </span>
          </div>
        ) : (
          <div className="space-y-2 mt-auto animate-pulse">
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
          </div>
        )}
      </div>
    );
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
              <div className="mt-4 max-h-[600px] overflow-y-auto p-1">
                {/* Loading indicator for properties */}
                {loadingLeadsProperties && Object.keys(leadsProperties).length === 0 && (
                  <div className="flex justify-center items-center py-4">
                    <svg className="animate-spin mr-2 h-5 w-5 text-pharma-blue dark:text-pharma-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Loading lead properties...</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {leadData.leads.map((smiles, index) => renderLeadCard(smiles, index))}
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

      {/* Molecule details modal */}
      {renderMoleculeDetailsModal()}
    </div>
  );
};

export default LigandDesign; 