# Target Identification UI

## Overview

Target Identification UI is a web application designed to streamline the process of identifying and analyzing potential drug targets for specific diseases. The application provides a step-by-step workflow that guides researchers through the process of disease analysis, target identification, structure filtering, and report generation.

## Technology Stack

- **Frontend**: React 19.0.0, built with Vite
- **UI Framework**: TailwindCSS 3.3.0 with typography plugin
- **PDF Generation**: html2pdf.js
- **Markdown Support**: react-markdown with remark-gfm

## Application Structure

The application is structured as a single-page React application with a step-based workflow:

1. **Disease Input**: Select or create a project with a disease to analyze
2. **Disease Expert Analysis**: Analyze the disease and find similar diseases
3. **Target Filtering**: Identify and filter potential therapeutic targets
4. **PDB Filtering**: Filter protein structures for the selected targets
5. **Research Report**: Generate a comprehensive research report

### Directory Structure

```
target_identification_ui/
├── src/                     # Source code directory
│   ├── components/          # React components
│   │   ├── DiseaseInput.jsx           # Project creation and disease input
│   │   ├── DiseaseExpertAnalysis.jsx  # Similar disease analysis
│   │   ├── TargetFiltering.jsx        # Target identification and filtering
│   │   ├── PDBFiltering.jsx           # Protein structure filtering
│   │   ├── ResearchReport.jsx         # Report generation component
│   │   └── StructureExpertAnalysis.jsx # Structure analysis component
│   ├── constants/          # Application constants
│   │   └── api.js          # API endpoint definitions
│   ├── data/               # Static data files
│   │   └── DiseaseList.json # List of diseases for autocomplete
│   ├── assets/             # Static assets (images, icons)
│   ├── App.jsx             # Main application component
│   ├── App.css             # Application-specific styles
│   ├── index.css           # Global styles
│   └── main.jsx            # Application entry point
├── public/                 # Static public assets
├── dist/                   # Production build output
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration for Tailwind
└── vite.config.js          # Vite bundler configuration
```

## API Integration

The application communicates with a backend API running at `http://localhost:8006` with the following endpoints:

- `/create_project`: Creates a new research project
- `/list_projects`: Lists existing research projects
- `/process_disease`: Analyzes a disease and finds similar diseases
- `/get_potential_targets`: Identifies potential therapeutic targets
- `/pdb_filtering`: Filters protein structures for the selected targets
- `/generate_report`: Generates a comprehensive research report

## Workflow Details

### 1. Disease Input (DiseaseInput.jsx)

This component allows users to:
- Create a new project with a specific disease
- Select from existing projects
- Search for diseases with autocomplete
- View recent searches and random disease suggestions

Features:
- Autocomplete suggestions from a predefined disease list
- Recently searched diseases stored in localStorage
- Random disease suggestions for exploration

### 2. Disease Expert Analysis (DiseaseExpertAnalysis.jsx)

This component:
- Analyzes the selected disease
- Identifies similar diseases that could provide insights
- Displays rationales for disease similarity

The analysis process typically takes 30-40 seconds and provides detailed information about similar diseases and why they're relevant to the research.

### 3. Target Filtering (TargetFiltering.jsx)

This component:
- Identifies potential therapeutic targets based on disease analysis
- Provides filtering and sorting capabilities
- Categorizes targets as "good" or "bad" based on analysis
- Displays detailed information about each target

Features:
- Search functionality for targets
- Filtering by "good" or "bad" target status
- Sortable columns
- Pagination for browsing many targets
- Detailed view for selected targets with supporting evidence

### 4. PDB Filtering (PDBFiltering.jsx)

This component:
- Identifies relevant protein structures for selected targets
- Provides filtering tools for structure selection
- Displays detailed structural information

The filtering process helps researchers find the most relevant protein structures for further analysis or docking studies.

### 5. Research Report (ResearchReport.jsx)

This component:
- Generates a comprehensive research report
- Summarizes findings from all previous steps
- Provides export functionality (PDF)

## User Interface

The application features a modern, clean interface with:
- Progressive disclosure of information
- Step-based navigation with progress tracking
- Responsive design for different screen sizes
- Loading indicators for asynchronous operations
- Error handling with retry options

## Data Persistence

The application maintains state throughout the session and persists:
- Project data through the backend API
- Recent searches in localStorage
- Step data in the React component state

## Error Handling

Each step includes comprehensive error handling with:
- User-friendly error messages
- Retry functionality
- Ability to go back to previous steps
- Loading indicators for asynchronous operations

## Conclusion

The Target Identification UI provides a structured approach to disease analysis and target identification, guiding researchers through a complex process with an intuitive interface. The application integrates with a specialized backend that performs detailed analysis to help identify promising therapeutic targets for various diseases. 