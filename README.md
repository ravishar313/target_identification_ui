# Target Identification UI

## Overview

Target Identification UI is a web application designed to streamline the process of identifying and analyzing potential drug targets for specific diseases. The application provides a step-by-step workflow that guides researchers through the process of disease analysis, target identification, structure filtering, and report generation. It now includes additional modules for lead identification, lead optimization, PCC evaluation, and AI chat assistants.

## Technology Stack

- **Frontend**: React 19.0.0, built with Vite
- **UI Framework**: TailwindCSS 3.3.0 with typography plugin
- **PDF Generation**: html2pdf.js
- **Markdown Support**: react-markdown with remark-gfm
- **Molecular Visualization**: molstar 4.13.0
- **AI Assistants**: Integration with TxGemma and PyMol chat interfaces

## Application Structure

The application is structured as a single-page React application with multiple module workflows:

### Target Identification Module
1. **Disease Input**: Select or create a project with a disease to analyze
2. **Disease Expert Analysis**: Analyze the disease and find similar diseases
3. **Target Filtering**: Identify and filter potential therapeutic targets
4. **PDB Filtering**: Filter protein structures for the selected targets, now with molecular visualization
5. **Research Report**: Generate a comprehensive research report

### Lead Identification Module
1. **Project PDB Selection**: Select a project and associated PDB structure
2. **Ligand Design**: Design and analyze potential lead compounds
3. **Review Lead Characteristics**: Review and filter lead compounds based on properties

### Lead Optimization Module
Provides tools for optimizing lead compounds identified in the previous phase.

### PCC Evaluation Module
Evaluates protein-compound complexes and provides detailed analysis reports.

### AI Assistants
- **PyMol Chat**: AI-powered assistant for molecular visualization and analysis
- **TxGemma Chat**: Advanced conversational assistant for therapeutic research

### Services Page
Provides access to additional computational tools and services.

### Directory Structure

```
target_identification_ui/
├── src/                     # Source code directory
│   ├── components/          # React components
│   │   ├── DiseaseInput.jsx           # Project creation and disease input
│   │   ├── DiseaseExpertAnalysis.jsx  # Similar disease analysis
│   │   ├── TargetFiltering.jsx        # Target identification and filtering
│   │   ├── PDBFiltering.jsx           # Protein structure filtering
│   │   ├── PDBViewer.jsx              # Component for 3D protein visualization
│   │   ├── PDBSecondaryAndBindingSite.jsx # Secondary structure and binding site analysis
│   │   ├── ResearchReport.jsx         # Report generation component
│   │   ├── ProjectPDBSelection.jsx    # Project and PDB selection component
│   │   ├── LigandDesign.jsx           # Design and analysis of lead compounds
│   │   ├── ReviewLeadCharacteristics.jsx # Review properties of designed leads
│   │   ├── PyMolChat.jsx              # PyMol-based molecular visualization chat
│   │   ├── TxGemmaChat.jsx            # TxGemma-powered research assistant
│   │   ├── CharacteristicsDisplay.jsx # Display compound characteristics
│   │   └── layout/                    # Layout components
│   ├── constants/          # Application constants
│   │   └── api.js          # API endpoint definitions
│   ├── utils/              # Utility functions
│   │   └── csvExport.js    # Functionality for exporting data to CSV
│   ├── data/               # Static data files
│   │   └── DiseaseList.json # List of diseases for autocomplete
│   ├── pages/              # Page components for each module
│   │   ├── TargetIdentification/   # Target identification workflow pages
│   │   ├── LeadIdentification/     # Lead identification workflow pages
│   │   ├── LeadOptimization/       # Lead optimization workflow pages
│   │   ├── PCCEvaluation/          # PCC evaluation workflow pages
│   │   ├── PyMolChat/              # PyMol chat assistant pages
│   │   ├── TxGemmaChat/            # TxGemma chat assistant pages
│   │   └── Services/               # Services module pages
│   ├── assets/             # Static assets (images, icons)
│   ├── App.jsx             # Main application component
│   ├── App.css             # Application-specific styles
│   ├── index.css           # Global styles
│   └── main.jsx            # Application entry point
├── public/                 # Static public assets
├── dist/                   # Production build output
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration for Tailwind
├── eslint.config.js        # ESLint configuration
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
- `/design_leads`: Designs potential lead compounds
- `/lead_status`: Checks the status of lead design jobs
- `/get_molecule_properties`: Fetches properties for designed molecules
- `/tx_gemma_query_stream`: Streams responses from the TxGemma assistant

## Module Details

### 1. Target Identification

#### Disease Input (DiseaseInput.jsx)

This component allows users to:
- Create a new project with a specific disease
- Select from existing projects
- Search for diseases with autocomplete
- View recent searches and random disease suggestions

Features:
- Autocomplete suggestions from a predefined disease list
- Recently searched diseases stored in localStorage
- Random disease suggestions for exploration
- Project management capabilities (very basic only project name for now mapped across the pipeline)

#### Disease Expert Analysis (DiseaseExpertAnalysis.jsx)

This component:
- Analyzes the selected disease
- Identifies similar diseases that could provide insights
- Displays rationales for disease similarity
- There is export functionality for the disease expert analysis report

The analysis process typically takes 30-40 seconds and provides detailed information about similar diseases and why they're relevant to the research.

#### Target Filtering (TargetFiltering.jsx)

This component:
- Identifies potential therapeutic targets based on disease analysis
- Provides filtering and sorting capabilities
- Categorizes targets as "good" or "bad" based on analysis
- Displays detailed information about each target
- Allows CSV export of target data

Features:
- Search functionality for targets
- Filtering by "good" or "bad" target status
- Sortable columns
- Pagination for browsing many targets
- Detailed view for selected targets with supporting evidence
- Data export functionality

#### PDB Filtering (PDBFiltering.jsx)

This component:
- Identifies relevant protein structures for selected targets
- Provides filtering tools for structure selection
- Displays detailed structural information
- Enables 3D visualization of protein structures with PDBViewer

The filtering process helps researchers find the most relevant protein structures for further analysis or docking studies.

#### Research Report (ResearchReport.jsx)

This component:
- Generates a comprehensive research report
- Summarizes findings from all previous steps
- Provides export functionality (PDF)

### 2. Lead Identification

#### Project PDB Selection (ProjectPDBSelection.jsx)

This component:
- Allows users to select an existing project
- Displays available PDB structures for the selected project
- Provides detailed information about each structure

#### Ligand Design (LigandDesign.jsx)

This component:
- Designs potential lead compounds for selected targets
- Provides visualization of designed molecules
- Allows filtering and sorting of lead compounds
- Displays detailed properties for each lead

#### Review Lead Characteristics (ReviewLeadCharacteristics.jsx)

This component:
- Displays detailed characteristics of designed leads
- Provides filtering tools based on drug-like properties
- Enables selection of promising leads for further optimization

### 3. Lead Optimization
WIP
Provides tools for:
- Structure-based optimization of lead compounds
- Analysis of binding affinity and interactions
- Modification of lead compounds to improve properties

### 4. PCC Evaluation
WIP
Provides tools for:
- Evaluation of protein-compound complexes
- Analysis of binding modes and interactions
- Generation of detailed evaluation reports

### 5. AI Assistants

#### PyMol Chat (PyMolChat.jsx)

This component:
- Provides an AI-powered chat interface for molecular visualization
- Allows natural language queries about structures
- Generates PyMol commands based on user queries
- Provides explanations of structural features

#### TxGemma Chat (TxGemmaChat.jsx)

This component:
- Provides an advanced conversational interface for therapeutic research
- Answers complex queries related to drug discovery
- Provides detailed explanations with references
- Supports streaming responses for real-time feedback

### 6. Services

Provides access to:
- Additional computational tools
- Data analysis services
- External integrations

## User Interface

The application features a modern, clean interface with:
- Progressive disclosure of information
- Step-based navigation with progress tracking
- Responsive design for different screen sizes
- Loading indicators for asynchronous operations
- Error handling with retry options
- Dark mode support
- Module-based organization with sidebar navigation

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

The Target Identification UI provides a structured approach to the drug discovery process, from target identification through lead optimization, guiding researchers through complex processes with an intuitive interface. The application integrates with specialized backends that perform detailed analysis to help identify promising therapeutic targets and lead compounds for various diseases.

# Workflow Assistant

## Overview

The application includes a Workflow Assistant feature that provides context-aware help and actions for users. The assistant appears as a chat interface in a sidebar that can be toggled on any workflow page.

## Features

- Context-aware assistance based on the current workflow, step, and view
- Ability to execute actions directly from the chat interface
- Hierarchical context tracking that updates as the user navigates through the workflow

## API Integration

The Workflow Assistant integrates with a backend API:

```
POST /assistant/chat
```

**Request:**
```json
{
  "message": "User message text",
  "context": {
    "workflow": "lead-identification",
    "currentStep": "ligand-design",
    "currentView": "grid",
    "data": {
      // Current workflow data
    },
    "availableActions": [
      {
        "id": "action-id",
        "type": "ACTION_TYPE",
        "label": "Action Label",
        "payload": {
          // Action-specific data
        }
      }
    ]
  }
}
```

**Response:**
```json
{
  "message": "Assistant's response text",
  "action": null | {
    "id": "unique-action-id",
    "type": "ACTION_TYPE",
    "label": "Action button label",
    "payload": {
      // Action-specific payload
    }
  }
}
```

## Supported Action Types

The assistant can execute various actions:

- `NAVIGATE_STEP` - Navigate to a different step in the workflow
- `CHANGE_VIEW` - Change the current view (e.g., grid, summary, similarity)
- `EXECUTE_FILTER` - Apply filter to data
- `EXECUTE_SORT` - Sort data by field
- `EXECUTE_SEARCH` - Search within the current data
- `EXECUTE_API_CALL` - Execute a backend API call
- `SELECT_ITEM` - Select an item (e.g., a molecule)
- `SUBMIT_FORM` - Submit form data
- `RESET_STATE` - Reset component state

## Usage

To use the Workflow Assistant in a new workflow page, wrap your component with the `WorkflowContextProvider`:

```jsx
<WorkflowContextProvider
  workflow="workflow-name"
  currentStep="current-step-name"
  currentView="current-view-name"
  data={yourData}
  availableActions={yourAvailableActions}
>
  {/* Your workflow content */}
  <WorkflowAssistant />
</WorkflowContextProvider>
``` 