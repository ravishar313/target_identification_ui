import { useState, useRef, useEffect } from 'react';
import PDBViewer from '../../components/PDBViewer';
import PDBSecondaryAndBindingSite from '../../components/PDBSecondaryAndBindingSite';

const PDBViewerPage = () => {
  const [pdbId, setPdbId] = useState('');
  const [displayPdbId, setDisplayPdbId] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState('cartoon'); // cartoon, surface, ball-and-stick, ribbon
  const iframeRef = useRef(null);

  // Example PDB IDs for quick selection
  const examplePdbIds = [
    { id: '3CLN', description: 'Calmodulin' },
    { id: '1A52', description: 'DNA Polymerase' },
    { id: '4CPA', description: 'Carboxypeptidase A' },
    { id: '6VXX', description: 'SARS-CoV-2 Spike Protein' },
    { id: '1GFL', description: 'Green Fluorescent Protein' },
  ];

  // Handle searching for a PDB ID
  const handleSearch = (e) => {
    e.preventDefault();
    if (pdbId.trim()) {
      setDisplayPdbId(pdbId);
    }
  };

  // Clear the current viewer
  const handleClear = () => {
    setPdbId('');
    setDisplayPdbId('');
    
    // Reset iframe source
    if (iframeRef.current) {
      iframeRef.current.src = 'https://molstar.org/viewer/?hide-controls=0&snapshot-url-type=molx';
    }
  };

  // Toggle full-screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Apply visualization setting
  const applyViewMode = (mode) => {
    setViewMode(mode);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">PDB Viewer</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Search Section */}
          <div className="w-full md:w-1/3">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Search PDB</h3>
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={pdbId}
                  onChange={(e) => setPdbId(e.target.value.toUpperCase())}
                  placeholder="Enter PDB ID (e.g., 1A52)"
                  className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                  id="pdb-id-input"
                  name="pdbId"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md"
                >
                  Search
                </button>
              </form>
              
              {/* Clear button */}
              {displayPdbId && (
                <button
                  onClick={handleClear}
                  className="mt-2 w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Viewer
                </button>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Quick Examples</h3>
              <div className="grid grid-cols-1 gap-2">
                {examplePdbIds.map((example) => (
                  <button
                    key={example.id}
                    onClick={() => {
                      setPdbId(example.id);
                      setDisplayPdbId(example.id);
                    }}
                    className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 rounded p-2 text-left"
                  >
                    <span className="font-medium text-blue-600 dark:text-blue-400">{example.id}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{example.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Visualization Section */}
          <div className="w-full md:w-2/3">
            {displayPdbId ? (
              <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4 overflow-auto' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {`PDB: ${displayPdbId}`}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {/* View Mode Buttons */}
                    <div className="hidden md:flex space-x-1">
                      <button
                        onClick={() => applyViewMode('cartoon')}
                        className={`p-2 text-xs rounded ${viewMode === 'cartoon' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      >
                        Cartoon
                      </button>
                      <button
                        onClick={() => applyViewMode('surface')}
                        className={`p-2 text-xs rounded ${viewMode === 'surface' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      >
                        Surface
                      </button>
                      <button
                        onClick={() => applyViewMode('ball-and-stick')}
                        className={`p-2 text-xs rounded ${viewMode === 'ball-and-stick' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      >
                        Ball & Stick
                      </button>
                      <button
                        onClick={() => applyViewMode('ribbon')}
                        className={`p-2 text-xs rounded ${viewMode === 'ribbon' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      >
                        Ribbon
                      </button>
                    </div>
                    
                    {/* Full Screen Button */}
                    <button
                      onClick={toggleFullScreen}
                      className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                      aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
                    >
                      {isFullScreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* PDB Viewer for database IDs */}
                <PDBViewer 
                  pdbId={displayPdbId} 
                  width="100%" 
                  height={isFullScreen ? "80vh" : "500px"}
                >
                  {/* Links below viewer */}
                  <div className="mt-3 flex justify-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                    <a
                      href={`https://www.rcsb.org/structure/${displayPdbId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      RCSB PDB
                    </a>
                    <a
                      href={`https://www.ebi.ac.uk/pdbe/entry/pdb/${displayPdbId.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      PDBe
                    </a>
                    <a
                      href={`https://molstar.org/viewer/?pdb=${displayPdbId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View on Mol*
                    </a>
                  </div>
                </PDBViewer>
                
                {/* Secondary Structure and Binding Site Information */}
                {!isFullScreen && (
                  <div className="mt-6">
                    <PDBSecondaryAndBindingSite pdbId={displayPdbId} isFullScreen={false} />
                  </div>
                )}
                
                {isFullScreen && (
                  <div className="mt-6">
                    <PDBSecondaryAndBindingSite pdbId={displayPdbId} isFullScreen={true} />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No PDB structure loaded</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Enter a PDB ID to start.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDBViewerPage; 