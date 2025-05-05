import React, { useState, useEffect } from 'react';
import { fetchServiceJobs } from '../../utils/servicesApi';

/**
 * Component that displays a list of jobs for a specific service
 * @param {Object} props - Props
 * @param {string} props.serviceType - Type of service to show jobs for
 * @param {Function} props.onViewJob - Function to call when viewing a job's details
 * @param {string} props.selectedJobId - Currently selected job ID
 */
const ServiceJobsList = ({ serviceType, onViewJob, selectedJobId }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);

  useEffect(() => {
    if (!serviceType) return;

    const loadJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const jobsData = await fetchServiceJobs(serviceType);
        setJobs(jobsData);
      } catch (err) {
        console.error(`Error loading ${serviceType} jobs:`, err);
        setError(`Failed to load jobs for ${serviceType}`);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
    // Set up polling for job updates every 2 minutes
    const intervalId = setInterval(loadJobs, 120000);
    
    return () => clearInterval(intervalId);
  }, [serviceType]);

  const toggleJobExpand = (jobId) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
    }
  };

  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Get status color based on job status
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Recent Jobs</h2>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Recent Jobs</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300 py-4">No jobs found for this service.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div 
              key={job.job_id} 
              className={`border rounded-lg overflow-hidden ${
                selectedJobId === job.job_id 
                  ? 'border-blue-500 shadow-md' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div 
                className={`p-3 cursor-pointer ${
                  selectedJobId === job.job_id 
                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                } flex justify-between items-center`}
                onClick={() => toggleJobExpand(job.job_id)}
              >
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{job.job_name}</h3>
                  <div className="flex items-center mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                </div>
                <div className="text-lg">
                  {expandedJob === job.job_id ? '▼' : '▶'}
                </div>
              </div>
              
              {expandedJob === job.job_id && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Job ID:</p>
                      <p className="font-mono">{job.job_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Progress:</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-1">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${job.progress || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs mt-1">{job.progress_message || `${job.progress || 0}%`}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewJob(job.job_id);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {loading && jobs.length > 0 && (
        <div className="flex justify-center py-2 mt-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
        </div>
      )}
    </div>
  );
};

export default ServiceJobsList; 