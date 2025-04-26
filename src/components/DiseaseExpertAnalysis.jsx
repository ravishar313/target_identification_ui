import React, { useState } from 'react';
import { endpoints } from '../constants/api';
import { exportToCSV } from '../utils/csvExport';

const DiseaseExpertAnalysis = ({ onNext, onBack, data, setData, setIsLoading }) => {
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [error, setError] = useState(null);

  const findSimilarDiseases = async () => {
    setIsLocalLoading(true);
    setIsLoading(true); // Update parent loading state
    setError(null);

    try {
      const response = await fetch(endpoints.processDiseaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          disease: data.disease,
          project_id: data.projectId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process disease');
      }

      const responseData = await response.json();
      
      // Update the global state with the fetched similar diseases
      setData({
        ...data,
        similarDiseases: responseData.diseases
      });
    } catch (err) {
      console.error('Error fetching similar diseases:', err);
      setError(err.message || 'An error occurred while processing the disease');
    } finally {
      setIsLocalLoading(false);
      setIsLoading(false); // Update parent loading state
    }
  };

  const handleRetry = () => {
    findSimilarDiseases();
  };

  const handleDownloadCSV = () => {
    const headers = [
      { label: 'Disease', key: 'disease' },
      { label: 'Rationale', key: 'rationale' }
    ];
    
    exportToCSV(data.similarDiseases, headers, `${data.disease}_similar_diseases.csv`);
  };

  // Display loading state
  if (isLocalLoading) {
    return (
      <div className="w-full p-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <span className="molecule-icon text-xl mr-2">🧬</span>
          Disease Expert Analysis
        </h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pharma-blue dark:border-pharma-teal mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-200">Analyzing {data.disease}...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take 30-40 seconds</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="w-full p-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <span className="molecule-icon text-xl mr-2">🧬</span>
          Disease Expert Analysis
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 mb-6">
          <h3 className="text-red-800 dark:text-red-300 font-medium">Error</h3>
          <p className="text-red-700 dark:text-red-400 mt-2">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-300 px-4 py-2 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
          >
            Try Again
          </button>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="btn-secondary"
          >
            Back to Disease Input
          </button>
        </div>
      </div>
    );
  }

  // If no similar diseases data yet
  if (!data.similarDiseases || data.similarDiseases.length === 0) {
    return (
      <div className="w-full p-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <span className="molecule-icon text-xl mr-2">🧬</span>
          Disease Expert Analysis
        </h2>
        <div className="card">
          <div className="text-center mb-8">
            <div className="bg-pharma-blue/10 dark:bg-pharma-teal/10 inline-block rounded-full p-4 mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-pharma-blue dark:text-pharma-teal">
                <path d="M9.75 17L9 20L8 21H16L15 20L14.25 17M12 3C14.7614 3 17 5.23858 17 8C17 9.6356 16.2147 11.0878 15 12L14 12.5V14H10L10 12.5L9 12C7.78555 11.0878 7 9.6356 7 8C7 5.23858 9.23858 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ready to Find Similar Diseases</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Click the button below to analyze {data.disease} and find similar diseases.
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">Project Details</h4>
            <div className="mt-2 space-y-1">
              <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Project Name:</span> <span className="text-gray-900 dark:text-white">{data.projectName}</span></p>
              <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Disease:</span> <span className="text-gray-900 dark:text-white">{data.disease}</span></p>
              <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Project ID:</span> <span className="text-gray-900 dark:text-white">{data.projectId}</span></p>
              {data.createdAt && (
                <p className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Created:</span> <span className="text-gray-900 dark:text-white">{new Date(data.createdAt * 1000).toLocaleString()}</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <button
              onClick={findSimilarDiseases}
              className="btn-primary flex items-center px-6 py-3"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              Find Similar Diseases
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This process will take approximately 30-40 seconds</p>
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={onBack}
            className="btn-secondary"
          >
            Back to Disease Input
          </button>
        </div>
      </div>
    );
  }

  // Display results
  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
          <span className="molecule-icon text-xl mr-2">🧬</span>
          Disease Analysis: {data.disease}
        </h2>
        {data.similarDiseases && data.similarDiseases.length > 0 && (
          <button
            onClick={handleDownloadCSV}
            className="flex items-center bg-pharma-green dark:bg-pharma-teal text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download CSV
          </button>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-300 mb-4">Project: {data.projectName} (ID: {data.projectId})</p>
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span className="molecule-icon text-lg mr-2">🔬</span>
          Similar Diseases
        </h3>
        <div className="space-y-6">
          {data.similarDiseases.map((item, index) => (
            <div key={index} className="card border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-pharma-blue/10 dark:bg-pharma-teal/10 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <h4 className="font-bold text-lg text-pharma-blue dark:text-pharma-teal">{item.disease}</h4>
              </div>
              <div className="px-6 py-4">
                <div className="mb-2">
                  <span className="inline-block bg-pharma-blue/10 dark:bg-pharma-teal/10 text-pharma-blue dark:text-pharma-teal text-xs px-2 py-1 rounded-full font-medium">
                    Rationale for Selection
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">{item.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="btn-primary"
        >
          Proceed to Target Filtering
        </button>
      </div>
    </div>
  );
};

export default DiseaseExpertAnalysis; 