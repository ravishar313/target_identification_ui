import React, { useState, useEffect } from 'react';
import { endpoints } from '../constants/api';
import { exportToCSV } from '../utils/csvExport';
import PDBViewer from './PDBViewer';

const PDBFiltering = ({ onNext, onBack, data, setData, setIsLoading }) => {
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredPDBs, setFilteredPDBs] = useState([]);
  const [selectedPDB, setSelectedPDB] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGoodStructures, setShowGoodStructures] = useState('all'); // 'all', 'good', 'bad'
  const [sortBy, setSortBy] = useState('pdb_id'); // 'pdb_id', 'target_name', etc.
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'
  // State for PDB visualization
  const [selectedViewerPDB, setSelectedViewerPDB] = useState(null);
  // State for full-screen mode
  const [isFullScreen, setIsFullScreen] = useState(false);

  const pdbsPerPage = 10;

  // Function to handle visualizing a PDB
  const handleVisualizeClick = (pdb) => {
    if (selectedViewerPDB && selectedViewerPDB.pdb_id === pdb.pdb_id) {
      // Toggle off if clicking the same one
      setSelectedViewerPDB(null);
      setIsFullScreen(false);
    } else {
      setSelectedViewerPDB(pdb);
      setIsFullScreen(false);
    }
  };

  // Function to toggle full-screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    
    // When entering full-screen, scroll to the viewer
    if (!isFullScreen && selectedViewerPDB) {
      setTimeout(() => {
        const viewerElement = document.getElementById('pdb-viewer-container');
        if (viewerElement) {
          viewerElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const fetchFilteredPDBs = async () => {
    if (!data.projectId) {
      setError('Missing project ID. Please go back and complete previous steps.');
      return;
    }

    setIsLocalLoading(true);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoints.pdbFilteringUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: data.projectId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch filtered PDBs');
      }

      const responseData = await response.json();
      setFilteredPDBs(responseData.filtered_pdbs || []);
      
      // Update global state
      setData({
        ...data,
        structures: responseData.filtered_pdbs || []
      });
    } catch (err) {
      console.error('Error fetching filtered PDBs:', err);
      setError(err.message || 'An error occurred while fetching filtered PDBs');
    } finally {
      setIsLocalLoading(false);
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    const headers = [
      { label: 'PDB ID', key: 'pdb_id' },
      { label: 'Target Name', key: 'target_name' },
      { label: 'UniProt ID', key: 'uniprot_id' },
      { label: 'Target ID', key: 'target_id' },
      { label: 'Gene Name', key: 'gene_name' },
      { label: 'Method', key: 'method' },
      { label: 'Good Structure', key: 'good_structure' },
      { label: 'Function', key: 'function' },
      { label: 'Biological Class', key: 'bioclass' },
      { label: 'PubMed ID', key: 'pubmed_id' },
      { label: 'Abstract', key: 'abstract' },
      { label: 'Selection Justification', key: 'justification_for_pdb_selection' }
    ];
    
    exportToCSV(filteredPDBs, headers, `${data.disease}_filtered_pdbs.csv`);
  };

  // Filter and sort PDBs
  const getFilteredAndSortedPDBs = () => {
    let filtered = [...filteredPDBs];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(pdb => 
        pdb.pdb_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pdb.target_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pdb.gene_name && pdb.gene_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        pdb.uniprot_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply good/bad structure filter
    if (showGoodStructures === 'good') {
      filtered = filtered.filter(pdb => pdb.good_structure);
    } else if (showGoodStructures === 'bad') {
      filtered = filtered.filter(pdb => !pdb.good_structure);
    }
    
    // Sort PDBs
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'pdb_id') {
        comparison = a.pdb_id.localeCompare(b.pdb_id);
      } else if (sortBy === 'target_name') {
        comparison = a.target_name.localeCompare(b.target_name);
      } else if (sortBy === 'target_id') {
        comparison = a.target_id.localeCompare(b.target_id);
      } else if (sortBy === 'method') {
        comparison = a.method?.localeCompare(b.method || '') || 0;
      } else if (sortBy === 'good_structure') {
        comparison = (a.good_structure === b.good_structure) ? 0 : a.good_structure ? -1 : 1;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  };

  // Get current page of structures
  const getCurrentPagePDBs = () => {
    const filteredAndSorted = getFilteredAndSortedPDBs();
    const indexOfLastPDB = currentPage * pdbsPerPage;
    const indexOfFirstPDB = indexOfLastPDB - pdbsPerPage;
    return filteredAndSorted.slice(indexOfFirstPDB, indexOfLastPDB);
  };

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Truncate long text
  const truncateText = (text, length = 60) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  // Handle pagination
  const totalPages = Math.ceil(getFilteredAndSortedPDBs().length / pdbsPerPage);
  
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Display loading state
  if (isLocalLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">PDB Filtering</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pharma-blue dark:border-pharma-teal mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-200">Filtering PDB structures...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take 1-5 minutes to complete</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">PDB Filtering</h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 mb-6">
          <h3 className="text-red-800 dark:text-red-300 font-medium">Error</h3>
          <p className="text-red-700 dark:text-red-400 mt-2">{error}</p>
          <button
            onClick={fetchFilteredPDBs}
            className="mt-4 bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-300 px-4 py-2 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
          >
            Try Again
          </button>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // If no structures data yet, show fetch button
  if (!filteredPDBs.length) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">PDB Filtering</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-center mb-8">
            <div className="bg-pharma-blue/10 dark:bg-pharma-teal/10 inline-block rounded-full p-4 mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-pharma-blue dark:text-pharma-teal">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ready to Filter PDB Structures</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Click the button below to filter and analyze available PDB structures.
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">Project Details</h4>
            <div className="mt-2 space-y-1">
              <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Project Name:</span> <span className="text-gray-900 dark:text-white">{data.projectName}</span></p>
              <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Disease:</span> <span className="text-gray-900 dark:text-white">{data.disease}</span></p>
              <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Project ID:</span> <span className="text-gray-900 dark:text-white">{data.projectId}</span></p>
              <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Selected Target:</span> <span className="text-gray-900 dark:text-white">{data.selectedTarget?.name || 'No target selected'}</span></p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <button
              onClick={fetchFilteredPDBs}
              className="btn-primary flex items-center px-6 py-3"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Filter PDB Structures
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This process will take approximately 1-5 minutes</p>
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={onBack}
            className="btn-secondary"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Display results in a table with side-by-side viewer or full-screen viewer
  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header with title and download button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PDB Filtering</h2>
        
        <button
          onClick={handleDownloadCSV}
          className="mt-2 sm:mt-0 btn-secondary flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Download CSV
        </button>
      </div>
      
      {/* Filter and Search Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search PDBs</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 sm:text-sm"
                placeholder="Search by PDB ID, target name, gene..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="showGoodStructures" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Structure Quality</label>
            <select
              id="showGoodStructures"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={showGoodStructures}
              onChange={(e) => {
                setShowGoodStructures(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Structures</option>
              <option value="good">Good Structures Only</option>
              <option value="bad">Poor Structures Only</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* PDB Viewer (when a structure is selected) */}
      {selectedViewerPDB && (
        <div 
          id="pdb-viewer-container" 
          className={`mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm ${isFullScreen ? 'fixed inset-0 z-50 flex flex-col overflow-auto' : ''}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {selectedViewerPDB.pdb_id}: {selectedViewerPDB.target_name}
            </h3>
            <div className="flex items-center space-x-2">
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
              <a
                href={`https://www.rcsb.org/structure/${selectedViewerPDB.pdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                aria-label="View in RCSB PDB"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              {!isFullScreen && (
                <button
                  onClick={() => setSelectedViewerPDB(null)}
                  className="p-2 rounded-md text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 focus:outline-none"
                  aria-label="Close viewer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            <div className={`${isFullScreen ? 'w-full' : 'w-full lg:w-1/2'}`}>
              <PDBViewer 
                pdbId={selectedViewerPDB.pdb_id} 
                width="100%" 
                height={isFullScreen ? "80vh" : "400px"}
              />
              
              {/* Links below viewer */}
              <div className="mt-3 flex justify-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                <a 
                  href={`https://www.rcsb.org/structure/${selectedViewerPDB.pdb_id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  RCSB PDB
                </a>
                <a 
                  href={`https://www.ebi.ac.uk/pdbe/entry/pdb/${selectedViewerPDB.pdb_id.toLowerCase()}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  PDBe
                </a>
                <a 
                  href={`https://molstar.org/viewer/?pdb=${selectedViewerPDB.pdb_id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View on Mol*
                </a>
              </div>
            </div>
            
            {!isFullScreen && (
              <div className="w-full lg:w-1/2">
                <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Structure Details</h4>
                  
                  <dl className="space-y-2 text-sm">
                    <div className="flex">
                      <dt className="w-1/3 font-medium text-gray-500 dark:text-gray-400">Target:</dt>
                      <dd className="w-2/3 text-gray-900 dark:text-white">{selectedViewerPDB.target_name}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-1/3 font-medium text-gray-500 dark:text-gray-400">Gene:</dt>
                      <dd className="w-2/3 text-gray-900 dark:text-white">{selectedViewerPDB.gene_name || 'N/A'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-1/3 font-medium text-gray-500 dark:text-gray-400">Target ID:</dt>
                      <dd className="w-2/3 text-gray-900 dark:text-white">{selectedViewerPDB.target_id}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-1/3 font-medium text-gray-500 dark:text-gray-400">UniProt ID:</dt>
                      <dd className="w-2/3 text-gray-900 dark:text-white">
                        <a 
                          href={`https://www.uniprot.org/uniprotkb/${selectedViewerPDB.uniprot_id}/entry`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {selectedViewerPDB.uniprot_id}
                        </a>
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-1/3 font-medium text-gray-500 dark:text-gray-400">Method:</dt>
                      <dd className="w-2/3 text-gray-900 dark:text-white">{selectedViewerPDB.method || 'N/A'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-1/3 font-medium text-gray-500 dark:text-gray-400">Biological Class:</dt>
                      <dd className="w-2/3 text-gray-900 dark:text-white">{selectedViewerPDB.bioclass || 'N/A'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-1/3 font-medium text-gray-500 dark:text-gray-400">Quality:</dt>
                      <dd className="w-2/3">
                        {selectedViewerPDB.good_structure ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-300">
                            Good Structure
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-800/30 text-yellow-800 dark:text-yellow-300">
                            Poor Structure
                          </span>
                        )}
                      </dd>
                    </div>
                    
                    {selectedViewerPDB.pubmed_id && (
                      <div className="flex">
                        <dt className="w-1/3 font-medium text-gray-500 dark:text-gray-400">Publication:</dt>
                        <dd className="w-2/3 text-gray-900 dark:text-white">
                          <a 
                            href={`https://pubmed.ncbi.nlm.nih.gov/${selectedViewerPDB.pubmed_id}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            PMID: {selectedViewerPDB.pubmed_id}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                  
                  {selectedViewerPDB.function && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Function</h5>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedViewerPDB.function}</p>
                    </div>
                  )}
                  
                  {selectedViewerPDB.abstract && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Abstract</h5>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedViewerPDB.abstract}</p>
                    </div>
                  )}
                  
                  {selectedViewerPDB.justification_for_pdb_selection && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Selection Justification</h5>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedViewerPDB.justification_for_pdb_selection}</p>
                    </div>
                  )}
                  
                  {/* Ligands Section */}
                  {selectedViewerPDB.ligands && selectedViewerPDB.ligands.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Ligands</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedViewerPDB.ligands.map((ligand, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {ligand.nonpolymer_comp?.chem_comp?.id || 'Unknown ID'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {ligand.nonpolymer_comp?.chem_comp?.name || 'Unknown Name'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* PDB Structures Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => handleSort('pdb_id')}
                >
                  PDB ID
                  {sortBy === 'pdb_id' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => handleSort('target_name')}
                >
                  Target
                  {sortBy === 'target_name' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Gene
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => handleSort('method')}
                >
                  Method
                  {sortBy === 'method' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => handleSort('good_structure')}
                >
                  Quality
                  {sortBy === 'good_structure' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Links
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {getCurrentPagePDBs().map((pdb) => (
              <tr 
                key={pdb.pdb_id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                onClick={() => handleVisualizeClick(pdb)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                  <a 
                    href={`https://www.rcsb.org/structure/${pdb.pdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()} // Prevent row click when clicking the link
                  >
                    {pdb.pdb_id}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {truncateText(pdb.target_name, 30)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {pdb.gene_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {pdb.method || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {pdb.good_structure ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-300">
                      Good
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-800/30 text-yellow-800 dark:text-yellow-300">
                      Poor
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <a 
                      href={`https://www.uniprot.org/uniprotkb/${pdb.uniprot_id}/entry`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking the link
                    >
                      UniProt
                    </a>
                    {pdb.pubmed_id && (
                      <a 
                        href={`https://pubmed.ncbi.nlm.nih.gov/${pdb.pubmed_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()} // Prevent row click when clicking the link
                      >
                        PubMed
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent row click
                      handleVisualizeClick(pdb);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-4"
                  >
                    Visualize
                  </button>
                </td>
              </tr>
            ))}
            
            {getCurrentPagePDBs().length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  No PDB structures found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {filteredPDBs.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 bg-white dark:bg-gray-800 rounded-b-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                currentPage === 1 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                currentPage === totalPages 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{filteredPDBs.length > 0 ? (currentPage - 1) * pdbsPerPage + 1 : 0}</span> to <span className="font-medium">
                  {Math.min(currentPage * pdbsPerPage, getFilteredAndSortedPDBs().length)}
                </span> of <span className="font-medium">{getFilteredAndSortedPDBs().length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                    currentPage === 1 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">First</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                    currentPage === 1 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-pharma-blue dark:bg-pharma-teal text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">Last</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="btn-secondary"
        >
          Back
        </button>
        
        <button
          onClick={() => {
            if (filteredPDBs.length > 0) {
              onNext();
            } else {
              fetchFilteredPDBs();
            }
          }}
          className="btn-primary"
          disabled={isLocalLoading}
        >
          {filteredPDBs.length > 0 ? 'Proceed to Report' : 'Load Structures'}
        </button>
      </div>
    </div>
  );
};

export default PDBFiltering; 