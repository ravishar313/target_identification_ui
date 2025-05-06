import React from 'react';
import BaseServiceForm from './BaseServiceForm';

/**
 * ClinTox service component for predicting clinical toxicity
 * @param {Object} props - Component props
 * @param {Function} props.onJobSubmitted - Function to call with job ID when a job is submitted
 */
const ClintoxService = ({ onJobSubmitted }) => {
  // Validation function for SMILE sequence
  const validateParameters = (params) => {
    const errors = {};
    
    // Validate SMILE string
    if (!params.smiles?.trim()) {
      errors.smiles = 'SMILE string is required';
    } else {
      // Basic validation for SMILE string - checking for certain common characters
      const validSMILEChars = /^[A-Za-z0-9\(\)\[\]\.\=\#\-\+\@\:\\\/%\s\,]+$/;
      if (!validSMILEChars.test(params.smiles)) {
        errors.smiles = 'Invalid SMILE string. Please check the format.';
      }
    }
    
    return errors;
  };

  // Define parameter fields
  const parameterFields = [
    {
      name: 'smiles',
      label: 'SMILE String',
      type: 'textarea',
      rows: 4,
      className: 'font-mono',
      placeholder: 'Enter SMILE string for the molecule',
      helpText: 'Enter a valid SMILE string representing the molecular structure (e.g., CC1(=[NH+]C=C(C(=C1([O-]))C=[NH+]C(C)C2(=CC=CC=C2))COP(=O)([O-])[O-]))',
      required: true
    }
  ];

  // Additional information component about ClinTox properties
  const AdditionalInfo = () => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Clinical Toxicity Prediction</h3>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p>Predicts the following toxicity properties:</p>
        <ul className="list-disc list-inside pl-2 space-y-1">
          <li>Toxicity Score (FDA approval likelihood)</li>
          <li>Synthetic Accessibility Score</li>
        </ul>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Predictions are based on machine learning models trained on FDA-approved compounds and toxicity data.
      </p>
    </div>
  );

  // Handle job submission success
  const handleJobSubmitted = (jobId) => {
    if (onJobSubmitted) {
      onJobSubmitted(jobId);
    }
  };

  return (
    <>
      <AdditionalInfo />
      <BaseServiceForm
        serviceType="clintox"
        serviceName="ClinTox"
        serviceDescription="Predict clinical toxicity and FDA approval likelihood for small molecules"
        parameterFields={parameterFields}
        validateParameters={validateParameters}
        defaultJobName="ClinTox Prediction"
        onJobSubmitted={handleJobSubmitted}
      />
    </>
  );
};

export default ClintoxService; 