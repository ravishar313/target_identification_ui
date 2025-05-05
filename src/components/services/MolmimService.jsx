import React from 'react';
import BaseServiceForm from './BaseServiceForm';

/**
 * MolMIM service component for molecular structure generation
 * @param {Object} props - Component props
 * @param {Function} props.onJobSubmitted - Function to call with job ID when a job is submitted
 */
const MolmimService = ({ onJobSubmitted }) => {
  // Validation function for SMILE sequence
  const validateParameters = (params) => {
    const errors = {};
    
    // Validate SMILE string
    if (!params.smile?.trim()) {
      errors.smile = 'SMILE string is required';
    } else {
      // Basic validation for SMILE string - checking for certain common characters
      // Note: This is a simple check, not a full SMILE string validator
      const validSMILEChars = /^[A-Za-z0-9\(\)\[\]\.\=\#\-\+\@\:\\\/%\s]+$/;
      if (!validSMILEChars.test(params.smile)) {
        errors.smile = 'Invalid SMILE string. Please check the format.';
      }
    }
    
    return errors;
  };

  // Define parameter fields
  const parameterFields = [
    {
      name: 'smile',
      label: 'SMILE String',
      type: 'textarea',
      rows: 4,
      className: 'font-mono',
      placeholder: 'Enter SMILE string for the molecule',
      helpText: 'Enter a valid SMILE string representing the molecular structure (e.g., CC1(=[NH+]C=C(C(=C1([O-]))C=[NH+]C(C)C2(=CC=CC=C2))COP(=O)([O-])[O-])',
      required: true
    }
  ];

  // Additional information component about default parameters
  const AdditionalInfo = () => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Default Parameters</h3>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p>• Number of molecules: 10</p>
        <p>• Property name: QED</p>
        <p>• Minimize: false</p>
        <p>• Minimum similarity: 0.7</p>
        <p>• Particles: 20</p>
        <p>• Iterations: 10</p>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Advanced parameter customization will be available in a future update.
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
        serviceType="molmim"
        serviceName="MolMIM"
        serviceDescription="Generate optimized molecular structures using MolMIM"
        parameterFields={parameterFields}
        validateParameters={validateParameters}
        defaultJobName="MolMIM Generation"
        onJobSubmitted={handleJobSubmitted}
      />
    </>
  );
};

export default MolmimService; 