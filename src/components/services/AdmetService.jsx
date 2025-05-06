import React from 'react';
import BaseServiceForm from './BaseServiceForm';

/**
 * ADMET service component for predicting ADMET properties
 * @param {Object} props - Component props
 * @param {Function} props.onJobSubmitted - Function to call with job ID when a job is submitted
 */
const AdmetService = ({ onJobSubmitted }) => {
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

  // Additional information component about ADMET properties
  const AdditionalInfo = () => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">ADMET Properties Prediction</h3>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p>Predicts the following pharmacokinetic properties:</p>
        <ul className="list-disc list-inside pl-2 space-y-1">
          <li>BBB safety (Blood-Brain Barrier penetration)</li>
          <li>hERG safety (cardiotoxicity)</li>
          <li>Bioavailability</li>
          <li>Solubility</li>
          <li>Toxicity</li>
        </ul>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        All predictions are based on deep learning models and shown as percentage probability.
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
        serviceType="admet"
        serviceName="ADMET"
        serviceDescription="Predict pharmacokinetic properties for small molecules"
        parameterFields={parameterFields}
        validateParameters={validateParameters}
        defaultJobName="ADMET Prediction"
        onJobSubmitted={handleJobSubmitted}
      />
    </>
  );
};

export default AdmetService; 