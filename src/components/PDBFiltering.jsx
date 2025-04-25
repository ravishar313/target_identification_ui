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
        <h2 className="text-2xl font-bold mb-6">PDB Filtering</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-gray-700">Filtering PDB structures...</p>
          <p className="text-sm text-gray-500 mt-2">This may take 1-5 minutes to complete</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">PDB Filtering</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 mt-2">{error}</p>
          <button
            onClick={fetchFilteredPDBs}
            className="mt-4 bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
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
        <h2 className="text-2xl font-bold mb-6">PDB Filtering</h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center mb-8">
            <div className="bg-blue-50 inline-block rounded-full p-4 mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Ready to Filter PDB Structures</h3>
            <p className="text-gray-600 mt-2">
              Click the button below to filter and analyze available PDB structures.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-700">Project Details</h4>
            <div className="mt-2 space-y-1">
              <p className="text-sm"><span className="text-gray-500">Project Name:</span> {data.projectName}</p>
              <p className="text-sm"><span className="text-gray-500">Disease:</span> {data.disease}</p>
              <p className="text-sm"><span className="text-gray-500">Project ID:</span> {data.projectId}</p>
              <p className="text-sm"><span className="text-gray-500">Potential Targets:</span> {data.targets?.length || 0}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <button
              onClick={fetchFilteredPDBs}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              Filter PDB Structures
            </button>
            <p className="text-sm text-gray-500 mt-2">This process will take approximately 1-5 minutes</p>
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={onBack}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Display results in a table with side-by-side viewer or full-screen viewer
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">PDB Filtering</h2>
        {filteredPDBs && filteredPDBs.length > 0 && (
          <button
            onClick={handleDownloadCSV}
            className="flex items-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download CSV
          </button>
        )}
      </div>
      
      {/* Only show search/filter when not in full-screen mode */}
      {!isFullScreen && (
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search structures..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 pl-8 border border-gray-300 rounded-md"
              />
              <div className="absolute left-2 top-2.5 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
            <div>
              <select 
                value={showGoodStructures} 
                onChange={(e) => {
                  setShowGoodStructures(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="all">All Structures</option>
                <option value="good">Good Structures Only</option>
                <option value="bad">Bad Structures Only</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Found {filteredPDBs.length} PDB structures
          </div>
        </div>
      )}

      {/* Main content area with different layouts based on full-screen mode */}
      {isFullScreen && selectedViewerPDB ? (
        // Full-screen layout
        <div id="pdb-viewer-container" className="w-full mb-6">
          <div className="bg-white rounded-lg border shadow-sm p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold flex items-center">
                <span className="mr-2">PDB: {selectedViewerPDB.pdb_id}</span>
                {selectedViewerPDB.good_structure ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Good Structure
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Low Quality
                  </span>
                )}
              </h3>
              <div className="flex gap-2">
                <a
                  href={`https://molstar.org/viewer/?pdb=${selectedViewerPDB.pdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                  title="View on Mol*"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button 
                  onClick={toggleFullScreen}
                  className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                  title="Exit Full Screen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 5m-5-5v5m16 7l-5 5m0 0l5-5m-5 5h5M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    setSelectedViewerPDB(null);
                    setIsFullScreen(false);
                  }}
                  className="text-gray-500 hover:bg-red-50 hover:text-red-500 p-1 rounded"
                  title="Close viewer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-2 line-clamp-1" title={selectedViewerPDB.target_name}>
              {selectedViewerPDB.target_name}
            </div>
            
            <div className="flex-grow rounded-lg overflow-hidden" style={{ height: '70vh', minHeight: '600px' }}>
              <PDBViewer 
                pdbId={selectedViewerPDB.pdb_id} 
                width="100%" 
                height="100%" 
              />
            </div>
            
            <div className="mt-3 text-center text-xs text-gray-500 flex justify-between items-center">
              <div>
                {selectedViewerPDB.method || 'N/A'}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.rcsb.org/structure/${selectedViewerPDB.pdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  RCSB
                </a>
                <a
                  href={`https://www.ebi.ac.uk/pdbe/entry/pdb/${selectedViewerPDB.pdb_id.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  PDBe
                </a>
                <a
                  href={`https://molstar.org/viewer/?pdb=${selectedViewerPDB.pdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View on Mol*
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Side-by-side or table-only layout
        <div className="flex flex-col lg:flex-row gap-6" 
          style={{ minHeight: selectedViewerPDB ? '700px' : 'auto' }}
        >
          {/* PDB Structures Table - adjusted to take appropriate width based on viewer presence */}
          <div className={`${selectedViewerPDB ? 'lg:w-[45%]' : 'w-full'} flex flex-col`}>
            <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('pdb_id')}
                    >
                      <div className="flex items-center">
                        PDB ID
                        {sortBy === 'pdb_id' && (
                          <span className="ml-1">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('target_name')}
                    >
                      <div className="flex items-center">
                        Target Name
                        {sortBy === 'target_name' && (
                          <span className="ml-1">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('method')}
                    >
                      <div className="flex items-center">
                        Method
                        {sortBy === 'method' && (
                          <span className="ml-1">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('good_structure')}
                    >
                      <div className="flex items-center">
                        Quality
                        {sortBy === 'good_structure' && (
                          <span className="ml-1">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Links
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentPagePDBs().map((pdb) => (
                    <tr key={`${pdb.target_id}-${pdb.pdb_id}`} 
                      className={`
                        ${pdb.good_structure ? 'bg-green-50' : 'bg-red-50'}
                        ${selectedPDB === pdb ? 'border border-blue-500' : ''}
                        ${selectedViewerPDB?.pdb_id === pdb.pdb_id ? 'ring-2 ring-blue-500' : ''}
                        hover:bg-gray-50
                      `}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <a href={`https://www.rcsb.org/structure/${pdb.pdb_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                            {pdb.pdb_id}
                          </a>
                          <button
                            onClick={() => handleVisualizeClick(pdb)}
                            className={`inline-flex items-center justify-center p-1 rounded-md ${
                              selectedViewerPDB?.pdb_id === pdb.pdb_id ? 
                              'text-white bg-blue-500 hover:bg-blue-600' :
                              'text-blue-600 bg-blue-100 hover:bg-blue-200'
                            }`}
                            title="Visualize Structure"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">{pdb.target_name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pdb.method || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {pdb.good_structure ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Good Structure
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Low Quality
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <a 
                          href={`https://www.uniprot.org/uniprotkb/${pdb.uniprot_id}/entry`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          UniProt
                        </a>
                        {pdb.pubmed_id && (
                          <a 
                            href={`https://pubmed.ncbi.nlm.nih.gov/${pdb.pubmed_id}/`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            PubMed
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedPDB(selectedPDB === pdb ? null : pdb)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {selectedPDB === pdb ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination - only show when not in full-screen mode */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * pdbsPerPage + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * pdbsPerPage, getFilteredAndSortedPDBs().length)}
                      </span>{' '}
                      of <span className="font-medium">{getFilteredAndSortedPDBs().length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ${currentPage === 1 ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">First</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 text-gray-400 ${currentPage === 1 ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {[...Array(totalPages)].map((_, i) => {
                        if (i + 1 === 1 || i + 1 === totalPages || 
                           (i + 1 >= currentPage - 2 && i + 1 <= currentPage + 2)) {
                          return (
                            <button
                              key={i}
                              onClick={() => goToPage(i + 1)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                currentPage === i + 1
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          );
                        } else if (i + 1 === currentPage - 3 || i + 1 === currentPage + 3) {
                          return (
                            <span key={i} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 text-gray-400 ${currentPage === totalPages ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ${currentPage === totalPages ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">Last</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PDB Viewer - Only show when a PDB is selected for visualization */}
          {selectedViewerPDB && (
            <div className="lg:w-[55%]" id="pdb-viewer-container">
              <div className="bg-white rounded-lg border shadow-sm p-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold flex items-center">
                    <span className="mr-2">PDB: {selectedViewerPDB.pdb_id}</span>
                    {selectedViewerPDB.good_structure ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Good Structure
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Low Quality
                      </span>
                    )}
                  </h3>
                  <div className="flex gap-2">
                    <a
                      href={`https://molstar.org/viewer/?pdb=${selectedViewerPDB.pdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                      title="View on Mol*"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button 
                      onClick={toggleFullScreen}
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                      title="Full Screen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setSelectedViewerPDB(null)}
                      className="text-gray-500 hover:bg-red-50 hover:text-red-500 p-1 rounded"
                      title="Close viewer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-2 line-clamp-1" title={selectedViewerPDB.target_name}>
                  {selectedViewerPDB.target_name}
                </div>
                
                <div className="flex-grow rounded-lg overflow-hidden" style={{ minHeight: '550px' }}>
                  <PDBViewer 
                    pdbId={selectedViewerPDB.pdb_id} 
                    width="100%" 
                    height="100%" 
                  />
                </div>
                
                <div className="mt-3 text-center text-xs text-gray-500 flex justify-between items-center">
                  <div>
                    {selectedViewerPDB.method || 'N/A'}
                  </div>
                  <div className="flex gap-3">
                    <a
                      href={`https://www.rcsb.org/structure/${selectedViewerPDB.pdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      RCSB
                    </a>
                    <a
                      href={`https://www.ebi.ac.uk/pdbe/entry/pdb/${selectedViewerPDB.pdb_id.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      PDBe
                    </a>
                    <a
                      href={`https://molstar.org/viewer/?pdb=${selectedViewerPDB.pdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View on Mol*
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected PDB Details - only show when not in full-screen mode */}
      {!isFullScreen && selectedPDB && (
        <div className="mt-6 bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Structure Details</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">PDB ID</h4>
                <p className="text-blue-600">
                  <a href={`https://www.rcsb.org/structure/${selectedPDB.pdb_id}`} target="_blank" rel="noopener noreferrer">
                    {selectedPDB.pdb_id}
                  </a>
                </p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Target ID</h4>
                <p className="text-gray-900">{selectedPDB.target_id}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Target Name</h4>
                <p className="text-gray-900">{selectedPDB.target_name}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Gene Name</h4>
                <p className="text-gray-900">{selectedPDB.gene_name || 'N/A'}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">UniProt ID</h4>
                <p className="text-gray-900">
                  <a 
                    href={`https://www.uniprot.org/uniprotkb/${selectedPDB.uniprot_id}/entry`} 
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline"
                  >
                    {selectedPDB.uniprot_id}
                  </a>
                </p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Structure Quality</h4>
                <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedPDB.good_structure 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedPDB.good_structure ? 'Good Structure' : 'Low Quality'}
                </p>
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Method</h4>
                <p className="text-gray-900">{selectedPDB.method || 'N/A'}</p>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Biological Class</h4>
                <p className="text-gray-900">{selectedPDB.bioclass || 'N/A'}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Function</h4>
                <p className="text-gray-900 text-sm">{selectedPDB.function || 'Function not specified'}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Publication</h4>
                {selectedPDB.pubmed_id ? (
                  <p className="text-gray-900">
                    <a 
                      href={`https://pubmed.ncbi.nlm.nih.gov/${selectedPDB.pubmed_id}/`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      PubMed: {selectedPDB.pubmed_id}
                    </a>
                  </p>
                ) : (
                  <p className="text-gray-500">No publication available</p>
                )}
              </div>
              
              {selectedPDB.abstract && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500">Abstract</h4>
                  <p className="text-gray-900 text-sm leading-relaxed">{selectedPDB.abstract}</p>
                </div>
              )}
              
              {selectedPDB.justification_for_pdb_selection && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Selection Justification</h4>
                  <p className="text-gray-900 text-sm">{selectedPDB.justification_for_pdb_selection}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Ligands Section */}
          {selectedPDB.ligands && selectedPDB.ligands.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Ligands</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {selectedPDB.ligands.map((ligand, idx) => (
                    <div key={idx} className="p-3 bg-white rounded border">
                      <p className="text-sm font-medium">
                        {ligand.nonpolymer_comp?.chem_comp?.id || 'Unknown ID'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {ligand.nonpolymer_comp?.chem_comp?.name || 'Unknown Name'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons - only show when not in full-screen mode */}
      {!isFullScreen && (
        <div className="flex justify-between mt-8">
          <button
            onClick={onBack}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Generate Research Report
          </button>
        </div>
      )}
    </div>
  );
};

export default PDBFiltering; 