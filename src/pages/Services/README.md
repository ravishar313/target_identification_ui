# Services Module

The Services module provides a unified interface for computational biology services like AlphaFold, MolMim, ADMET, eTox, and more. Each service has a consistent user interface for submitting jobs, tracking progress, and viewing results.

## Architecture

The Services module follows a component-based architecture:

- `ServicesPage`: Main container that handles service selection and rendering
- `ServiceSelector`: UI for selecting available services
- `ServiceJobsList`: Displays and manages jobs for a selected service
- `ServiceDetails`: Shows detailed information about a specific job
- `BaseServiceForm`: Reusable form component for service job submission
- `[ServiceName]Service`: Service-specific components (e.g., `AlphafoldService`)

## API Integration

Service API interactions are handled through utility functions in `src/utils/servicesApi.js`:

- `fetchAvailableServices()`: Get list of available services
- `createServiceJob(jobName, serviceType, parameters)`: Create a new job
- `fetchJobStatus(jobId)`: Get status of a specific job
- `fetchServiceJobs(serviceType)`: Get all jobs for a service type

## Adding a New Service

To add a new service to the platform:

1. **Update available services endpoint**: Ensure the service is available via the `/services/list` endpoint.

2. **Create a service-specific component** in `src/components/services/[ServiceName]Service.jsx`:

```jsx
import React from 'react';
import BaseServiceForm from './BaseServiceForm';

const NewService = () => {
  // Validation function for service parameters
  const validateParameters = (params) => {
    const errors = {};
    
    // Add parameter validation logic
    if (!params.paramName) {
      errors.paramName = 'This parameter is required';
    }
    
    return errors;
  };

  // Define parameter fields
  const parameterFields = [
    {
      name: 'paramName',
      label: 'Parameter Label',
      type: 'text', // or 'textarea', 'select', 'checkbox', etc.
      placeholder: 'Enter parameter value',
      helpText: 'Description of the parameter',
      required: true
    }
    // Add more parameters as needed
  ];

  return (
    <BaseServiceForm
      serviceType="new_service_type" // Must match the API's service_type
      serviceName="New Service Display Name"
      serviceDescription="Description of what this service does"
      parameterFields={parameterFields}
      validateParameters={validateParameters}
      defaultJobName="New Service Job"
    />
  );
};

export default NewService;
```

3. **Register the service** in `src/pages/Services/ServicesPage.jsx`:

```jsx
import NewService from '../../components/services/NewService';

// Inside the renderServiceComponent function:
switch (selectedService) {
  case 'alphafold':
    return <AlphafoldService />;
  case 'new_service_type': // Match the service's ID
    return <NewService />;
  default:
    // ...
}
```

4. **Test the integration** by creating and monitoring jobs for the new service.

## Customizing the Base Service Form

The `BaseServiceForm` component supports various field types:

- **Text**: Standard text input
- **Textarea**: Multiline text input
- **Select**: Dropdown with options
- **Checkbox**: Boolean toggle
- **Number**: Numeric input with optional min/max/step

Example field configurations:

```jsx
// Text input
{
  name: 'jobTitle',
  label: 'Job Title',
  type: 'text',
  placeholder: 'Enter a title',
  required: true
}

// Textarea
{
  name: 'description',
  label: 'Description',
  type: 'textarea',
  rows: 4,
  placeholder: 'Enter description'
}

// Select/dropdown
{
  name: 'options',
  label: 'Select an option',
  type: 'select',
  options: [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ],
  required: true
}

// Checkbox
{
  name: 'enableFeature',
  label: 'Enable this feature',
  type: 'checkbox',
  helpText: 'Description of what this feature does'
}

// Number input
{
  name: 'quantity',
  label: 'Quantity',
  type: 'number',
  min: 1,
  max: 100,
  step: 1,
  required: true
}
``` 