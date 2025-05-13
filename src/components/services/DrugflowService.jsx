import React, { useState, useEffect } from 'react';
import BaseServiceForm from './BaseServiceForm';

/**
 * DrugFlow service component for protein-ligand generation
 * @param {Object} props - Component props
 * @param {Function} props.onJobSubmitted - Function to call with job ID when a job is submitted
 */
const DrugflowService = ({ onJobSubmitted }) => {
  const [paramFields, setParamFields] = useState([]);

  // Initialize parameter fields
  useEffect(() => {
    setParamFields(getParameterFields());
  }, []);

  // Validation function for DrugFlow parameters
  const validateParameters = (params) => {
    const errors = {};
    
    // Validate protein file path
    if (!params.protein_path) {
      errors.protein_path = 'Protein file is required';
    }
    
    // Validate ligand file path
    if (!params.ligand_path) {
      errors.ligand_path = 'Ligand file is required';
    }
    
    return errors;
  };

  // Define parameter fields
  const getParameterFields = () => {
    return [
      {
        name: 'protein_path',
        label: 'Protein File',
        type: 'file',
        accept: '.pdb',
        placeholder: 'Upload protein PDB file',
        helpText: 'Upload a protein structure file in PDB format',
        required: true
      },
      {
        name: 'ligand_path',
        label: 'Ligand File',
        type: 'file',
        accept: '.sdf',
        placeholder: 'Upload ligand SDF file',
        helpText: 'Upload a ligand structure file in SDF format',
        required: true
      },
      {
        name: 'n_samples',
        label: 'Number of Samples',
        type: 'number',
        placeholder: 'Number of samples to generate',
        helpText: 'Number of molecular samples to generate (default: 10)',
        min: 1,
        max: 100,
        step: 1
      },
      {
        name: 'n_steps',
        label: 'Number of Steps',
        type: 'number',
        placeholder: 'Number of steps',
        helpText: 'Number of generation steps (default: 0)',
        min: 0,
        max: 1000,
        step: 1
      },
      {
        name: 'pocket_distance_cutoff',
        label: 'Pocket Distance Cutoff',
        type: 'number',
        placeholder: 'Pocket distance cutoff in Ångström',
        helpText: 'Distance cutoff for pocket detection in Ångström (default: 8)',
        min: 1,
        max: 20,
        step: 0.5
      }
    ];
  };

  // Additional information component about default parameters
  const AdditionalInfo = () => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">DrugFlow Service</h3>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p>Generate novel ligands for protein targets using DrugFlow, a molecule generation model.</p>
        <p className="mt-2">Default parameters:</p>
        <p>• Number of samples: 10</p>
        <p>• Number of steps: 0</p>
        <p>• Pocket distance cutoff: 8 Å</p>
      </div>
    </div>
  );

  // Process parameters before submission
  const processParameters = (params) => {
    const processedParams = {
      protein_path: params.protein_path,
      ligand_path: params.ligand_path,
      checkpoint: "drugflow.ckpt",
      batch_size: 10,
      device: "cuda:0",
      seed: 42,
      filter: false,
      no_validity_check: false
    };

    // Add optional parameters if provided
    if (params.n_samples !== undefined && params.n_samples !== '') {
      processedParams.n_samples = parseInt(params.n_samples);
    } else {
      processedParams.n_samples = 10; // default value
    }

    if (params.n_steps !== undefined && params.n_steps !== '') {
      processedParams.n_steps = parseInt(params.n_steps);
    } else {
      processedParams.n_steps = 0; // default value
    }

    if (params.pocket_distance_cutoff !== undefined && params.pocket_distance_cutoff !== '') {
      processedParams.pocket_distance_cutoff = parseFloat(params.pocket_distance_cutoff);
    } else {
      processedParams.pocket_distance_cutoff = 8; // default value
    }
    
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
        serviceType="drugflow"
        serviceName="DrugFlow"
        serviceDescription="Generate novel ligands for protein targets"
        parameterFields={paramFields}
        validateParameters={validateParameters}
        processParameters={processParameters}
        defaultJobName="DrugFlow Generation"
        onJobSubmitted={handleJobSubmitted}
      />
    </>
  );
};

export default DrugflowService; 