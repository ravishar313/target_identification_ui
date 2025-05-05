import { endpoints } from '../constants/api';

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
      // Additional services can be added here as they become available
    ];
  } catch (error) {
    console.error('Error fetching services:', error);
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
    const response = await fetch(endpoints.servicesJobsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_name: jobName,
        service_type: serviceType,
        parameters
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