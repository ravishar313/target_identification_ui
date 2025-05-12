import React, { useState, useEffect, useMemo, useRef } from 'react';
import { endpoints } from '../constants/api';
import Chart from 'chart.js/auto';
import * as d3 from 'd3';
import _ from 'lodash';

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
  
  // View state
  const [activeView, setActiveView] = useState('grid'); // 'grid', 'summary', or 'similarity'
  
  // Sort and filter states
  const [sortOption, setSortOption] = useState('none');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    molecularWeight: { min: 0, max: 1000, enabled: false },
    logP: { min: -10, max: 10, enabled: false },
    hbondDonors: { min: 0, max: 10, enabled: false },
    hbondAcceptors: { min: 0, max: 20, enabled: false },
    qed: { min: 0, max: 1, enabled: false },
    solubility: { min: -10, max: 2, enabled: false },
    lipinskiCompliant: { enabled: false, value: true }
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Similarity analysis states
  const [similarityMatrix, setSimilarityMatrix] = useState(null);
  const [loadingSimilarity, setLoadingSimilarity] = useState(false);
  const [similarityError, setSimilarityError] = useState(null);
  const [validSmiles, setValidSmiles] = useState([]);
  const [clusterCount, setClusterCount] = useState(5);
  const [similarityCutoff, setSimilarityCutoff] = useState(0.7);
  const [selectedCluster, setSelectedCluster] = useState(null);

  // Refs for charts
  const qedChartRef = useRef(null);
  const mwChartRef = useRef(null);
  const logPChartRef = useRef(null);
  const solubilityChartRef = useRef(null);
  const lipinskiChartRef = useRef(null);
  const scatterChartRef = useRef(null);
  const similarityMatrixRef = useRef(null);
  const similarityNetworkRef = useRef(null);
  const charts = useRef({});

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

  // Function to fetch properties for all leads in batches
  const fetchAllLeadProperties = async (leads) => {
    if (!leads || leads.length === 0 || loadingLeadsProperties) return;
    
    setLoadingLeadsProperties(true);
    
    try {
      // Process leads in batches to avoid overwhelming the server
      const batchSize = 50; // Increased batch size since we're using the batch API
      const newLeadsProperties = { ...leadsProperties };
      
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        
        // Filter out leads that already have properties
        const leadsToFetch = batch.filter(smiles => !newLeadsProperties[smiles]);
        
        if (leadsToFetch.length === 0) continue;
        
        // Use the batch properties API
        const response = await fetch(endpoints.getBatchMoleculePropertiesUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ smiles_list: leadsToFetch }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch batch molecule properties. Status: ${response.status}`);
        }

        const responseData = await response.json();
        
        // Map the results to the leads
        if (responseData.results && responseData.results.length === leadsToFetch.length) {
          leadsToFetch.forEach((smiles, index) => {
            const props = responseData.results[index];
            newLeadsProperties[smiles] = {
              smiles,
              properties: props
            };
          });
        }
        
        // Update state after each batch to show progress
        setLeadsProperties({ ...newLeadsProperties });
      }
    } catch (error) {
      console.error('Error fetching lead properties:', error);
      setError(error.message || 'Failed to fetch lead properties');
    } finally {
      setLoadingLeadsProperties(false);
    }
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
      const interval = setInterval(checkLeadDesignStatus, 60000); // Poll every 60 seconds
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
  
  // Handle sort option change
  const handleSortChange = (option) => {
    if (sortOption === option) {
      // Toggle direction if clicking the same option
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('asc');
    }
  };
  
  // Handle filter change
  const handleFilterChange = (category, field, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };
  
  // Toggle filter enabled state
  const toggleFilter = (category) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        enabled: !prev[category].enabled
      }
    }));
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilters({
      molecularWeight: { min: 0, max: 1000, enabled: false },
      logP: { min: -10, max: 10, enabled: false },
      hbondDonors: { min: 0, max: 10, enabled: false },
      hbondAcceptors: { min: 0, max: 20, enabled: false },
      qed: { min: 0, max: 1, enabled: false },
      solubility: { min: -10, max: 2, enabled: false },
      lipinskiCompliant: { enabled: false, value: true }
    });
    setSearchQuery('');
    setSortOption('none');
    setSortDirection('asc');
  };
  
  // Check if a lead matches the search query
  const matchesSearchQuery = (smiles, moleculeProps) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const props = moleculeProps?.properties;
    
    if (!props) return false;
    
    // Search in SMILES
    if (smiles.toLowerCase().includes(query)) return true;
    
    // Search in formula
    if (props['Molecular Formula'].toLowerCase().includes(query)) return true;
    
    return false;
  };
  
  // Check if a lead passes all filters
  const passesFilters = (smiles, moleculeProps) => {
    if (!moleculeProps) return false;
    
    const props = moleculeProps.properties;
    
    // Molecular Weight filter
    if (filters.molecularWeight.enabled) {
      const mw = props['Molecular Weight'];
      if (mw < filters.molecularWeight.min || mw > filters.molecularWeight.max) {
        return false;
      }
    }
    
    // LogP filter
    if (filters.logP.enabled) {
      const logP = props['LogP'];
      if (logP < filters.logP.min || logP > filters.logP.max) {
        return false;
      }
    }
    
    // Solubility filter
    if (filters.solubility.enabled) {
      const solubility = props['LogS (Solubility)'];
      if (solubility < filters.solubility.min || solubility > filters.solubility.max) {
        return false;
      }
    }
    
    // H-Bond Donors filter
    if (filters.hbondDonors.enabled) {
      const donors = props['H-Bond Donors'];
      if (donors < filters.hbondDonors.min || donors > filters.hbondDonors.max) {
        return false;
      }
    }
    
    // H-Bond Acceptors filter
    if (filters.hbondAcceptors.enabled) {
      const acceptors = props['H-Bond Acceptors'];
      if (acceptors < filters.hbondAcceptors.min || acceptors > filters.hbondAcceptors.max) {
        return false;
      }
    }
    
    // QED filter
    if (filters.qed.enabled) {
      const qed = props['QED'];
      if (qed < filters.qed.min || qed > filters.qed.max) {
        return false;
      }
    }
    
    // Lipinski's Rule of Five filter
    if (filters.lipinskiCompliant.enabled) {
      const isCompliant = (
        props['Molecular Weight'] <= 500 &&
        props['LogP'] <= 5 &&
        props['H-Bond Donors'] <= 5 &&
        props['H-Bond Acceptors'] <= 10
      );
      
      if (isCompliant !== filters.lipinskiCompliant.value) {
        return false;
      }
    }
    
    return true;
  };
  
  // Get filtered and sorted leads
  const filteredAndSortedLeads = useMemo(() => {
    if (!leadData?.leads) return [];
    
    // Filter leads that have properties and match filters
    const filtered = leadData.leads.filter(smiles => {
      const props = leadsProperties[smiles];
      return (
        props && 
        matchesSearchQuery(smiles, props) && 
        passesFilters(smiles, props)
      );
    });
    
    // If no sort option, return filtered leads as is
    if (sortOption === 'none') return filtered;
    
    // Sort leads based on selected option
    return [...filtered].sort((a, b) => {
      const propsA = leadsProperties[a]?.properties;
      const propsB = leadsProperties[b]?.properties;
      
      // Skip if any lead doesn't have properties
      if (!propsA || !propsB) return 0;
      
      let valueA, valueB;
      
      switch (sortOption) {
        case 'mw':
          valueA = propsA['Molecular Weight'];
          valueB = propsB['Molecular Weight'];
          break;
        case 'logp':
          valueA = propsA['LogP'];
          valueB = propsB['LogP'];
          break;
        case 'solubility':
          valueA = propsA['LogS (Solubility)'];
          valueB = propsB['LogS (Solubility)'];
          break;
        case 'donors':
          valueA = propsA['H-Bond Donors'];
          valueB = propsB['H-Bond Donors'];
          break;
        case 'acceptors':
          valueA = propsA['H-Bond Acceptors'];
          valueB = propsB['H-Bond Acceptors'];
          break;
        case 'qed':
          valueA = propsA['QED'];
          valueB = propsB['QED'];
          break;
        default:
          return 0;
      }
      
      // Apply sort direction
      return sortDirection === 'asc' 
        ? valueA - valueB 
        : valueB - valueA;
    });
  }, [leadData, leadsProperties, sortOption, sortDirection, filters, searchQuery]);
  
  // Count of active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(f => f.enabled).length;
  }, [filters]);

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
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Solubility (LogS)</div>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {formatPropertyValue('LogS (Solubility)', selectedMoleculeProps.properties['LogS (Solubility)'])}
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
            <div className="grid grid-cols-2 gap-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Solubility</div>
              <div className="text-xs text-gray-800 dark:text-gray-200">
                {formatPropertyValue('LogS (Solubility)', properties.properties['LogS (Solubility)'])}
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

  // Render sort and filter controls
  const renderSortAndFilterControls = () => {
    if (!leadData?.leads || leadData.leads.length === 0) return null;
    
    return (
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
          {/* Search input */}
          <div className="relative w-full sm:w-auto mb-2 sm:mb-0">
            <input
              type="text"
              placeholder="Search by SMILES or formula"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-pharma-blue dark:focus:ring-pharma-teal"
            />
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="flex space-x-2 w-full sm:w-auto">
            {/* Sort dropdown */}
            <div className="relative group">
              <button
                className="flex items-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
              >
                <svg className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Sort: {sortOption === 'none' ? 'None' : sortOption.toUpperCase()}
                {sortOption !== 'none' && (
                  <span className="ml-1 text-gray-500">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
              <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 hidden group-hover:block">
                <div className="py-1">
                  <button
                    onClick={() => handleSortChange('none')}
                    className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'none' ? 'bg-gray-100 dark:bg-gray-700 text-pharma-blue dark:text-pharma-teal' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => handleSortChange('mw')}
                    className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'mw' ? 'bg-gray-100 dark:bg-gray-700 text-pharma-blue dark:text-pharma-teal' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    Molecular Weight {sortOption === 'mw' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortChange('logp')}
                    className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'logp' ? 'bg-gray-100 dark:bg-gray-700 text-pharma-blue dark:text-pharma-teal' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    LogP {sortOption === 'logp' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortChange('solubility')}
                    className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'solubility' ? 'bg-gray-100 dark:bg-gray-700 text-pharma-blue dark:text-pharma-teal' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    Solubility {sortOption === 'solubility' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortChange('qed')}
                    className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'qed' ? 'bg-gray-100 dark:bg-gray-700 text-pharma-blue dark:text-pharma-teal' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    QED Score {sortOption === 'qed' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortChange('donors')}
                    className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'donors' ? 'bg-gray-100 dark:bg-gray-700 text-pharma-blue dark:text-pharma-teal' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    H-Bond Donors {sortOption === 'donors' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortChange('acceptors')}
                    className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'acceptors' ? 'bg-gray-100 dark:bg-gray-700 text-pharma-blue dark:text-pharma-teal' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    H-Bond Acceptors {sortOption === 'acceptors' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Filter button */}
            <button
              className={`flex items-center px-3 py-2 text-sm border rounded-md focus:outline-none ${
                activeFilterCount > 0 
                  ? 'border-pharma-blue dark:border-pharma-teal bg-pharma-blue/10 dark:bg-pharma-teal/10 text-pharma-blue dark:text-pharma-teal' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-pharma-blue dark:bg-pharma-teal text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            
            {/* Reset button (only shown when filters are applied) */}
            {(activeFilterCount > 0 || searchQuery || sortOption !== 'none') && (
              <button
                className="flex items-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                onClick={resetFilters}
              >
                <svg className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            )}
          </div>
        </div>
        
        {/* Results count and filter panel toggler */}
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <div>
            Showing {filteredAndSortedLeads.length} of {leadData.leads.length} compounds
          </div>
        </div>
        
        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Molecular Weight filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.molecularWeight.enabled}
                      onChange={() => toggleFilter('molecularWeight')}
                      className="h-4 w-4 mr-2 rounded border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                    />
                    Molecular Weight
                  </label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {filters.molecularWeight.min} - {filters.molecularWeight.max}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.molecularWeight.min}
                    onChange={(e) => handleFilterChange('molecularWeight', 'min', parseFloat(e.target.value))}
                    disabled={!filters.molecularWeight.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.molecularWeight.max}
                    onChange={(e) => handleFilterChange('molecularWeight', 'max', parseFloat(e.target.value))}
                    disabled={!filters.molecularWeight.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Max"
                  />
                </div>
              </div>
              
              {/* LogP filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.logP.enabled}
                      onChange={() => toggleFilter('logP')}
                      className="h-4 w-4 mr-2 rounded border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                    />
                    LogP
                  </label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {filters.logP.min} - {filters.logP.max}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.logP.min}
                    onChange={(e) => handleFilterChange('logP', 'min', parseFloat(e.target.value))}
                    disabled={!filters.logP.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.logP.max}
                    onChange={(e) => handleFilterChange('logP', 'max', parseFloat(e.target.value))}
                    disabled={!filters.logP.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Max"
                  />
                </div>
              </div>
              
              {/* Solubility filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.solubility.enabled}
                      onChange={() => toggleFilter('solubility')}
                      className="h-4 w-4 mr-2 rounded border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                    />
                    Solubility (LogS)
                  </label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {filters.solubility.min} - {filters.solubility.max}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.solubility.min}
                    min="-10"
                    max="2"
                    step="0.1"
                    onChange={(e) => handleFilterChange('solubility', 'min', parseFloat(e.target.value))}
                    disabled={!filters.solubility.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.solubility.max}
                    min="-10"
                    max="2"
                    step="0.1"
                    onChange={(e) => handleFilterChange('solubility', 'max', parseFloat(e.target.value))}
                    disabled={!filters.solubility.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Max"
                  />
                </div>
              </div>
              
              {/* H-Bond Donors filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.hbondDonors.enabled}
                      onChange={() => toggleFilter('hbondDonors')}
                      className="h-4 w-4 mr-2 rounded border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                    />
                    H-Bond Donors
                  </label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {filters.hbondDonors.min} - {filters.hbondDonors.max}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.hbondDonors.min}
                    onChange={(e) => handleFilterChange('hbondDonors', 'min', parseInt(e.target.value, 10))}
                    disabled={!filters.hbondDonors.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.hbondDonors.max}
                    onChange={(e) => handleFilterChange('hbondDonors', 'max', parseInt(e.target.value, 10))}
                    disabled={!filters.hbondDonors.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Max"
                  />
                </div>
              </div>
              
              {/* H-Bond Acceptors filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.hbondAcceptors.enabled}
                      onChange={() => toggleFilter('hbondAcceptors')}
                      className="h-4 w-4 mr-2 rounded border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                    />
                    H-Bond Acceptors
                  </label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {filters.hbondAcceptors.min} - {filters.hbondAcceptors.max}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.hbondAcceptors.min}
                    onChange={(e) => handleFilterChange('hbondAcceptors', 'min', parseInt(e.target.value, 10))}
                    disabled={!filters.hbondAcceptors.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.hbondAcceptors.max}
                    onChange={(e) => handleFilterChange('hbondAcceptors', 'max', parseInt(e.target.value, 10))}
                    disabled={!filters.hbondAcceptors.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Max"
                  />
                </div>
              </div>
              
              {/* Lipinski compliant filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.lipinskiCompliant.enabled}
                    onChange={() => toggleFilter('lipinskiCompliant')}
                    className="h-4 w-4 mr-2 rounded border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                  />
                  Lipinski's Rule of Five
                </label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="lipinski"
                      checked={filters.lipinskiCompliant.value === true}
                      onChange={() => handleFilterChange('lipinskiCompliant', 'value', true)}
                      disabled={!filters.lipinskiCompliant.enabled}
                      className="h-4 w-4 mr-2 rounded-full border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                    />
                    Compliant
                  </label>
                  <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="lipinski"
                      checked={filters.lipinskiCompliant.value === false}
                      onChange={() => handleFilterChange('lipinskiCompliant', 'value', false)}
                      disabled={!filters.lipinskiCompliant.enabled}
                      className="h-4 w-4 mr-2 rounded-full border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                    />
                    Non-compliant
                  </label>
                </div>
              </div>

              {/* QED filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.qed.enabled}
                      onChange={() => toggleFilter('qed')}
                      className="h-4 w-4 mr-2 rounded border-gray-300 text-pharma-blue dark:text-pharma-teal focus:ring-pharma-blue dark:focus:ring-pharma-teal"
                    />
                    QED Score
                  </label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {filters.qed.min} - {filters.qed.max}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.qed.min}
                    min="0"
                    max="1"
                    step="0.1"
                    onChange={(e) => handleFilterChange('qed', 'min', parseFloat(e.target.value))}
                    disabled={!filters.qed.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.qed.max}
                    min="0"
                    max="1"
                    step="0.1"
                    onChange={(e) => handleFilterChange('qed', 'max', parseFloat(e.target.value))}
                    disabled={!filters.qed.enabled}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Generate property statistics for summary view
  const propertyStats = useMemo(() => {
    if (!leadData?.leads || Object.keys(leadsProperties).length === 0) return null;
    
    // Initialize stats object
    const stats = {
      molecularWeight: { min: Infinity, max: -Infinity, avg: 0, counts: {}, compliant: 0 },
      logP: { min: Infinity, max: -Infinity, avg: 0, counts: {}, compliant: 0 },
      hBondDonors: { min: Infinity, max: -Infinity, avg: 0, counts: {}, compliant: 0 },
      hBondAcceptors: { min: Infinity, max: -Infinity, avg: 0, counts: {}, compliant: 0 },
      solubility: { min: Infinity, max: -Infinity, avg: 0, counts: {}, },
      qed: { min: Infinity, max: -Infinity, avg: 0, counts: {}, buckets: Array(10).fill(0) },
      lipinskiViolations: { counts: [0, 0, 0, 0, 0] }, // 0, 1, 2, 3, 4 violations
      totalCompounds: 0,
      processedCompounds: 0
    };
    
    // Process each compound
    const validLeads = leadData.leads.filter(smiles => leadsProperties[smiles]);
    stats.totalCompounds = leadData.leads.length;
    stats.processedCompounds = validLeads.length;
    
    validLeads.forEach(smiles => {
      const props = leadsProperties[smiles].properties;
      
      // Molecular Weight
      const mw = props['Molecular Weight'];
      stats.molecularWeight.min = Math.min(stats.molecularWeight.min, mw);
      stats.molecularWeight.max = Math.max(stats.molecularWeight.max, mw);
      stats.molecularWeight.avg += mw;
      
      // Create histogram - round to nearest 50
      const mwBucket = Math.floor(mw / 50) * 50;
      stats.molecularWeight.counts[mwBucket] = (stats.molecularWeight.counts[mwBucket] || 0) + 1;
      if (mw <= 500) stats.molecularWeight.compliant++;
      
      // LogP
      const logP = props['LogP'];
      stats.logP.min = Math.min(stats.logP.min, logP);
      stats.logP.max = Math.max(stats.logP.max, logP);
      stats.logP.avg += logP;
      
      // Create histogram - round to nearest 0.5
      const logPBucket = Math.floor(logP / 0.5) * 0.5;
      stats.logP.counts[logPBucket] = (stats.logP.counts[logPBucket] || 0) + 1;
      if (logP <= 5) stats.logP.compliant++;
      
      // H-Bond Donors
      const hbd = props['H-Bond Donors'];
      stats.hBondDonors.min = Math.min(stats.hBondDonors.min, hbd);
      stats.hBondDonors.max = Math.max(stats.hBondDonors.max, hbd);
      stats.hBondDonors.avg += hbd;
      stats.hBondDonors.counts[hbd] = (stats.hBondDonors.counts[hbd] || 0) + 1;
      if (hbd <= 5) stats.hBondDonors.compliant++;
      
      // H-Bond Acceptors
      const hba = props['H-Bond Acceptors'];
      stats.hBondAcceptors.min = Math.min(stats.hBondAcceptors.min, hba);
      stats.hBondAcceptors.max = Math.max(stats.hBondAcceptors.max, hba);
      stats.hBondAcceptors.avg += hba;
      stats.hBondAcceptors.counts[hba] = (stats.hBondAcceptors.counts[hba] || 0) + 1;
      if (hba <= 10) stats.hBondAcceptors.compliant++;
      
      // Solubility
      const sol = props['LogS (Solubility)'];
      stats.solubility.min = Math.min(stats.solubility.min, sol);
      stats.solubility.max = Math.max(stats.solubility.max, sol);
      stats.solubility.avg += sol;
      
      // Create histogram - round to nearest 0.5
      const solBucket = Math.floor(sol / 0.5) * 0.5;
      stats.solubility.counts[solBucket] = (stats.solubility.counts[solBucket] || 0) + 1;
      
      // QED
      const qed = props['QED'];
      stats.qed.min = Math.min(stats.qed.min, qed);
      stats.qed.max = Math.max(stats.qed.max, qed);
      stats.qed.avg += qed;
      
      // QED buckets (0.0-0.1, 0.1-0.2, etc.)
      const qedBucketIndex = Math.min(Math.floor(qed * 10), 9);
      stats.qed.buckets[qedBucketIndex]++;
      
      // Lipinski violations
      let violations = 0;
      if (mw > 500) violations++;
      if (logP > 5) violations++;
      if (hbd > 5) violations++;
      if (hba > 10) violations++;
      
      stats.lipinskiViolations.counts[violations]++;
    });
    
    // Calculate averages
    if (validLeads.length > 0) {
      stats.molecularWeight.avg /= validLeads.length;
      stats.logP.avg /= validLeads.length;
      stats.hBondDonors.avg /= validLeads.length;
      stats.hBondAcceptors.avg /= validLeads.length;
      stats.solubility.avg /= validLeads.length;
      stats.qed.avg /= validLeads.length;
    }
    
    return stats;
  }, [leadData, leadsProperties]);

  // Render summary view
  const renderSummaryView = () => {
    if (!propertyStats) {
      return (
        <div className="flex justify-center items-center p-8">
          <svg className="animate-spin h-8 w-8 text-pharma-blue dark:text-pharma-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2 text-gray-600 dark:text-gray-300">Generating summary statistics...</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Overall stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Compounds</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{propertyStats.totalCompounds}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Lipinski Compliant</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {propertyStats.lipinskiViolations.counts[0]} 
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                ({Math.round((propertyStats.lipinskiViolations.counts[0] / propertyStats.processedCompounds) * 100)}%)
              </span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Average QED</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {propertyStats.qed.avg.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Solubility (LogS)</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {propertyStats.solubility.avg.toFixed(2)}
            </div>
          </div>
        </div>
        
        {/* Property distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lipinski Rule of Five Compliance */}
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Lipinski's Rule of Five Violations</h4>
            <div className="h-64 relative">
              <canvas ref={lipinskiChartRef}></canvas>
            </div>
          </div>
          
          {/* QED Distribution */}
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">QED Distribution</h4>
            <div className="h-64 relative">
              <canvas ref={qedChartRef}></canvas>
            </div>
          </div>
          
          {/* MW Distribution */}
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Molecular Weight Distribution
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                (Lipinski: ≤ 500 Da)
              </span>
            </h4>
            <div className="h-64 relative">
              <canvas ref={mwChartRef}></canvas>
            </div>
          </div>
          
          {/* LogP Distribution */}
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              LogP Distribution
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                (Lipinski: ≤ 5)
              </span>
            </h4>
            <div className="h-64 relative">
              <canvas ref={logPChartRef}></canvas>
            </div>
          </div>
          
          {/* Solubility Distribution */}
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Solubility Distribution (LogS)
            </h4>
            <div className="h-64 relative">
              <canvas ref={solubilityChartRef}></canvas>
            </div>
          </div>
          
          {/* Solubility vs LogP Scatter Plot */}
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Property Relationship: Solubility vs LogP
            </h4>
            <div className="h-64 relative">
              <canvas ref={scatterChartRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Initialize charts when propertyStats changes
  useEffect(() => {
    if (!propertyStats || activeView !== 'summary') {
      // Destroy existing charts when not in summary view
      Object.values(charts.current).forEach(chart => {
        if (chart) chart.destroy();
      });
      charts.current = {};
      return;
    }
    
    // Helper to get theme colors
    const isDarkMode = document.documentElement.classList.contains('dark');
    const getTextColor = () => isDarkMode ? 'rgba(229, 231, 235, 0.8)' : 'rgba(55, 65, 81, 0.8)';
    const getGridColor = () => isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.5)';
    
    // Destroy existing charts
    Object.values(charts.current).forEach(chart => {
      if (chart) chart.destroy();
    });
    charts.current = {};
    
    // Wait for DOM to update and canvas elements to be visible
    setTimeout(() => {
      // Initialize all charts
      initializeCharts(getTextColor(), getGridColor());
    }, 0);
    
    // Cleanup when component unmounts or view changes
    return () => {
      Object.values(charts.current).forEach(chart => {
        if (chart) chart.destroy();
      });
      charts.current = {};
    };
  }, [propertyStats, activeView]);
  
  // Function to initialize all charts
  const initializeCharts = (textColor, gridColor) => {
    if (!propertyStats) return;
    
    // Chart options that apply to most charts
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true
        }
      },
      scales: {
        x: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        }
      }
    };
    
    // Lipinski Violations Chart
    if (lipinskiChartRef.current) {
      // Clear any existing chart for this canvas
      if (charts.current.lipinski) {
        charts.current.lipinski.destroy();
      }
      
      const violations = [0, 1, 2, 3, 4];
      const data = propertyStats.lipinskiViolations.counts;
      const colors = [
        'rgba(34, 197, 94, 0.8)',  // Green for 0 violations
        'rgba(234, 179, 8, 0.8)',   // Yellow for 1 violation
        'rgba(249, 115, 22, 0.8)',  // Orange for 2 violations
        'rgba(239, 68, 68, 0.8)',   // Red for 3 violations
        'rgba(185, 28, 28, 0.8)'    // Dark red for 4 violations
      ];
      
      charts.current.lipinski = new Chart(lipinskiChartRef.current, {
        type: 'bar',
        data: {
          labels: violations.map(v => `${v} ${v === 1 ? 'Violation' : 'Violations'}`),
          datasets: [{
            label: 'Number of Compounds',
            data: data,
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('0.8', '1.0')),
            borderWidth: 1
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.raw;
                  const percentage = (value / propertyStats.processedCompounds * 100).toFixed(1);
                  return `Compounds: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
    
    // QED Distribution Chart
    if (qedChartRef.current) {
      // Clear any existing chart for this canvas
      if (charts.current.qed) {
        charts.current.qed.destroy();
      }
      
      const labels = Array.from({length: 10}, (_, i) => `${(i * 0.1).toFixed(1)}-${((i + 1) * 0.1).toFixed(1)}`);
      
      charts.current.qed = new Chart(qedChartRef.current, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'QED Score',
            data: propertyStats.qed.buckets,
            backgroundColor: 'rgba(6, 182, 212, 0.8)',
            borderColor: 'rgba(6, 182, 212, 1.0)',
            borderWidth: 1
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.raw;
                  const percentage = (value / propertyStats.processedCompounds * 100).toFixed(1);
                  return `Compounds: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
    
    // Molecular Weight Distribution Chart
    if (mwChartRef.current) {
      // Clear any existing chart for this canvas
      if (charts.current.mw) {
        charts.current.mw.destroy();
      }
      
      const mwBuckets = Object.keys(propertyStats.molecularWeight.counts)
        .map(bucket => Number(bucket))
        .sort((a, b) => a - b);
      
      const mwCounts = mwBuckets.map(bucket => propertyStats.molecularWeight.counts[bucket]);
      
      // Color based on Lipinski compliance
      const backgroundColor = mwBuckets.map(bucket => 
        bucket <= 500 ? 'rgba(6, 182, 212, 0.8)' : 'rgba(239, 68, 68, 0.8)'
      );
      
      const borderColor = mwBuckets.map(bucket => 
        bucket <= 500 ? 'rgba(6, 182, 212, 1.0)' : 'rgba(239, 68, 68, 1.0)'
      );
      
      charts.current.mw = new Chart(mwChartRef.current, {
        type: 'bar',
        data: {
          labels: mwBuckets.map(bucket => `${bucket}`),
          datasets: [{
            label: 'Molecular Weight',
            data: mwCounts,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            tooltip: {
              callbacks: {
                title: function(context) {
                  const value = Number(context[0].label);
                  return `${value} - ${value + 50} Da`;
                },
                label: function(context) {
                  const value = context.raw;
                  const percentage = (value / propertyStats.processedCompounds * 100).toFixed(1);
                  return `Compounds: ${value} (${percentage}%)`;
                },
                footer: function(context) {
                  const value = Number(context[0].label);
                  return value <= 500 ? 'Lipinski Compliant' : 'Exceeds Lipinski Limit';
                }
              }
            }
          }
        }
      });
    }
    
    // LogP Distribution Chart
    if (logPChartRef.current) {
      // Clear any existing chart for this canvas
      if (charts.current.logP) {
        charts.current.logP.destroy();
      }
      
      const logPBuckets = Object.keys(propertyStats.logP.counts)
        .map(bucket => Number(bucket))
        .sort((a, b) => a - b);
      
      const logPCounts = logPBuckets.map(bucket => propertyStats.logP.counts[bucket]);
      
      // Color based on Lipinski compliance
      const backgroundColor = logPBuckets.map(bucket => 
        bucket <= 5 ? 'rgba(6, 182, 212, 0.8)' : 'rgba(239, 68, 68, 0.8)'
      );
      
      const borderColor = logPBuckets.map(bucket => 
        bucket <= 5 ? 'rgba(6, 182, 212, 1.0)' : 'rgba(239, 68, 68, 1.0)'
      );
      
      charts.current.logP = new Chart(logPChartRef.current, {
        type: 'bar',
        data: {
          labels: logPBuckets.map(bucket => bucket.toFixed(1)),
          datasets: [{
            label: 'LogP',
            data: logPCounts,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            tooltip: {
              callbacks: {
                title: function(context) {
                  const value = Number(context[0].label);
                  return `LogP: ${value.toFixed(1)}`;
                },
                label: function(context) {
                  const value = context.raw;
                  const percentage = (value / propertyStats.processedCompounds * 100).toFixed(1);
                  return `Compounds: ${value} (${percentage}%)`;
                },
                footer: function(context) {
                  const value = Number(context[0].label);
                  return value <= 5 ? 'Lipinski Compliant' : 'Exceeds Lipinski Limit';
                }
              }
            }
          }
        }
      });
    }
    
    // Solubility Distribution Chart
    if (solubilityChartRef.current) {
      // Clear any existing chart for this canvas
      if (charts.current.solubility) {
        charts.current.solubility.destroy();
      }
      
      const solBuckets = Object.keys(propertyStats.solubility.counts)
        .map(bucket => Number(bucket))
        .sort((a, b) => a - b);
      
      const solCounts = solBuckets.map(bucket => propertyStats.solubility.counts[bucket]);
      
      // Color based on solubility level
      const getColorForSolubility = (value) => {
        if (value >= -1) return ['rgba(34, 197, 94, 0.8)', 'rgba(34, 197, 94, 1.0)']; // Highly soluble
        if (value >= -2) return ['rgba(74, 222, 128, 0.8)', 'rgba(74, 222, 128, 1.0)']; // Soluble
        if (value >= -4) return ['rgba(234, 179, 8, 0.8)', 'rgba(234, 179, 8, 1.0)']; // Moderately soluble
        if (value >= -6) return ['rgba(249, 115, 22, 0.8)', 'rgba(249, 115, 22, 1.0)']; // Poorly soluble
        return ['rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 1.0)']; // Very poorly soluble
      };
      
      const backgroundColor = solBuckets.map(bucket => getColorForSolubility(bucket)[0]);
      const borderColor = solBuckets.map(bucket => getColorForSolubility(bucket)[1]);
      
      charts.current.solubility = new Chart(solubilityChartRef.current, {
        type: 'bar',
        data: {
          labels: solBuckets.map(bucket => bucket.toFixed(1)),
          datasets: [{
            label: 'Solubility (LogS)',
            data: solCounts,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            tooltip: {
              callbacks: {
                title: function(context) {
                  const value = Number(context[0].label);
                  return `LogS: ${value.toFixed(1)}`;
                },
                label: function(context) {
                  const value = context.raw;
                  const percentage = (value / propertyStats.processedCompounds * 100).toFixed(1);
                  return `Compounds: ${value} (${percentage}%)`;
                },
                footer: function(context) {
                  const value = Number(context[0].label);
                  if (value >= -1) return 'Highly Soluble';
                  if (value >= -2) return 'Soluble';
                  if (value >= -4) return 'Moderately Soluble';
                  if (value >= -6) return 'Poorly Soluble';
                  return 'Very Poorly Soluble';
                }
              }
            }
          }
        }
      });
    }
    
    // LogP vs Solubility Scatter Plot
    if (scatterChartRef.current) {
      // Clear any existing chart for this canvas
      if (charts.current.scatter) {
        charts.current.scatter.destroy();
      }
      
      // Get all valid leads with their properties
      const validLeads = Object.entries(leadsProperties)
        .filter(([_, props]) => props && props.properties)
        .map(([smiles, props]) => ({
          smiles,
          logP: props.properties['LogP'],
          solubility: props.properties['LogS (Solubility)'],
          qed: props.properties['QED'],
          mw: props.properties['Molecular Weight']
        }));
        
      // Create dataset with point size based on QED and color based on MW
      charts.current.scatter = new Chart(scatterChartRef.current, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Compounds',
            data: validLeads.map(lead => ({
              x: lead.logP,
              y: lead.solubility,
              r: lead.qed * 7 + 2, // Size by QED
              smiles: lead.smiles,
              mw: lead.mw
            })),
            backgroundColor: validLeads.map(lead => {
              // Color by MW (red for high, blue for low)
              const normalizedMW = Math.min(Math.max((lead.mw - 200) / 500, 0), 1);
              return `rgba(${Math.round(6 + normalizedMW * 233)}, ${Math.round(182 - normalizedMW * 182)}, ${Math.round(212 - normalizedMW * 168)}, 0.7)`;
            }),
            pointRadius: validLeads.map(lead => lead.qed * 7 + 2), // Size by QED
            pointHoverRadius: validLeads.map(lead => lead.qed * 7 + 5),
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)'
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            x: {
              title: {
                display: true,
                text: 'LogP',
                color: textColor
              },
              grid: {
                color: gridColor
              },
              ticks: {
                color: textColor
              }
            },
            y: {
              title: {
                display: true,
                text: 'Solubility (LogS)',
                color: textColor
              },
              grid: {
                color: gridColor
              },
              ticks: {
                color: textColor
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const point = context.raw;
                  return [
                    `SMILES: ${point.smiles.substring(0, 20)}...`,
                    `LogP: ${point.x.toFixed(2)}`,
                    `Solubility: ${point.y.toFixed(2)}`,
                    `MW: ${point.mw.toFixed(1)} Da`,
                    `QED: ${(point.r - 2) / 7}` // Convert back from size to QED
                  ];
                }
              }
            },
            legend: {
              display: false
            }
          }
        }
      });
    }
  };

  // Function to calculate similarity matrix
  const calculateSimilarity = async () => {
    if (!leadData?.leads || leadData.leads.length === 0) return;
    
    setLoadingSimilarity(true);
    setSimilarityError(null);
    
    try {
      // Use the filtered leads if available, otherwise use all leads
      // Limit to a reasonable number if too many leads
      const smilesForAnalysis = filteredAndSortedLeads.length > 0 
        ? filteredAndSortedLeads.slice(0, 100) 
        : leadData.leads.slice(0, 100);
      
      const response = await fetch(endpoints.calculateSimilarityUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ smiles_list: smilesForAnalysis }),
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate similarity matrix. Status: ${response.status}`);
      }

      const responseData = await response.json();
      setSimilarityMatrix(responseData.similarity_matrix);
      setValidSmiles(responseData.valid_smiles);
      
      // Reset selected cluster when calculating new similarity
      setSelectedCluster(null);
    } catch (error) {
      console.error('Error calculating similarity matrix:', error);
      setSimilarityError(error.message || 'Failed to calculate similarity matrix');
    } finally {
      setLoadingSimilarity(false);
    }
  };
  
  // Calculate clusters from similarity matrix
  const getClusteredData = useMemo(() => {
    if (!similarityMatrix || !validSmiles || validSmiles.length === 0) return null;
    
    // Simple hierarchical clustering based on similarity cutoff
    const clusters = [];
    const assigned = new Set();
    
    // Create a distance matrix (1 - similarity)
    const distMatrix = similarityMatrix.map(row => 
      row.map(val => 1 - val)
    );
    
    // Find clusters using a greedy approach
    for (let i = 0; i < validSmiles.length; i++) {
      if (assigned.has(i)) continue;
      
      const cluster = [i];
      assigned.add(i);
      
      for (let j = 0; j < validSmiles.length; j++) {
        if (i === j || assigned.has(j)) continue;
        
        // Check similarity against all current cluster members
        let allSimilar = true;
        for (const clusterItemIdx of cluster) {
          if (similarityMatrix[clusterItemIdx][j] < similarityCutoff) {
            allSimilar = false;
            break;
          }
        }
        
        if (allSimilar) {
          cluster.push(j);
          assigned.add(j);
        }
      }
      
      clusters.push({
        id: clusters.length,
        indices: cluster,
        members: cluster.map(idx => ({
          index: idx,
          smiles: validSmiles[idx],
          properties: leadsProperties[validSmiles[idx]]?.properties
        }))
      });
    }
    
    // Sort clusters by size (descending)
    clusters.sort((a, b) => b.members.length - a.members.length);
    
    // Limit to requested cluster count
    const topClusters = clusters.slice(0, clusterCount);
    
    // Get molecules not in top clusters
    const remainingIndices = [...Array(validSmiles.length).keys()]
      .filter(i => !topClusters.some(c => c.indices.includes(i)));
    
    if (remainingIndices.length > 0) {
      topClusters.push({
        id: topClusters.length,
        indices: remainingIndices,
        members: remainingIndices.map(idx => ({
          index: idx,
          smiles: validSmiles[idx],
          properties: leadsProperties[validSmiles[idx]]?.properties
        })),
        isOther: true
      });
    }
    
    return {
      clusters: topClusters,
      matrix: similarityMatrix,
      smiles: validSmiles
    };
  }, [similarityMatrix, validSmiles, leadsProperties, clusterCount, similarityCutoff]);

  // Render the similarity view
  const renderSimilarityView = () => {
    if (loadingSimilarity) {
      return (
        <div className="flex justify-center items-center p-8">
          <svg className="animate-spin h-8 w-8 text-pharma-blue dark:text-pharma-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2 text-gray-600 dark:text-gray-300">Calculating similarity between molecules...</span>
        </div>
      );
    }
    
    if (similarityError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 text-red-700 dark:text-red-400">
          <h3 className="text-lg font-medium mb-2">Error calculating similarity</h3>
          <p>{similarityError}</p>
          <button 
            onClick={calculateSimilarity}
            className="mt-3 px-4 py-2 bg-pharma-blue dark:bg-pharma-teal text-white rounded hover:bg-pharma-blue-dark dark:hover:bg-pharma-teal-dark"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (!similarityMatrix) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Calculate similarity between molecules to see structural relationships.
          </p>
          <button 
            onClick={calculateSimilarity}
            className="px-4 py-2 bg-pharma-blue dark:bg-pharma-teal text-white rounded hover:bg-pharma-blue-dark dark:hover:bg-pharma-teal-dark"
          >
            Calculate Similarity
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Similarity Analysis
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Analyzing similarity across {validSmiles.length} molecules
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-48">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Similarity Cutoff
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={similarityCutoff}
                    onChange={(e) => setSimilarityCutoff(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium w-10 text-gray-700 dark:text-gray-300">
                    {similarityCutoff.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cluster Count
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={clusterCount}
                    onChange={(e) => setClusterCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium w-6 text-gray-700 dark:text-gray-300">
                    {clusterCount}
                  </span>
                </div>
              </div>
              <button
                onClick={calculateSimilarity}
                className="px-4 py-2 bg-pharma-blue dark:bg-pharma-teal text-white text-sm rounded hover:bg-pharma-blue-dark dark:hover:bg-pharma-teal-dark"
              >
                Recalculate
              </button>
            </div>
          </div>
        </div>
        
        {/* Clustered Molecules View */}
        {getClusteredData && (
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Molecule Clusters
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getClusteredData.clusters.length} clusters identified based on structural similarity
              </p>
            </div>
            {/* Cluster tabs */}
            <div className="border-b border-gray-200 dark:border-gray-600">
              <div className="flex overflow-x-auto px-4 py-2 space-x-2">
                <button
                  onClick={() => setSelectedCluster(null)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                    selectedCluster === null 
                      ? 'bg-pharma-blue dark:bg-pharma-teal text-white'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                  }`}
                >
                  All Clusters
                </button>
                {getClusteredData.clusters.map(cluster => (
                  <button
                    key={cluster.id}
                    onClick={() => setSelectedCluster(cluster)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                      selectedCluster === cluster 
                        ? 'bg-pharma-blue dark:bg-pharma-teal text-white'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    Cluster {cluster.id + 1} ({cluster.members.length})
                  </button>
                ))}
              </div>
            </div>
            
            {/* Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              {/* Network Graph */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-h-64">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Similarity Network
                </h4>
                <div className="h-[400px] relative bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <div id="similarity-network" ref={similarityNetworkRef} className="absolute inset-0"></div>
                </div>
              </div>
              
              {/* Heatmap */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-h-64">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Similarity Matrix
                </h4>
                <div className="h-[400px] relative bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <div id="similarity-matrix" ref={similarityMatrixRef} className="absolute inset-0"></div>
                </div>
              </div>
            </div>
            
            {/* Molecule Grid (selected cluster) */}
            <div className="p-4">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                {selectedCluster 
                  ? `Molecules in Cluster ${selectedCluster.id + 1}` 
                  : 'All Molecules by Cluster'}
              </h4>
              
              {selectedCluster ? (
                // Display molecules in selected cluster
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4 max-h-[500px] overflow-y-auto p-1">
                  {selectedCluster.members.map((member, idx) => (
                    <div 
                      key={idx}
                      className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleMoleculeSelect(member.smiles)}
                    >
                      {/* Molecule Image */}
                      <div className="flex justify-center bg-gray-50 dark:bg-gray-800 rounded-md p-2 mb-3 h-32 items-center">
                        {member.properties ? (
                          <img 
                            src={member.properties['Molecule Image (base64)']} 
                            alt="Molecular Structure" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="text-sm text-gray-400 dark:text-gray-500 text-center">
                            Image not available
                          </div>
                        )}
                      </div>
                      
                      {/* SMILES string */}
                      <div className="text-xs font-mono text-gray-600 dark:text-gray-300 mb-3 truncate" title={member.smiles}>
                        {formatSmiles(member.smiles)}
                      </div>
                      
                      {/* Properties display */}
                      {member.properties && (
                        <div className="space-y-1">
                          <div className="grid grid-cols-2 gap-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">MW</div>
                            <div className="text-xs text-gray-800 dark:text-gray-200">
                              {formatPropertyValue('Molecular Weight', member.properties['Molecular Weight'])}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">LogP</div>
                            <div className="text-xs text-gray-800 dark:text-gray-200">
                              {formatPropertyValue('LogP', member.properties['LogP'])}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">QED</div>
                            <div className="text-xs text-gray-800 dark:text-gray-200">
                              {formatPropertyValue('QED', member.properties['QED'])}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Display cluster overview
                <div className="space-y-6 mt-4 max-h-[500px] overflow-y-auto p-1">
                  {getClusteredData.clusters.map(cluster => (
                    <div key={cluster.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-md font-medium text-gray-700 dark:text-gray-300">
                          Cluster {cluster.id + 1} 
                          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                            ({cluster.members.length} molecules)
                          </span>
                        </h5>
                        <button
                          onClick={() => setSelectedCluster(cluster)}
                          className="text-xs text-pharma-blue dark:text-pharma-teal hover:underline"
                        >
                          View Details
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mt-2">
                        {cluster.members.slice(0, 6).map((member, idx) => (
                          <div 
                            key={idx}
                            className="bg-white dark:bg-gray-700 rounded p-2 hover:shadow cursor-pointer"
                            onClick={() => handleMoleculeSelect(member.smiles)}
                          >
                            {member.properties ? (
                              <img 
                                src={member.properties['Molecule Image (base64)']} 
                                alt="Molecular Structure" 
                                className="w-full h-20 object-contain mb-1"
                              />
                            ) : (
                              <div className="w-full h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-xs text-gray-400">
                                No image
                              </div>
                            )}
                            <div className="text-xs text-center truncate">
                              {formatPropertyValue('QED', member.properties?.['QED'] || 'N/A')}
                            </div>
                          </div>
                        ))}
                        {cluster.members.length > 6 && (
                          <div 
                            className="bg-gray-100 dark:bg-gray-600 rounded p-2 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500"
                            onClick={() => setSelectedCluster(cluster)}
                          >
                            <div className="text-sm text-gray-500 dark:text-gray-300 text-center">
                              +{cluster.members.length - 6} more
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Initialize D3 visualizations when similarity data changes
  useEffect(() => {
    if (!similarityMatrix || !validSmiles || activeView !== 'similarity') {
      return;
    }

    // Clear previous visualizations
    d3.select(similarityMatrixRef.current).selectAll("*").remove();
    d3.select(similarityNetworkRef.current).selectAll("*").remove();
    
    // Create the visualizations with a slight delay to ensure DOM is ready
    setTimeout(() => {
      createSimilarityMatrixVisualization();
      createSimilarityNetworkVisualization();
    }, 100);

    // Cleanup function
    return () => {
      d3.select(similarityMatrixRef.current).selectAll("*").remove();
      d3.select(similarityNetworkRef.current).selectAll("*").remove();
    };
  }, [similarityMatrix, validSmiles, activeView, selectedCluster]);

  // Function to create similarity matrix heatmap using D3
  const createSimilarityMatrixVisualization = () => {
    if (!similarityMatrix || !validSmiles || !similarityMatrixRef.current) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const backgroundColor = isDarkMode ? '#1f2937' : '#ffffff';
    
    const width = similarityMatrixRef.current.clientWidth;
    const height = similarityMatrixRef.current.clientHeight;
    const padding = { top: 50, right: 20, bottom: 80, left: 50 };

    // Get clustered data for visualization
    const data = getClusteredData;
    if (!data) return;
    
    // Clear previous visualization
    d3.select(similarityMatrixRef.current).selectAll("*").remove();
    
    // Create controls panel for the matrix (moved to top right)
    const controlsDiv = d3.select(similarityMatrixRef.current)
      .append("div")
      .attr("class", "matrix-controls")
      .style("position", "absolute")
      .style("top", "10px")
      .style("right", "10px")
      .style("z-index", "10")
      .style("background-color", isDarkMode ? "rgba(31, 41, 55, 0.8)" : "rgba(255, 255, 255, 0.8)")
      .style("padding", "10px")
      .style("border-radius", "4px")
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
      .style("display", "flex")
      .style("gap", "10px")
      .style("align-items", "center");
    
    // Add matrix size control
    controlsDiv.append("span")
      .style("color", textColor)
      .style("font-size", "12px")
      .text("Display size:");
    
    // Create dropdown for matrix size
    const matrixSizeValues = [10, 20, 50, 100, "All"];
    const matrixSizeSelect = controlsDiv.append("select")
      .style("background-color", isDarkMode ? "#374151" : "#f9fafb")
      .style("color", textColor)
      .style("border", "1px solid " + (isDarkMode ? "#6b7280" : "#d1d5db"))
      .style("border-radius", "4px")
      .style("padding", "3px 6px")
      .style("font-size", "12px");
      
    matrixSizeSelect.selectAll("option")
      .data(matrixSizeValues)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => typeof d === "number" ? `${d} molecules` : d);
      
    // Set initial size based on number of molecules
    const initialSize = validSmiles.length <= 20 ? "All" : 
                     validSmiles.length <= 50 ? 50 : 
                     validSmiles.length <= 100 ? 100 : 50;
    
    matrixSizeSelect.property("value", initialSize);
    
    // Create SVG with zoom capabilities
    const svg = d3.select(similarityMatrixRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");
    
    // Add zoom behavior for the matrix
    const g = svg.append("g");
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 10]) // Allow zoom from 0.5x to 10x
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
      
    svg.call(zoom);
    
    // Add zoom controls - keep on left side
    const zoomControls = svg.append("g")
      .attr("transform", `translate(20, 20)`)
      .attr("class", "zoom-controls")
      .style("pointer-events", "all");
    
    // Zoom in button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", isDarkMode ? "#374151" : "#f3f4f6")
      .attr("stroke", isDarkMode ? "#6b7280" : "#d1d5db")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.5);
      });
    
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .text("+");
    
    // Zoom out button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 35)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", isDarkMode ? "#374151" : "#f3f4f6")
      .attr("stroke", isDarkMode ? "#6b7280" : "#d1d5db")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.75);
      });
    
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .text("−");
    
    // Reset zoom button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 70)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", isDarkMode ? "#374151" : "#f3f4f6")
      .attr("stroke", isDarkMode ? "#6b7280" : "#d1d5db")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });
    
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 85)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text("Reset");
    
    // Function to render matrix with specified limit
    const renderMatrix = (sizeLimit) => {
      // Clear previous grid
      g.selectAll("*").remove();
      
      // Create color scale
      const colorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateViridis);
      
      // Determine which molecules to show based on selected cluster and size limit
      let indices = [];
      let molecules = [];
      
      if (selectedCluster) {
        indices = selectedCluster.indices;
        molecules = selectedCluster.members.map(m => m.smiles);
      } else {
        indices = [...Array(validSmiles.length).keys()];
        molecules = validSmiles;
      }
      
      // Limit to specified size if not "All"
      if (sizeLimit !== "All" && indices.length > sizeLimit) {
        indices = indices.slice(0, sizeLimit);
        molecules = molecules.slice(0, sizeLimit);
      }
      
      // Create scales
      const xScale = d3.scaleBand()
        .domain(indices.map(i => i))
        .range([padding.left, width - padding.right])
        .padding(0.05);
        
      const yScale = d3.scaleBand()
        .domain(indices.map(i => i))
        .range([padding.top, height - padding.bottom])
        .padding(0.05);
      
      // Create cells
      const cells = g.selectAll('rect')
        .data(indices.flatMap(i => indices.map(j => ({
          row: i,
          col: j,
          value: similarityMatrix[i][j]
        }))))
        .join('rect')
          .attr('x', d => xScale(d.col))
          .attr('y', d => yScale(d.row))
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('fill', d => colorScale(d.value))
          .attr('stroke', 'none')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke', '#ff0000').attr('stroke-width', 2);
            
            // Show tooltip
            const tooltip = d3.select(similarityMatrixRef.current)
              .append('div')
              .attr('class', 'tooltip')
              .style('position', 'absolute')
              .style('background-color', isDarkMode ? '#374151' : '#f3f4f6')
              .style('color', textColor)
              .style('padding', '5px')
              .style('border-radius', '4px')
              .style('font-size', '12px')
              .style('pointer-events', 'none')
              .style('z-index', 100)
              .style('left', `${event.pageX - similarityMatrixRef.current.getBoundingClientRect().left + 10}px`)
              .style('top', `${event.pageY - similarityMatrixRef.current.getBoundingClientRect().top - 28}px`);
              
            tooltip.html(`
              <div>Similarity: ${d.value.toFixed(2)}</div>
              <div>Molecule 1: ${validSmiles[d.row].substring(0, 20)}...</div>
              <div>Molecule 2: ${validSmiles[d.col].substring(0, 20)}...</div>
            `);
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke', 'none');
            d3.select(similarityMatrixRef.current).selectAll('.tooltip').remove();
          })
          .on('click', function(event, d) {
            // Only show comparison for different molecules
            if (d.row !== d.col) {
              showMoleculeComparison(validSmiles[d.row], validSmiles[d.col], d.value);
            }
          });
          
      // Add axes labels if not too many molecules
      if (indices.length <= 50) {
        // X axis
        g.append('g')
          .attr('transform', `translate(0,${padding.top - 5})`)
          .call(d3.axisTop(xScale)
            .tickFormat(i => {
              // For fewer molecules, show more detailed labels
              if (indices.length <= 20) {
                return i + 1;
              } else {
                // For more molecules, show fewer labels
                return (i % 5 === 0) ? i + 1 : '';
              }
            })
          )
          .selectAll('text')
            .attr('fill', textColor)
            .attr('transform', indices.length <= 20 ? 'rotate(-45)' : 'rotate(0)')
            .style('text-anchor', indices.length <= 20 ? 'start' : 'middle')
            .style('font-size', indices.length <= 20 ? '10px' : '8px');
    
        // Y axis
        g.append('g')
          .attr('transform', `translate(${padding.left - 5},0)`)
          .call(d3.axisLeft(yScale)
            .tickFormat(i => {
              if (indices.length <= 20) {
                return i + 1;
              } else {
                return (i % 5 === 0) ? i + 1 : '';
              }
            })
          )
          .selectAll('text')
            .attr('fill', textColor)
            .style('font-size', indices.length <= 20 ? '10px' : '8px');
      }
      
      // Add color legend - moved to bottom right corner
      const legendWidth = 200;
      const legendHeight = 20;
      
      const legendX = width - legendWidth - 20;
      const legendY = height - 40;
      
      const defs = svg.append('defs');
      
      const linearGradient = defs.append('linearGradient')
        .attr('id', 'similarity-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
        
      linearGradient.selectAll('stop')
        .data([
          {offset: "0%", color: colorScale(0)},
          {offset: "25%", color: colorScale(0.25)},
          {offset: "50%", color: colorScale(0.5)},
          {offset: "75%", color: colorScale(0.75)},
          {offset: "100%", color: colorScale(1)}
        ])
        .join('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
      
      // Create a background for the legend to improve readability
      svg.append('rect')
        .attr('x', legendX - 10)
        .attr('y', legendY - 15)
        .attr('width', legendWidth + 20)
        .attr('height', 55)
        .attr('fill', isDarkMode ? 'rgba(31, 41, 55, 0.7)' : 'rgba(255, 255, 255, 0.7)')
        .attr('rx', 4);
      
      svg.append('rect')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#similarity-gradient)');
      
      svg.append('text')
        .attr('x', legendX)
        .attr('y', legendY - 5)
        .attr('fill', textColor)
        .style('font-size', '12px')
        .text('Similarity:');
      
      // Add legend ticks
      const legendScale = d3.scaleLinear()
        .domain([0, 1])
        .range([legendX, legendX + legendWidth]);
      
      const legendAxis = d3.axisBottom(legendScale)
        .tickValues([0, 0.25, 0.5, 0.75, 1])
        .tickFormat(d3.format('.2f'));
      
      svg.append('g')
        .attr('transform', `translate(0,${legendY + legendHeight})`)
        .call(legendAxis)
        .selectAll('text')
          .attr('fill', textColor);
    };
    
    // Initial render
    renderMatrix(matrixSizeSelect.property("value"));
    
    // Update matrix when the size selector changes
    matrixSizeSelect.on("change", function() {
      renderMatrix(this.value);
      svg.call(zoom.transform, d3.zoomIdentity); // Reset zoom
    });
  };

  // Function to show a side-by-side comparison of two molecules
  const showMoleculeComparison = async (smiles1, smiles2, similarityScore) => {
    // Fetch properties for both molecules if not already cached
    const fetchProps = async (smiles) => {
      if (leadsProperties[smiles]) {
        return leadsProperties[smiles];
      }
      
      setLoadingProperties(true);
      try {
        const responseData = await fetchMoleculePropertiesData(smiles);
        
        // Update the cache
        setLeadsProperties(prev => ({
          ...prev,
          [smiles]: responseData
        }));
        
        return responseData;
      } catch (error) {
        console.error('Error fetching molecule properties:', error);
        return null;
      } finally {
        setLoadingProperties(false);
      }
    };
    
    // Fetch properties for both molecules in parallel
    const [molecule1Props, molecule2Props] = await Promise.all([
      fetchProps(smiles1),
      fetchProps(smiles2)
    ]);
    
    // Create and show the comparison modal
    const comparisonModal = document.createElement('div');
    comparisonModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    comparisonModal.style.zIndex = 1000;
    
    // Format property display for a single molecule
    const formatPropertySection = (props, title) => {
      if (!props) return `<div class="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">Error loading properties</div>`;
      
      return `
        <div class="p-4">
          <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-3">${title}</h4>
          <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow mb-4">
            <div class="flex justify-center bg-gray-50 dark:bg-gray-800 p-2 rounded mb-3 h-32 items-center">
              <img src="${props.properties['Molecule Image (base64)']}" alt="Molecular Structure" class="max-h-full">
            </div>
            <div class="text-xs font-mono text-gray-600 dark:text-gray-300 mb-3 truncate">${props.smiles}</div>
          </div>
          
          <div class="space-y-2 bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
            <div class="grid grid-cols-2 gap-2">
              <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Molecular Formula</div>
              <div class="text-sm text-gray-900 dark:text-gray-200">${props.properties['Molecular Formula']}</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Molecular Weight</div>
              <div class="text-sm text-gray-900 dark:text-gray-200">${props.properties['Molecular Weight'].toFixed(2)} Da</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-sm font-medium text-gray-500 dark:text-gray-400">LogP</div>
              <div class="text-sm text-gray-900 dark:text-gray-200">${props.properties['LogP'].toFixed(2)}</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Solubility (LogS)</div>
              <div class="text-sm text-gray-900 dark:text-gray-200">${props.properties['LogS (Solubility)'].toFixed(2)}</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-sm font-medium text-gray-500 dark:text-gray-400">QED</div>
              <div class="text-sm text-gray-900 dark:text-gray-200">${props.properties['QED'].toFixed(2)}</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-sm font-medium text-gray-500 dark:text-gray-400">H-Bond Donors</div>
              <div class="text-sm text-gray-900 dark:text-gray-200">${props.properties['H-Bond Donors']}</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="text-sm font-medium text-gray-500 dark:text-gray-400">H-Bond Acceptors</div>
              <div class="text-sm text-gray-900 dark:text-gray-200">${props.properties['H-Bond Acceptors']}</div>
            </div>
          </div>
        </div>
      `;
    };
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    comparisonModal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Molecule Comparison (Similarity: ${similarityScore.toFixed(2)})
          </h3>
          <button id="close-comparison" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        ${loadingProperties ? `
          <div class="flex justify-center items-center p-8">
            <svg class="animate-spin h-8 w-8 text-pharma-blue dark:text-pharma-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="ml-2 text-gray-600 dark:text-gray-300">Loading molecule properties...</span>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${formatPropertySection(molecule1Props, "Molecule 1")}
            ${formatPropertySection(molecule2Props, "Molecule 2")}
          </div>
        `}
        
        <div class="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
          <button id="view-molecule-1" class="mr-2 px-4 py-2 bg-pharma-blue dark:bg-pharma-teal text-white rounded hover:bg-pharma-blue-dark dark:hover:bg-pharma-teal-dark">
            View Molecule 1
          </button>
          <button id="view-molecule-2" class="mr-2 px-4 py-2 bg-pharma-blue dark:bg-pharma-teal text-white rounded hover:bg-pharma-blue-dark dark:hover:bg-pharma-teal-dark">
            View Molecule 2
          </button>
          <button id="close-comparison-btn" class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(comparisonModal);
    
    // Add event listeners
    document.getElementById('close-comparison').addEventListener('click', () => {
      document.body.removeChild(comparisonModal);
    });
    
    document.getElementById('close-comparison-btn').addEventListener('click', () => {
      document.body.removeChild(comparisonModal);
    });
    
    document.getElementById('view-molecule-1').addEventListener('click', () => {
      document.body.removeChild(comparisonModal);
      handleMoleculeSelect(smiles1);
    });
    
    document.getElementById('view-molecule-2').addEventListener('click', () => {
      document.body.removeChild(comparisonModal);
      handleMoleculeSelect(smiles2);
    });
  };

  // Function to create similarity network visualization using D3 force-directed layout
  const createSimilarityNetworkVisualization = () => {
    if (!similarityMatrix || !validSmiles || !similarityNetworkRef.current) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const backgroundColor = isDarkMode ? '#1f2937' : '#ffffff';
    
    const width = similarityNetworkRef.current.clientWidth;
    const height = similarityNetworkRef.current.clientHeight;

    // Get clustered data
    const data = getClusteredData;
    if (!data) return;
    
    // Clear previous visualization
    d3.select(similarityNetworkRef.current).selectAll("*").remove();

    // Create SVG with zoom capabilities
    const svg = d3.select(similarityNetworkRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");
  
    // Add zoom behavior
    const g = svg.append("g");
    
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4]) // Allow zoom from 0.1x to 4x
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
      
    svg.call(zoom);
    
    // Add zoom controls
    const zoomControls = svg.append("g")
      .attr("transform", `translate(${width - 80}, 20)`)
      .attr("class", "zoom-controls");
      
    // Zoom in button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", isDarkMode ? "#374151" : "#f3f4f6")
      .attr("stroke", isDarkMode ? "#6b7280" : "#d1d5db")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.5);
      });
      
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .text("+");
      
    // Zoom out button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 35)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", isDarkMode ? "#374151" : "#f3f4f6")
      .attr("stroke", isDarkMode ? "#6b7280" : "#d1d5db")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.75);
      });
      
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .text("−");
      
    // Reset zoom button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 70)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", isDarkMode ? "#374151" : "#f3f4f6")
      .attr("stroke", isDarkMode ? "#6b7280" : "#d1d5db")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });
      
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 91)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text("Reset");
      
    // Determine which molecules to show based on selected cluster
    const clusterData = selectedCluster ? 
      {
        nodes: selectedCluster.members.map((m, i) => ({
          id: m.index,
          smiles: m.smiles,
          properties: m.properties,
          cluster: selectedCluster.id
        })),
        links: []
      } : 
      {
        nodes: validSmiles.map((smiles, i) => {
          // Find the cluster this molecule belongs to
          const cluster = data.clusters.find(c => c.indices.includes(i));
          return {
            id: i,
            smiles: smiles,
            properties: leadsProperties[smiles]?.properties,
            cluster: cluster ? cluster.id : -1
          };
        }),
        links: []
      };
    
    // Only include the first 100 nodes if too many
    if (clusterData.nodes.length > 100) {
      clusterData.nodes = clusterData.nodes.slice(0, 100);
    }
    
    // Generate links based on similarity threshold
    for (let i = 0; i < clusterData.nodes.length; i++) {
      for (let j = i + 1; j < clusterData.nodes.length; j++) {
        const node1 = clusterData.nodes[i];
        const node2 = clusterData.nodes[j];
        const similarity = similarityMatrix[node1.id][node2.id];
        
        // Only create links for molecules with similarity above threshold
        if (similarity >= similarityCutoff) {
          clusterData.links.push({
            source: i,
            target: j,
            value: similarity
          });
        }
      }
    }
    
    // Color scale for clusters
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Automatically calculate a good initial zoom level based on node count
    const optimalZoomLevel = Math.max(0.5, Math.min(1, 15 / Math.sqrt(clusterData.nodes.length)));
    
    // Create the force simulation with more spread out nodes
    const simulation = d3.forceSimulation(clusterData.nodes)
      .force("link", d3.forceLink(clusterData.links)
        .id(d => d.id)
        .distance(d => 200 * (1 - d.value)) // More similar = closer, but with more distance overall
      )
      .force("charge", d3.forceManyBody().strength(-200)) // Stronger repulsion
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25)); // Larger collision radius
      
    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(clusterData.links)
      .join("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", d => d.value)
        .attr("stroke-width", d => Math.max(1, d.value * 3));
        
    // Create nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(clusterData.nodes)
      .join("circle")
        .attr("r", d => d.properties?.QED ? 7 + (d.properties.QED * 5) : 10)
        .attr("fill", d => colorScale(d.cluster))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .call(drag(simulation))
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('stroke', '#ff0000')
            .attr('stroke-width', 2);
            
          // Show tooltip
          const tooltip = d3.select(similarityNetworkRef.current)
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background-color', isDarkMode ? '#374151' : '#f3f4f6')
            .style('color', textColor)
            .style('padding', '5px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', 100)
            .style('left', `${event.pageX - similarityNetworkRef.current.getBoundingClientRect().left + 10}px`)
            .style('top', `${event.pageY - similarityNetworkRef.current.getBoundingClientRect().top - 28}px`);
            
          tooltip.html(`
            <div>Cluster: ${d.cluster + 1}</div>
            <div>SMILES: ${d.smiles.substring(0, 20)}...</div>
            ${d.properties ? `
              <div>MW: ${d.properties['Molecular Weight'].toFixed(1)}</div>
              <div>LogP: ${d.properties['LogP'].toFixed(2)}</div>
              <div>QED: ${d.properties['QED'].toFixed(2)}</div>
            ` : ''}
          `);
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
          d3.select(similarityNetworkRef.current).selectAll('.tooltip').remove();
        })
        .on('click', function(event, d) {
          // Handle click - show molecule details
          handleMoleculeSelect(d.smiles);
        });
        
    // Add titles for tooltip (fallback for browsers that support it)
    node.append("title")
      .text(d => `Cluster ${d.cluster + 1}: ${d.smiles.substring(0, 20)}...`);
    
    // Create a drag behavior
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
    
    // Update positions during simulation
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
        
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });
    
    // Add legend for clusters
    const uniqueClusters = [...new Set(clusterData.nodes.map(d => d.cluster))].sort((a, b) => a - b);
    
    const legend = svg.append("g")
      .attr("transform", `translate(20, 20)`)
      .style("pointer-events", "none"); // Prevent legend from interfering with pan/zoom
      
    legend.selectAll("rect")
      .data(uniqueClusters)
      .join("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => colorScale(d));
        
    legend.selectAll("text")
      .data(uniqueClusters)
      .join("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 20 + 12)
        .text(d => `Cluster ${d + 1}`)
        .attr("fill", textColor)
        .style("font-size", "12px");
        
    // Add interaction instructions
    svg.append("text")
      .attr("x", 20)
      .attr("y", height - 10)
      .attr("fill", textColor)
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .text("Drag to move nodes | Scroll to zoom | Use buttons to adjust view");
    
    // Apply initial zoom to show all nodes
    setTimeout(() => {
      svg.call(zoom.transform, d3.zoomIdentity.scale(optimalZoomLevel));
    }, 300);
    
    // Add small delay before stopping simulation to let nodes spread out more
    setTimeout(() => {
      simulation.alphaTarget(0.01).restart(); // Lower alpha target for gentler simulation
      
      // Stop simulation after some time to save CPU
      setTimeout(() => {
        simulation.stop();
      }, 5000);
    }, 100);
  };

  // Effect to trigger similarity calculation when the similarity view is activated
  useEffect(() => {
    if (activeView === 'similarity' && !similarityMatrix && !loadingSimilarity && leadData?.leads?.length > 0) {
      calculateSimilarity();
    }
  }, [activeView, similarityMatrix, loadingSimilarity, leadData]);

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
            
            {/* View tabs - only show when completed */}
            {leadData.status === 'completed' && leadData.leads && leadData.leads.length > 0 && (
              <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveView('grid')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm focus:outline-none ${
                      activeView === 'grid'
                        ? 'border-pharma-blue dark:border-pharma-teal text-pharma-blue dark:text-pharma-teal'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Grid View
                  </button>
                  <button
                    onClick={() => setActiveView('summary')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm focus:outline-none ${
                      activeView === 'summary'
                        ? 'border-pharma-blue dark:border-pharma-teal text-pharma-blue dark:text-pharma-teal'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setActiveView('similarity')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm focus:outline-none ${
                      activeView === 'similarity'
                        ? 'border-pharma-blue dark:border-pharma-teal text-pharma-blue dark:text-pharma-teal'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Similarity
                  </button>
                </div>
              </div>
            )}
            
            {/* Sort and filter controls - only shown in grid view */}
            {leadData.status === 'completed' && activeView === 'grid' && renderSortAndFilterControls()}
            
            {/* Lead compounds grid view */}
            {leadData.leads && leadData.leads.length > 0 && activeView === 'grid' ? (
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
                
                {leadData.status === 'completed' && filteredAndSortedLeads.length === 0 && !loadingLeadsProperties && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <p className="text-lg font-medium">No matching compounds</p>
                    <p className="mt-1">Try adjusting your filters or search criteria</p>
                    <button 
                      className="mt-3 inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-pharma-blue dark:text-pharma-teal hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={resetFilters}
                    >
                      <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Filters
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {leadData.status === 'running' 
                    ? leadData.leads.map((smiles, index) => renderLeadCard(smiles, index))
                    : filteredAndSortedLeads.map((smiles, index) => {
                        // Find the original index to preserve the lead number
                        const originalIndex = leadData.leads.findIndex(s => s === smiles);
                        return renderLeadCard(smiles, originalIndex);
                      })
                  }
                </div>
              </div>
            ) : leadData.status === 'completed' && activeView === 'summary' ? (
              // Summary view 
              <div className="mt-4">
                {renderSummaryView()}
              </div>
            ) : leadData.status === 'completed' && activeView === 'similarity' ? (
              // Similarity view
              <div className="mt-4">
                {renderSimilarityView()}
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

        {/* Molecule details modal */}
        {renderMoleculeDetailsModal()}

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