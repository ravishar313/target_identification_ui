# PyMol Chat Interface

The PyMol Chat interface provides a user-friendly way to interact with PyMol through natural language commands. This component allows users to control PyMol sessions running on their local systems without needing to know specific PyMol syntax.

## Features

- Natural language interface for PyMol
- Real-time connection status monitoring
- Chat history with command execution details
- Error handling and status reporting

## Usage

### Prerequisites

1. PyMol must be installed and running on the local system
2. The PyMol server API must be running and accessible via the BaseUrl specified in `src/constants/api.js`

### Connection

The interface automatically checks the connection status when it loads. If the connection fails, an error message will be displayed with an option to retry.

### Sending Commands

1. Type your natural language command or question in the input field
2. Click "Send" or press Enter
3. Wait for the response
4. The response will include:
   - The natural language response
   - The PyMol commands that were executed
   - The execution status of each command

### Example Commands

- "Load protein 1CRN and display it as cartoon"
- "Show the binding site of the ligand"
- "Highlight residues within 5 angstroms of the active site"
- "Color the protein by secondary structure"

## API Endpoints

API endpoints are defined in `src/constants/api.js`:

### Status Check
- `endpoints.pymolChatStatusUrl`
- Returns the current connection status with PyMol

### Send Query
- `endpoints.pymolChatQueryUrl`
- Body: `{ "query": "Your natural language query" }`
- Returns the processed commands and results

## Integration

This component can be integrated into other parts of the application by importing and using the `PyMolChat` component:

```jsx
import PyMolChat from '../../components/PyMolChat';

// Then in your component:
<PyMolChat />
``` 