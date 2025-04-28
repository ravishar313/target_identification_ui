import React, { useState, useEffect } from 'react';
import { endpoints } from '../constants/api';

const ReviewLeadCharacteristics = ({ data, onNext, onBack }) => {
  const [loading, setLoading] = useState({
    disease: false,
    target: false,
    pocket: false
  });
  const [characteristics, setCharacteristics] = useState({
    disease: [],
    target: [],
    pocket: []
  });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedCharacteristics, setExpandedCharacteristics] = useState({});

  useEffect(() => {
    fetchAllCharacteristics();
  }, []);

  const fetchAllCharacteristics = async () => {
    setError(null);
    await Promise.all([
      fetchCharacteristics('disease', endpoints.diseaseCharacteristicsUrl, { project_id: data.projectId }),
      fetchCharacteristics('target', endpoints.targetCharacteristicsUrl, { project_id: data.projectId, pdb_id: data.pdbId }),
      fetchCharacteristics('pocket', endpoints.pocketCharacteristicsUrl, { project_id: data.projectId, pdb_id: data.pdbId })
    ]);
  };

  const fetchCharacteristics = async (type, endpointUrl, requestData) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} characteristics`);
      }

      const responseData = await response.json();
      const fetchedCharacteristics = responseData.characteristics || [];
      
      setCharacteristics(prev => ({ 
        ...prev, 
        [type]: fetchedCharacteristics 
      }));
      
      // Initialize expanded state for new characteristics
      fetchedCharacteristics.forEach((_, index) => {
        const key = `${type}-${index}`;
        setExpandedCharacteristics(prev => ({
          ...prev,
          [key]: false
        }));
      });
    } catch (error) {
      console.error(`Error fetching ${type} characteristics:`, error);
      setError(`Failed to load some characteristics. Please try again.`);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const toggleCharacteristic = (type, index) => {
    const key = `${type}-${index}`;
    setExpandedCharacteristics(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isAnyLoading = loading.disease || loading.target || loading.pocket;

  // Get all characteristics for combined view or filtered by tab
  const getFilteredCharacteristics = () => {
    if (activeTab === 'all') {
      const allCharacteristics = [
        ...characteristics.disease.map(c => ({ ...c, type: 'disease' })),
        ...characteristics.target.map(c => ({ ...c, type: 'target' })),
        ...characteristics.pocket.map(c => ({ ...c, type: 'pocket' }))
      ];
      
      // Group by characteristic name to combine duplicates
      const groupedByName = {};
      allCharacteristics.forEach(c => {
        if (!groupedByName[c.characteristic]) {
          groupedByName[c.characteristic] = { ...c, sources: [c.type] };
        } else {
          groupedByName[c.characteristic].sources.push(c.type);
        }
      });
      
      return Object.values(groupedByName);
    } else {
      return characteristics[activeTab].map(c => ({ ...c, type: activeTab }));
    }
  };

  const filteredCharacteristics = getFilteredCharacteristics();

  // Get icon and color for characteristic type
  const getTypeDetails = (type) => {
    switch(type) {
      case 'disease':
        return { 
          icon: '🧬', 
          label: 'Disease', 
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          gradient: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
          gradientActive: "from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30",
          border: "border-blue-200 dark:border-blue-700",
          iconColor: "text-blue-500 dark:text-blue-400"
        };
      case 'target':
        return { 
          icon: '🎯', 
          label: 'Target', 
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          gradient: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
          gradientActive: "from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30",
          border: "border-green-200 dark:border-green-700",
          iconColor: "text-green-500 dark:text-green-400"
        };
      case 'pocket':
        return { 
          icon: '🧪', 
          label: 'Pocket', 
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
          gradient: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
          gradientActive: "from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30",
          border: "border-purple-200 dark:border-purple-700",
          iconColor: "text-purple-500 dark:text-purple-400"
        };
      default:
        return { 
          icon: '🔍', 
          label: 'Unknown', 
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          gradient: "from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50",
          gradientActive: "from-gray-100 to-gray-200 dark:from-gray-800/70 dark:to-gray-700/70",
          border: "border-gray-200 dark:border-gray-700",
          iconColor: "text-gray-500 dark:text-gray-400"
        };
    }
  };

  // Get appropriate icon for the characteristic
  const getCharacteristicIcon = (index) => {
    const icons = [
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ];
    
    return icons[index % icons.length];
  };

  return (
    <div className="w-full">
      <div className="space-y-6">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">📋</span>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Lead Characteristics Summary</h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Review all the lead characteristics identified from disease, target, and pocket analysis.
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
        
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-4 text-sm font-medium border-b-2 ${
                activeTab === 'all'
                  ? 'border-pharma-blue dark:border-pharma-teal text-pharma-blue dark:text-pharma-teal'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All Characteristics
            </button>
            <button
              onClick={() => setActiveTab('disease')}
              className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center ${
                activeTab === 'disease'
                  ? 'border-pharma-blue dark:border-pharma-teal text-pharma-blue dark:text-pharma-teal'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-1">🧬</span> Disease ({characteristics.disease.length})
            </button>
            <button
              onClick={() => setActiveTab('target')}
              className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center ${
                activeTab === 'target'
                  ? 'border-pharma-blue dark:border-pharma-teal text-pharma-blue dark:text-pharma-teal'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-1">🎯</span> Target ({characteristics.target.length})
            </button>
            <button
              onClick={() => setActiveTab('pocket')}
              className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center ${
                activeTab === 'pocket'
                  ? 'border-pharma-blue dark:border-pharma-teal text-pharma-blue dark:text-pharma-teal'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-1">🧪</span> Pocket ({characteristics.pocket.length})
            </button>
          </nav>
        </div>
        
        {/* Characteristics */}
        {isAnyLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-pharma-blue dark:border-pharma-teal rounded-full"></div>
            <span className="ml-4 text-gray-600 dark:text-gray-300">Loading characteristics...</span>
          </div>
        ) : (
          <>
            {filteredCharacteristics.length > 0 ? (
              <div className="space-y-6 mt-6">
                {filteredCharacteristics.map((item, index) => {
                  const { type } = item;
                  const typeDetails = getTypeDetails(type);
                  const key = `${type}-${index}`;
                  const isExpanded = expandedCharacteristics[key];
                  
                  return (
                    <div 
                      key={key} 
                      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border ${typeDetails.border} transition-all duration-300 ${isExpanded ? 'shadow-lg ring-1 ring-gray-200 dark:ring-gray-700' : 'hover:shadow-lg'}`}
                    >
                      <div 
                        className={`p-4 cursor-pointer bg-gradient-to-r ${isExpanded ? typeDetails.gradientActive : typeDetails.gradient} transition-colors duration-300`}
                        onClick={() => toggleCharacteristic(type, index)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center mr-3 ${typeDetails.iconColor}`}>
                              {getCharacteristicIcon(index)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{item.characteristic}</h3>
                              
                              {/* Source tags for 'all' view */}
                              {activeTab === 'all' && item.sources && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.sources.map(sourceType => {
                                    const details = getTypeDetails(sourceType);
                                    return (
                                      <span key={sourceType} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${details.color}`}>
                                        {details.icon} {details.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Single source tag for filtered views */}
                              {activeTab !== 'all' && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeDetails.color} mt-1`}>
                                  {typeDetails.icon} {typeDetails.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 mr-2">
                              {isExpanded ? 'Hide details' : 'Show details'}
                            </span>
                            <svg 
                              className={`h-5 w-5 ${typeDetails.iconColor} transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-5 border-t border-gray-200 dark:border-gray-700">
                          <div className="mb-5 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${typeDetails.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Rationale
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400">{item.rationale}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${typeDetails.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Solution
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400">{item.solution}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 text-center mt-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400">No characteristics available for the selected filter.</p>
              </div>
            )}
          </>
        )}
        
        <div className="flex justify-between mt-8">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="btn-primary px-6 py-2 rounded-md"
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewLeadCharacteristics; 