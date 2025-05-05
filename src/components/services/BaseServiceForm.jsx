import React, { useState } from 'react';
import { createServiceJob } from '../../utils/servicesApi';

/**
 * BaseServiceForm - A base component for service forms
 * This can be extended for new services by providing service-specific fields
 */
const BaseServiceForm = ({
  serviceType,
  serviceName,
  serviceDescription,
  parameterFields,
  validateParameters = () => null,
  defaultJobName = '',
  onJobSubmitted = null,
}) => {
  const [jobName, setJobName] = useState(defaultJobName);
  const [parameters, setParameters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Handle job submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!jobName.trim()) {
      setError('Job name is required');
      return;
    }

    // Validate service-specific parameters
    const errors = validateParameters(parameters);
    if (errors && Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    
    try {
      const result = await createServiceJob(jobName, serviceType, parameters);
      console.log(`${serviceName} job created:`, result);
      setSuccess(`Job "${jobName}" successfully created with ID: ${result.job_id}`);
      
      // Reset form
      setJobName('');
      setParameters({});
      
      // Notify parent component about successful job submission
      if (onJobSubmitted && result.job_id) {
        onJobSubmitted(result.job_id);
      }
    } catch (err) {
      console.error(`Error creating ${serviceName} job:`, err);
      setError(err.message || `Failed to create ${serviceName} job. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle parameter change
  const handleParameterChange = (name, value) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field if it exists
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{serviceName}</h2>
        <p className="text-gray-600 dark:text-gray-400">
          {serviceDescription}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {success && !onJobSubmitted && (
        <div className="mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
          <p className="font-bold">Success</p>
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="jobName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Job Name
          </label>
          <input
            type="text"
            id="jobName"
            className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter a name for this job"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            required
          />
        </div>

        {/* Render parameter fields */}
        {parameterFields?.map((field) => {
          const error = validationErrors[field.name];
          
          switch (field.type) {
            case 'textarea':
              return (
                <div key={field.name}>
                  <label 
                    htmlFor={field.name} 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {field.label}
                  </label>
                  <textarea
                    id={field.name}
                    rows={field.rows || 4}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${field.className || ''} ${
                      error ? 'border-red-500' : ''
                    }`}
                    placeholder={field.placeholder}
                    value={parameters[field.name] || ''}
                    onChange={(e) => handleParameterChange(field.name, e.target.value)}
                    required={field.required}
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                  {field.helpText && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                  )}
                </div>
              );
              
            case 'select':
              return (
                <div key={field.name}>
                  <label 
                    htmlFor={field.name} 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {field.label}
                  </label>
                  <select
                    id={field.name}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      error ? 'border-red-500' : ''
                    }`}
                    value={parameters[field.name] || ''}
                    onChange={(e) => handleParameterChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    <option value="">{field.placeholder || 'Select an option'}</option>
                    {field.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                  {field.helpText && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                  )}
                </div>
              );
              
            case 'checkbox':
              return (
                <div key={field.name} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={field.name}
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                      checked={parameters[field.name] || false}
                      onChange={(e) => handleParameterChange(field.name, e.target.checked)}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={field.name} className="font-medium text-gray-700 dark:text-gray-300">
                      {field.label}
                    </label>
                    {field.helpText && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                    )}
                  </div>
                </div>
              );
              
            // Default to text input
            default:
              return (
                <div key={field.name}>
                  <label 
                    htmlFor={field.name} 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {field.label}
                  </label>
                  <input
                    type={field.type || 'text'}
                    id={field.name}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      error ? 'border-red-500' : ''
                    }`}
                    placeholder={field.placeholder}
                    value={parameters[field.name] || ''}
                    onChange={(e) => handleParameterChange(field.name, e.target.value)}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                  {field.helpText && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                  )}
                </div>
              );
          }
        })}

        <div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 rounded-lg text-white font-medium ${
              loading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting Job...
              </div>
            ) : (
              `Submit ${serviceName} Job`
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BaseServiceForm; 