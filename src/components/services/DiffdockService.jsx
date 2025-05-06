import React, { useState, useEffect } from 'react';
import BaseServiceForm from './BaseServiceForm';

/**
 * DiffDock service component for protein-ligand docking
 * @param {Object} props - Component props
 * @param {Function} props.onJobSubmitted - Function to call with job ID when a job is submitted
 */
const DiffdockService = ({ onJobSubmitted }) => {
  const [isSmile, setIsSmile] = useState(false);
  const [paramFields, setParamFields] = useState([]);

  // Initialize parameter fields
  useEffect(() => {
    setParamFields(getParameterFields());
  }, []);

  // Update parameter fields when isSmile changes
  useEffect(() => {
    setParamFields(getParameterFields());
    console.log('SMILE toggle changed:', isSmile);
  }, [isSmile]);

  // Validation function for DiffDock parameters
  const validateParameters = (params) => {
    const errors = {};
    
    // Validate protein file path
    if (!params.protein_file_path) {
      errors.protein_file_path = 'Protein file is required';
    }
    
    // Validate ligand input based on selected input type
    if (!params.ligand_input) {
      errors.ligand_input = params.is_smile ? 'SMILE string is required' : 'Ligand file is required';
    } else if (params.is_smile && typeof params.ligand_input === 'string') {
      // Basic validation for SMILE string - checking for certain common characters
      const validSMILEChars = /^[A-Za-z0-9\(\)\[\]\.\=\#\-\+\@\:\\\/%\s\,]+$/;
      if (!validSMILEChars.test(params.ligand_input)) {
        errors.ligand_input = 'Invalid SMILE string. Please check the format.';
      }
    }
    
    return errors;
  };

  // Handle checkbox change
  const handleSmileToggle = (value) => {
    console.log('Setting SMILE toggle to:', value);
    setIsSmile(value);
  };

  // Define parameter fields based on the current input type selection
  const getParameterFields = () => {
    const baseFields = [
      {
        name: 'protein_file_path',
        label: 'Protein File',
        type: 'file',
        accept: '.pdb',
        placeholder: 'Upload protein PDB file',
        helpText: 'Upload a protein structure file in PDB format',
        required: true
      },
      {
        name: 'is_smile',
        label: 'Use SMILE String for Ligand',
        type: 'checkbox',
        helpText: 'Check this if you want to provide a SMILE string instead of a ligand file',
        customOnChange: handleSmileToggle
      }
    ];

    // Add the appropriate ligand input field based on the selected type
    if (isSmile) {
      baseFields.push({
        name: 'ligand_input',
        label: 'Ligand SMILE String',
        type: 'textarea',
        rows: 3,
        className: 'font-mono',
        placeholder: 'Enter SMILE string for the ligand',
        helpText: 'Enter a valid SMILE string representing the ligand structure (e.g., CC1(=[NH+]C=C(C(=C1([O-]))C=[NH+]C(C)C2(=CC=CC=C2))COP(=O)([O-])[O-]))',
        required: true
      });
    } else {
      baseFields.push({
        name: 'ligand_input',
        label: 'Ligand File',
        type: 'file',
        accept: '.mol2',
        placeholder: 'Upload ligand file (MOL2)',
        helpText: 'Upload a ligand structure file in MOL2 format',
        required: true
      });
    }

    return baseFields;
  };

  // Additional information component about default parameters
  const AdditionalInfo = () => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Default Parameters</h3>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p>• Number of poses: 20</p>
        <p>• Time divisions: 20</p>
        <p>• Steps: 18</p>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Advanced parameter customization will be available in a future update.
      </p>
    </div>
  );

  // Process parameters before submission
  const processParameters = (params) => {
    // Create a copy of the parameters
    const processedParams = { ...params };
    
    // Ensure is_smile is a boolean
    processedParams.is_smile = Boolean(params.is_smile);
    
    return processedParams;
  };

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
        serviceType="diffdock"
        serviceName="DiffDock"
        serviceDescription="Perform protein-ligand docking using DiffDock"
        parameterFields={paramFields}
        validateParameters={validateParameters}
        processParameters={processParameters}
        defaultJobName="DiffDock Docking"
        onJobSubmitted={handleJobSubmitted}
      />
    </>
  );
};

export default DiffdockService; 