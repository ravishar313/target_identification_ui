import React, { useState, useEffect } from 'react';
import { endpoints } from '../constants/api';

const TargetFiltering = ({ onNext, onBack, data, setData, setIsLoading }) => {
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [potentialTargets, setPotentialTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGoodTargets, setFilterGoodTargets] = useState('all'); // 'all', 'good', 'bad'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'id', 'isGood'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'
  
  const targetsPerPage = 10;

  const fetchPotentialTargets = async () => {
    if (!data.similarDiseases || data.similarDiseases.length === 0 || !data.projectId) {
      setError('Missing required data. Please go back and complete previous steps.');
      return;
    }

    setIsLocalLoading(true);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoints.getPotentialTargetsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diseases: data.similarDiseases.map(disease => disease.disease),
          project_id: data.projectId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch potential targets');
      }

      const responseData = await response.json();
      setPotentialTargets(responseData.potential_targets || []);
      
      // Update global state
      setData({
        ...data,
        targets: responseData.potential_targets || []
      });
    } catch (err) {
      console.error('Error fetching potential targets:', err);
      setError(err.message || 'An error occurred while fetching potential targets');
    } finally {
      setIsLocalLoading(false);
      setIsLoading(false);
    }
  };

  // Filter and sort targets
  const getFilteredAndSortedTargets = () => {
    let filtered = [...potentialTargets];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(target => 
        target.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        target.target_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply good/bad target filter
    if (filterGoodTargets === 'good') {
      filtered = filtered.filter(target => target.is_good_target);
    } else if (filterGoodTargets === 'bad') {
      filtered = filtered.filter(target => !target.is_good_target);
    }
    
    // Sort targets
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'id') {
        comparison = a.target_id.localeCompare(b.target_id);
      } else if (sortBy === 'isGood') {
        comparison = (a.is_good_target === b.is_good_target) ? 0 : a.is_good_target ? -1 : 1;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  };

  // Get current page of targets
  const getCurrentPageTargets = () => {
    const filteredAndSorted = getFilteredAndSortedTargets();
    const indexOfLastTarget = currentPage * targetsPerPage;
    const indexOfFirstTarget = indexOfLastTarget - targetsPerPage;
    return filteredAndSorted.slice(indexOfFirstTarget, indexOfLastTarget);
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

  // Handle pagination
  const totalPages = Math.ceil(getFilteredAndSortedTargets().length / targetsPerPage);
  
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Display loading state
  if (isLocalLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-6">Target Filtering</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-gray-700">Analyzing potential targets...</p>
          <p className="text-sm text-gray-500 mt-2">This may take 1-5 minutes to complete</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Target Filtering</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 mt-2">{error}</p>
          <button
            onClick={fetchPotentialTargets}
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
            Back to Disease Expert Analysis
          </button>
        </div>
      </div>
    );
  }

  // If no targets data yet, show fetch button
  if (!potentialTargets.length) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Target Filtering</h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center mb-8">
            <div className="bg-blue-50 inline-block rounded-full p-4 mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.75 17L9 20L8 21H16L15 20L14.25 17M12 3C14.7614 3 17 5.23858 17 8C17 9.6356 16.2147 11.0878 15 12L14 12.5V14H10L10 12.5L9 12C7.78555 11.0878 7 9.6356 7 8C7 5.23858 9.23858 3 12 3Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Ready to Find Potential Targets</h3>
            <p className="text-gray-600 mt-2">
              Click the button below to analyze similar diseases and identify potential targets.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-700">Project Details</h4>
            <div className="mt-2 space-y-1">
              <p className="text-sm"><span className="text-gray-500">Project Name:</span> {data.projectName}</p>
              <p className="text-sm"><span className="text-gray-500">Disease:</span> {data.disease}</p>
              <p className="text-sm"><span className="text-gray-500">Project ID:</span> {data.projectId}</p>
              <p className="text-sm"><span className="text-gray-500">Similar Diseases:</span> {data.similarDiseases?.length || 0}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <button
              onClick={fetchPotentialTargets}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Find Potential Targets
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

  // Display results in a table
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Target Filtering</h2>
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search targets..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <select 
              value={filterGoodTargets} 
              onChange={(e) => {
                setFilterGoodTargets(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="all">All Targets</option>
              <option value="good">Good Targets Only</option>
              <option value="bad">Bad Targets Only</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Found {potentialTargets.length} potential targets
        </div>
      </div>

      {/* Targets Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center">
                  Target ID
                  {sortBy === 'id' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  {sortBy === 'name' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('isGood')}
              >
                <div className="flex items-center">
                  Status
                  {sortBy === 'isGood' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PDB IDs
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getCurrentPageTargets().map((target) => (
              <tr key={target.target_id} 
                className={`
                  ${target.is_good_target ? 'bg-green-50' : 'bg-red-50'}
                  ${selectedTarget === target ? 'border border-blue-500' : ''}
                  hover:bg-gray-50
                `}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {target.target_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {target.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {target.is_good_target ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Good Target
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Not Suitable
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {target.pdb_ids && target.pdb_ids.length > 0 ? (
                      target.pdb_ids.slice(0, 3).map((pdb, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {pdb}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">None</span>
                    )}
                    {target.pdb_ids && target.pdb_ids.length > 3 && (
                      <span className="text-xs text-gray-500">+{target.pdb_ids.length - 3} more</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedTarget(selectedTarget === target ? null : target)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {selectedTarget === target ? 'Hide Details' : 'View Details'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
                Showing <span className="font-medium">{(currentPage - 1) * targetsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * targetsPerPage, getFilteredAndSortedTargets().length)}
                </span>{' '}
                of <span className="font-medium">{getFilteredAndSortedTargets().length}</span> results
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
                  // Show current page and up to 2 pages before and after
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

      {/* Selected Target Details */}
      {selectedTarget && (
        <div className="mt-6 bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Target Details</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Target ID</h4>
                <p className="text-gray-900">{selectedTarget.target_id}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Name</h4>
                <p className="text-gray-900">{selectedTarget.name}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedTarget.is_good_target 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedTarget.is_good_target ? 'Good Target' : 'Not Suitable'}
                </p>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Function</h4>
                <p className="text-gray-900">{selectedTarget.function || 'Not specified'}</p>
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Rationale</h4>
                <p className="text-gray-900 text-sm">{selectedTarget.rationale}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">PDB IDs</h4>
                {selectedTarget.pdb_ids && selectedTarget.pdb_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTarget.pdb_ids.map((pdb, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {pdb}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No PDB IDs available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
          Proceed to PDB Filtering
        </button>
      </div>
    </div>
  );
};

export default TargetFiltering; 