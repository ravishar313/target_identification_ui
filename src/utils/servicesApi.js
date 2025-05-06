import { endpoints } from '../constants/api';

// Base path for file downloads
export const FILE_BASE_PATH = '/Users/ravi/Upsurge/target_identification/';

/**
 * Fetches available services
 * @returns {Promise<Array>} List of available services
 */
export const fetchAvailableServices = async () => {
  try {
    // Instead of using a dedicated 'list' endpoint, we'll hardcode the available services
    // This can be replaced with a proper API call when the endpoint is available
    return [
      {
        id: 'alphafold',
        name: 'AlphaFold',
        icon: '🧬',
        description: 'Predict 3D protein structures using AlphaFold'
      },
      {
        id: 'molmim',
        name: 'MolMIM',
        icon: '⚗️',
        description: 'Generate optimized molecular structures using MolMIM'
      },
      {
        id: 'diffdock',
        name: 'DiffDock',
        icon: '🔍',
        description: 'Perform protein-ligand docking using DiffDock'
      }
      // Additional services can be added here as they become available
    ];
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

/**
 * Uploads a file to the server
 * @param {File} file - The file to upload
 * @returns {Promise<string>} The path to the uploaded file
 */
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Uploading file:', file.name);
    
    const response = await fetch(endpoints.fileUploadUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to upload file');
    }
    
    const data = await response.json();
    console.log('File uploaded successfully:', data);
    return data.file_path;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Creates a new job for a service
 * @param {string} jobName - Name for the job
 * @param {string} serviceType - Type of service (e.g., 'alphafold')
 * @param {Object} parameters - Service-specific parameters
 * @returns {Promise<Object>} Created job data
 */
export const createServiceJob = async (jobName, serviceType, parameters) => {
  try {
    // Process any file uploads before creating the job
    const processedParams = { ...parameters };
    
    // Handle file parameters by uploading them first
    for (const [key, value] of Object.entries(parameters)) {
      if (value instanceof File) {
        console.log(`Uploading ${key} file:`, value.name);
        const filePath = await uploadFile(value);
        processedParams[key] = filePath;
      }
    }
    
    console.log(`Creating ${serviceType} job with parameters:`, processedParams);
    
    const response = await fetch(endpoints.servicesJobsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_name: jobName,
        service_type: serviceType,
        parameters: processedParams
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to create ${serviceType} job`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error creating ${serviceType} job:`, error);
    throw error;
  }
};

/**
 * Fetches the status of a specific job
 * @param {string} jobId - ID of the job to check
 * @returns {Promise<Object>} Job status data
 */
export const fetchJobStatus = async (jobId) => {
  try {
    const response = await fetch(endpoints.servicesJobStatusUrl(jobId));
    if (!response.ok) {
      throw new Error('Failed to fetch job status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching job status:', error);
    throw error;
  }
};

/**
 * Fetches all jobs for a specific service type
 * @param {string} serviceType - Type of service (e.g., 'alphafold')
 * @returns {Promise<Array>} List of jobs for the service
 */
export const fetchServiceJobs = async (serviceType) => {
  try {
    const url = new URL(endpoints.servicesJobsUrl);
    if (serviceType) {
      url.searchParams.append('service_type', serviceType);
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs for ${serviceType || 'all services'}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching jobs for ${serviceType || 'all services'}:`, error);
    throw error;
  }
};

/**
 * Deletes a specific job
 * @param {string} jobId - ID of the job to delete
 * @returns {Promise<Object>} Response with status and message
 */
export const deleteJob = async (jobId) => {
  try {
    const response = await fetch(endpoints.servicesJobStatusUrl(jobId), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete job ${jobId}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error deleting job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Download a file from the server
 * @param {string} relativePath - Relative path to the file
 * @returns {Promise<Blob>} Blob containing the file data
 */
export const downloadFile = async (relativePath) => {
  try {
    const downloadUrl = endpoints.fileDownloadUrl(relativePath);
    
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Return the file as a blob
    return await response.blob();
  } catch (error) {
    console.error(`Error downloading file ${relativePath}:`, error);
    throw error;
  }
}; 