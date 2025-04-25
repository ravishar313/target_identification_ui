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
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-6">Disease Expert Analysis</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-gray-700">Analyzing {data.disease}...</p>
          <p className="text-sm text-gray-500 mt-2">This may take 30-40 seconds</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Disease Expert Analysis</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 mt-2">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
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
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Disease Expert Analysis</h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center mb-8">
            <div className="bg-blue-50 inline-block rounded-full p-4 mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.75 17L9 20L8 21H16L15 20L14.25 17M12 3C14.7614 3 17 5.23858 17 8C17 9.6356 16.2147 11.0878 15 12L14 12.5V14H10L10 12.5L9 12C7.78555 11.0878 7 9.6356 7 8C7 5.23858 9.23858 3 12 3Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Ready to Find Similar Diseases</h3>
            <p className="text-gray-600 mt-2">
              Click the button below to analyze {data.disease} and find similar diseases.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-700">Project Details</h4>
            <div className="mt-2 space-y-1">
              <p className="text-sm"><span className="text-gray-500">Project Name:</span> {data.projectName}</p>
              <p className="text-sm"><span className="text-gray-500">Disease:</span> {data.disease}</p>
              <p className="text-sm"><span className="text-gray-500">Project ID:</span> {data.projectId}</p>
              {data.createdAt && (
                <p className="text-sm">
                  <span className="text-gray-500">Created:</span> {new Date(data.createdAt * 1000).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <button
              onClick={findSimilarDiseases}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              Find Similar Diseases
            </button>
            <p className="text-sm text-gray-500 mt-2">This process will take approximately 30-40 seconds</p>
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={onBack}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
          >
            Back to Disease Input
          </button>
        </div>
      </div>
    );
  }

  // Display results
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Disease Expert Analysis for {data.disease}</h2>
        {data.similarDiseases && data.similarDiseases.length > 0 && (
          <button
            onClick={handleDownloadCSV}
            className="flex items-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download CSV
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-4">Project: {data.projectName} (ID: {data.projectId})</p>
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Similar Diseases</h3>
        <div className="space-y-6">
          {data.similarDiseases.map((item, index) => (
            <div key={index} className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="bg-blue-50 border-b px-6 py-4">
                <h4 className="font-bold text-lg text-blue-900">{item.disease}</h4>
              </div>
              <div className="px-6 py-4">
                <div className="mb-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    Rationale for Selection
                  </span>
                </div>
                <p className="text-gray-700 mt-2 leading-relaxed">{item.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Proceed to Target Filtering
        </button>
      </div>
    </div>
  );
};

export default DiseaseExpertAnalysis; 