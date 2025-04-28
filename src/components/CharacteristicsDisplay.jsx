import React, { useState, useEffect } from 'react';
import { endpoints } from '../constants/api';

const CharacteristicsDisplay = ({ 
  title, 
  icon, 
  endpointUrl, 
  requestData, 
  onNext,
  onBack,
  data 
}) => {
  const [loading, setLoading] = useState(false);
  const [characteristics, setCharacteristics] = useState([]);
  const [error, setError] = useState(null);
  const [expandedCharacteristics, setExpandedCharacteristics] = useState({});

  useEffect(() => {
    fetchCharacteristics();
  }, [endpointUrl, requestData]);

  const fetchCharacteristics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${title.toLowerCase()} characteristics`);
      }

      const data = await response.json();
      setCharacteristics(data.characteristics || []);
      
      // Initialize expanded state
      const expandedState = {};
      (data.characteristics || []).forEach((_, index) => {
        expandedState[index] = false;
      });
      setExpandedCharacteristics(expandedState);
    } catch (error) {
      console.error(`Error fetching ${title.toLowerCase()} characteristics:`, error);
      setError(`Failed to load ${title.toLowerCase()} characteristics. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleCharacteristic = (index) => {
    setExpandedCharacteristics(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Get color scheme based on the characteristic type
  const getColorScheme = (index) => {
    // Color schemes for each card - alternate between different color schemes
    const colorSchemes = [
      {
        header: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
        headerActive: "from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30",
        border: "border-blue-200 dark:border-blue-700",
        icon: "text-blue-500 dark:text-blue-400"
      },
      {
        header: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
        headerActive: "from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30",
        border: "border-purple-200 dark:border-purple-700",
        icon: "text-purple-500 dark:text-purple-400"
      },
      {
        header: "from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20",
        headerActive: "from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30",
        border: "border-teal-200 dark:border-teal-700",
        icon: "text-teal-500 dark:text-teal-400"
      },
      {
        header: "from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20",
        headerActive: "from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30",
        border: "border-amber-200 dark:border-amber-700",
        icon: "text-amber-500 dark:text-amber-400"
      }
    ];
    
    return colorSchemes[index % colorSchemes.length];
  };

  return (
    <div className="w-full">
      <div className="space-y-6">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">{icon}</span>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Review the {title.toLowerCase()} characteristics that will guide lead optimization.
        </p>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-pharma-blue dark:border-pharma-teal rounded-full"></div>
            <span className="ml-4 text-gray-600 dark:text-gray-300">Loading characteristics...</span>
          </div>
        ) : (
          <>
            {characteristics.length > 0 ? (
              <div className="space-y-6">
                {characteristics.map((item, index) => {
                  const colorScheme = getColorScheme(index);
                  const isExpanded = expandedCharacteristics[index];
                  
                  return (
                    <div 
                      key={index} 
                      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border ${colorScheme.border} transition-all duration-300 ${isExpanded ? 'shadow-lg ring-1 ring-gray-200 dark:ring-gray-700' : 'hover:shadow-lg'}`}
                    >
                      <div 
                        className={`p-4 cursor-pointer bg-gradient-to-r ${isExpanded ? colorScheme.headerActive : colorScheme.header} transition-colors duration-300`}
                        onClick={() => toggleCharacteristic(index)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center mr-3 ${colorScheme.icon}`}>
                              {index % 4 === 0 && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                              {index % 4 === 1 && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                              {index % 4 === 2 && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                              {index % 4 === 3 && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{item.characteristic}</h3>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 mr-2">
                              {isExpanded ? 'Hide details' : 'Show details'}
                            </span>
                            <svg 
                              className={`h-5 w-5 ${colorScheme.icon} transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`} 
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
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${colorScheme.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Rationale
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400">{item.rationale}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${colorScheme.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400">No characteristics available.</p>
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
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacteristicsDisplay; 