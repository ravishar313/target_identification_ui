import React from 'react';

/**
 * Component for selecting a service
 * @param {Object} props - Props
 * @param {Array} props.services - List of available services
 * @param {string} props.selectedService - Currently selected service ID
 * @param {Function} props.onServiceSelect - Function to call when a service is selected
 */
const ServiceSelector = ({ services, selectedService, onServiceSelect }) => {
  return (
    <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Available Services</h2>
      <div className="space-y-2">
        {services.map((service) => (
          <button
            key={service.id}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              selectedService === service.id
                ? 'bg-blue-100 border-l-4 border-blue-600 dark:bg-gray-700 dark:border-blue-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => onServiceSelect(service.id)}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">{service.icon || '🧪'}</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{service.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{service.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ServiceSelector; 