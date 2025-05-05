import React from 'react';
import BaseServiceForm from './BaseServiceForm';

/**
 * AlphaFold service component for protein structure prediction
 * @param {Object} props - Component props
 * @param {Function} props.onJobSubmitted - Function to call with job ID when a job is submitted
 */
const AlphafoldService = ({ onJobSubmitted }) => {
  // Validation function for protein sequence
  const validateParameters = (params) => {
    const errors = {};
    
    // Validate protein sequence
    if (!params.sequence?.trim()) {
      errors.sequence = 'Protein sequence is required';
    } else {
      // Regex for valid amino acid sequence
      const validAminoAcids = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
      if (!validAminoAcids.test(params.sequence)) {
        errors.sequence = 'Invalid protein sequence. Only standard amino acid letters (ACDEFGHIKLMNPQRSTVWY) are allowed.';
      }
    }
    
    return errors;
  };

  // Define parameter fields
  const parameterFields = [
    {
      name: 'sequence',
      label: 'Protein Sequence',
      type: 'textarea',
      rows: 6,
      className: 'font-mono',
      placeholder: 'Enter protein sequence (one letter amino acid code)',
      helpText: 'Enter a protein sequence using one-letter amino acid codes (e.g., GSASCGVWDEWSPCSVTCGKGTRSRKREILHEGCTSEIQEQCEEERCPP)',
      required: true
    }
  ];

  // Additional information component about default parameters
  const AdditionalInfo = () => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Default Parameters</h3>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p>• Database search algorithm: MMseqs2</p>
        <p>• E-value: 0.0001</p>
        <p>• Iterations: 1</p>
        <p>• Databases: uniref90, mgnify, small_bfd</p>
        <p>• Relax prediction: Yes</p>
        <p>• Template searcher: HHSearch</p>
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
        serviceType="alphafold"
        serviceName="AlphaFold"
        serviceDescription="Predict 3D protein structures using AlphaFold"
        parameterFields={parameterFields}
        validateParameters={validateParameters}
        defaultJobName="AlphaFold Prediction"
        onJobSubmitted={handleJobSubmitted}
      />
    </>
  );
};

export default AlphafoldService; 