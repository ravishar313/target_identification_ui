import React from 'react';

const LeadOptimizationPage = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-pharma-blue dark:text-pharma-teal">Lead Optimization</h2>
      
      <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
        <p className="text-gray-700 dark:text-gray-300">
          The Lead Optimization module will allow you to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Optimize lead compounds for improved efficacy and safety</li>
          <li>Perform structure-activity relationship (SAR) analysis</li>
          <li>Design and predict properties of compound modifications</li>
          <li>Optimize ADMET properties (Absorption, Distribution, Metabolism, Excretion, Toxicity)</li>
          <li>Track and compare optimized compound performance</li>
          <li>Select candidates for preclinical testing</li>
        </ul>
      </div>
      
      <div className="text-center p-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">Lead Optimization Coming Soon</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          This module is currently under development.
        </p>
      </div>
    </div>
  );
};

export default LeadOptimizationPage; 