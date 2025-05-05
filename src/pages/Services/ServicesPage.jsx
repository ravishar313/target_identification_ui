import { useState, useEffect } from 'react';
import ServiceSelector from '../../components/services/ServiceSelector';
import ServiceJobsList from '../../components/services/ServiceJobsList';
import AlphafoldService from '../../components/services/AlphafoldService';
import ServiceDetails from '../../components/services/ServiceDetails';
import { fetchAvailableServices, fetchJobStatus } from '../../utils/servicesApi';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [showNewJobForm, setShowNewJobForm] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        const availableServices = await fetchAvailableServices();
        setServices(availableServices);
        
        // Set default selected service if available
        if (availableServices.length > 0) {
          setSelectedService(availableServices[0].id);
        }
      } catch (err) {
        console.error('Error loading services:', err);
        setError('Failed to load available services. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      const loadJobDetails = async () => {
        try {
          const jobData = await fetchJobStatus(selectedJobId);
          setJobDetails(jobData);
          setShowNewJobForm(false);
        } catch (err) {
          console.error(`Error loading job details for ${selectedJobId}:`, err);
          // If there's an error, go back to the form
          setSelectedJobId(null);
          setShowNewJobForm(true);
        }
      };
      
      loadJobDetails();
    }
  }, [selectedJobId]);

  const handleCreateNewJob = () => {
    setSelectedJobId(null);
    setJobDetails(null);
    setShowNewJobForm(true);
  };

  const handleViewJob = (jobId) => {
    setSelectedJobId(jobId);
    setShowNewJobForm(false);
  };

  const handleServiceChange = (serviceId) => {
    setSelectedService(serviceId);
    handleCreateNewJob(); // Reset to form view when service changes
  };

  // Render service-specific component based on selected service
  const renderServiceComponent = () => {
    if (!selectedService) return null;

    // Add more service components as they are implemented
    switch (selectedService) {
      case 'alphafold':
        return <AlphafoldService onJobSubmitted={handleViewJob} />;
      default:
        return (
          <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800">
            <p className="text-gray-700 dark:text-gray-300">
              Service implementation coming soon.
            </p>
          </div>
        );
    }
  };

  // Handle rendering the main content
  const renderMainContent = () => {
    if (selectedJobId && jobDetails) {
      return (
        <ServiceDetails 
          jobId={selectedJobId} 
          onClose={handleCreateNewJob} 
        />
      );
    }
    
    if (showNewJobForm) {
      return renderServiceComponent();
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Run computational biology services
          </p>
        </div>
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Run computational biology services
          </p>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex-1 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Services</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Run computational biology services
        </p>
      </div>

      {services.length > 0 ? (
        <div className="space-y-6">
          {/* Service tabs at the top */}
          <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-4">
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex -mb-px space-x-8 overflow-x-auto">
                {services.map((service) => (
                  <button
                    key={service.id}
                    className={`py-4 px-1 border-b-2 font-medium flex items-center whitespace-nowrap ${
                      selectedService === service.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                    onClick={() => handleServiceChange(service.id)}
                  >
                    <span className="text-xl mr-2">{service.icon || '🧪'}</span>
                    {service.name}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-between items-center px-2">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {services.find(s => s.id === selectedService)?.name || 'Service'}
              </h2>
              
              <div>
                {/* Only show Create New Job button when viewing job details or jobs list, not when already on the form */}
                {selectedJobId && (
                  <button
                    onClick={handleCreateNewJob}
                    className="px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Create New Job
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar with jobs list */}
            <div className="lg:col-span-1">
              <ServiceJobsList 
                serviceType={selectedService} 
                onViewJob={handleViewJob}
                selectedJobId={selectedJobId}
              />
            </div>
            
            {/* Main content */}
            <div className="lg:col-span-3">
              {renderMainContent()}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">No Services Available: </strong>
          <span className="block sm:inline">There are currently no services available.</span>
        </div>
      )}
    </div>
  );
};

export default ServicesPage; 