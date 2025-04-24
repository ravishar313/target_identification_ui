import React, { useState } from 'react';

const DiseaseInput = ({ onNext }) => {
  const [disease, setDisease] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Disease Analysis Input</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="disease" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Disease for Investigation
            </label>
            <input
              type="text"
              id="disease"
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Type 2 Diabetes"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white px-4 py-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Analyze Disease
          </button>
        </form>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h3>
          <ul className="space-y-2">
            {['Alzheimer\'s Disease', 'Breast Cancer', 'Rheumatoid Arthritis'].map((item, index) => (
              <li
                key={index}
                className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors duration-150 text-gray-700"
                onClick={() => {
                  setDisease(item);
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DiseaseInput; 