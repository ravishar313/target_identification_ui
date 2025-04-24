import React, { useState, useEffect } from 'react';
import { endpoints } from '../constants/api';

const DiseaseExpertAnalysis = ({ onNext, onBack, data, setData, setIsLoading }) => {
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch similar diseases from the API when the component mounts
  useEffect(() => {
    // Only fetch if we have a disease and don't already have results for it
    if (data.disease && (!data.similarDiseases || data.similarDiseases.length === 0)) {
      fetchSimilarDiseases();
    }
  }, [data.disease]);

  const fetchSimilarDiseases = async () => {
    setIsLocalLoading(true);
    setIsLoading(true); // Update parent loading state
    setError(null);

    try {
      const response = await fetch(endpoints.processDiseaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ disease: data.disease }),
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
    fetchSimilarDiseases();
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

  // If no similar diseases data yet and not loading/error, show a message
  if (!data.similarDiseases || data.similarDiseases.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-6">Disease Expert Analysis</h2>
        <p className="text-gray-700">No disease analysis data available. Please go back and select a disease.</p>
        <button
          onClick={onBack}
          className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          Back to Disease Input
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Disease Expert Analysis for {data.disease}</h2>
      
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
          Proceed to Structure Analysis
        </button>
      </div>
    </div>
  );
};

export default DiseaseExpertAnalysis; 