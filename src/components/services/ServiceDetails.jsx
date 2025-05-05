import React, { useState, useEffect } from 'react';
import { fetchJobStatus, deleteJob, FILE_BASE_PATH, downloadFile } from '../../utils/servicesApi';
import { formatDateDisplay, calculateTimeElapsed } from '../../utils/dateUtils';

/**
 * Component to display detailed information about a specific service job
 * @param {Object} props - Component props
 * @param {string} props.jobId - ID of the job to display
 * @param {Function} props.onClose - Function to call when closing the details view
 */
const ServiceDetails = ({ jobId, onClose }) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const loadJobData = async () => {
      try {
        setLoading(true);
        setError(null);
        const jobData = await fetchJobStatus(jobId);
        setJob(jobData);
      } catch (err) {
        console.error(`Error loading job ${jobId}:`, err);
        setError(`Failed to load job details for ${jobId}`);
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
    // Set up polling for job updates every 2 minutes
    const intervalId = setInterval(loadJobData, 120000);
    
    return () => clearInterval(intervalId);
  }, [jobId]);

  // Calculate job duration
  const getJobDuration = () => {
    if (!job) return 'N/A';
    return calculateTimeElapsed(job.started_at, job.completed_at);
  };

  // Handle job deletion
  const handleDeleteJob = async () => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await deleteJob(jobId);
      alert(response.message || 'Job deleted successfully');
      onClose(); // Close the details view after successful deletion
    } catch (err) {
      console.error(`Error deleting job ${jobId}:`, err);
      alert(`Failed to delete job: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle file download
  const handleDownload = async (filePath, fileName) => {
    try {
      setDownloading(true);
      
      // Get the proper file name from the path if not provided
      const defaultFileName = fileName || filePath.split('/').pop() || 'download';
      
      // Download the file as a blob
      const fileBlob = await downloadFile(filePath);
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', defaultFileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Error downloading file:`, err);
      alert(`Failed to download file: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !job) {
    return (
      <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Job Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Job Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{job.job_name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ID: {job.job_id} | Service: {job.service_type.charAt(0).toUpperCase() + job.service_type.slice(1)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleDeleteJob}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
            title="Delete job"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`mb-6 p-4 rounded-lg ${
        job.status === 'pending' ? 'bg-yellow-50 border border-yellow-200' : 
        job.status === 'running' ? 'bg-blue-50 border border-blue-200' : 
        job.status === 'completed' ? 'bg-green-50 border border-green-200' : 
        'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className={`inline-flex items-center justify-center p-2 rounded-full mr-3 ${
              job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
              job.status === 'running' ? 'bg-blue-100 text-blue-800' : 
              job.status === 'completed' ? 'bg-green-100 text-green-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {job.status === 'pending' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )}
              {job.status === 'running' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
              {job.status === 'completed' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {job.status === 'failed' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Status: {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {job.progress_message || `${job.progress || 0}% complete`}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Duration: {getJobDuration()}</p>
          </div>
        </div>

        {/* Progress bar */}
        {(job.status === 'running' || job.status === 'pending') && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${job.progress || 0}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px space-x-8">
          <button
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'parameters'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('parameters')}
          >
            Parameters
          </button>
          {job.status === 'completed' && job.result_data && (
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
          )}
          {job.error && (
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'error'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('error')}
            >
              Error
            </button>
          )}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Started</h3>
                <p className="text-gray-900 dark:text-white">{formatDateDisplay(job.started_at)}</p>
              </div>
              {job.completed_at && (
                <div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed</h3>
                  <p className="text-gray-900 dark:text-white">{formatDateDisplay(job.completed_at)}</p>
                </div>
              )}
            </div>
            
            {job.status === 'completed' && job.result_path && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Result Files</h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white mb-2">Download Result:</p>
                  <button 
                    onClick={() => handleDownload(job.result_path)}
                    disabled={downloading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {downloading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download File
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Parameters tab */}
        {activeTab === 'parameters' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Input Parameters</h3>
              {job.parameters && Object.keys(job.parameters).length > 0 ? (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-3">
                    {Object.entries(job.parameters).map(([key, value]) => (
                      <div key={key} className="sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2 break-all">
                          {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No input parameters provided.</p>
              )}
            </div>
            
            {job.parameters_used && Object.keys(job.parameters_used).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Default Parameters Used</h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-3">
                    {Object.entries(job.parameters_used).map(([key, value]) => (
                      <div key={key} className="sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2 break-all">
                          {Array.isArray(value) 
                            ? value.join(', ')
                            : typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : value.toString()}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results tab */}
        {activeTab === 'results' && job.result_data && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Job Results</h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              {typeof job.result_data === 'object' ? (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3">
                  {Object.entries(job.result_data).map(([key, value]) => (
                    <div key={key} className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2 break-all">
                        {typeof value === 'string' && (value.endsWith('.pdb') || value.endsWith('.cif') || value.endsWith('.txt') || value.endsWith('.json')) ? (
                          <button 
                            onClick={() => handleDownload(value, value.split('/').pop())}
                            disabled={downloading}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {downloading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Download {value.split('/').pop()}
                              </>
                            )}
                          </button>
                        ) : (
                          (typeof value === 'object' 
                            ? JSON.stringify(value, null, 2)
                            : value.toString())
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-gray-900 dark:text-white">{job.result_data.toString()}</p>
              )}
            </div>
          </div>
        )}

        {/* Error tab */}
        {activeTab === 'error' && job.error && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Details</h3>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-400 whitespace-pre-wrap">{job.error}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Loading indicator when polling for updates */}
      {loading && job && (
        <div className="flex justify-center mt-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {/* Delete confirmation feedback */}
      {isDeleting && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <p className="text-gray-900 dark:text-white mb-4">Deleting job...</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetails; 