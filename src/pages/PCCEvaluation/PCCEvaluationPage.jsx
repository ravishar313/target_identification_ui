import React from 'react';

const PCCEvaluationPage = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-pharma-blue dark:text-pharma-teal">PCC Evaluation</h2>
      
      <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
        <p className="text-gray-700 dark:text-gray-300">
          The Preclinical Candidate (PCC) Evaluation module will allow you to:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Evaluate pharmacokinetic and pharmacodynamic properties</li>
          <li>Assess safety profiles and potential toxicity</li>
          <li>Analyze in vitro and in vivo efficacy data</li>
          <li>Review manufacturability and scalability factors</li>
          <li>Prepare comprehensive evaluation reports for decision-making</li>
          <li>Select final candidates for clinical development</li>
        </ul>
      </div>
      
      <div className="text-center p-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">PCC Evaluation Coming Soon</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          This module is currently under development.
        </p>
      </div>
    </div>
  );
};

export default PCCEvaluationPage; 