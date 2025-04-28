import React, { useState, useEffect } from 'react';
import { endpoints } from '../constants/api';

const ProjectPDBSelection = ({ onNext, onBack, data, setData }) => {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [pdbOptions, setPdbOptions] = useState([]);
  const [loadingPdbs, setLoadingPdbs] = useState(false);
  const [selectedPdb, setSelectedPdb] = useState(null);
  const [error, setError] = useState(null);

  // Fetch projects from API
  const fetchProjects = async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      const response = await fetch(endpoints.listProjectsUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch PDB IDs for selected project
  const fetchPdbIds = async (projectId) => {
    setLoadingPdbs(true);
    setError(null);
    try {
      const response = await fetch(endpoints.getLeadPDBsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PDB IDs');
      }

      const pdbData = await response.json();
      setPdbOptions(pdbData || []);
    } catch (error) {
      console.error('Error fetching PDB IDs:', error);
      setError('Failed to load PDB options. Please try again.');
      setPdbOptions([]);
    } finally {
      setLoadingPdbs(false);
    }
  };

  // Fetch projects when component mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch PDB IDs when a project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchPdbIds(selectedProject.id);
    } else {
      setPdbOptions([]);
      setSelectedPdb(null);
    }
  }, [selectedProject]);

  // Handle project selection
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setSelectedPdb(null);
    
    // Update global state with project info
    setData({
      ...data,
      projectName: project.project_name,
      disease: project.disease,
      projectId: project.id,
      createdAt: project.created_at,
      pdbId: null, // Clear any previously selected PDB
      targetName: null
    });
  };

  // Handle PDB selection
  const handlePdbSelect = (pdb) => {
    setSelectedPdb(pdb);
    
    // Update global state with PDB info
    setData({
      ...data,
      pdbId: pdb.pdb_id,
      targetName: pdb.target_name,
      goodStructure: pdb.good_structure
    });
  };

  // Clear selected project
  const clearSelectedProject = () => {
    setSelectedProject(null);
    setSelectedPdb(null);
    setPdbOptions([]);
  };

  // Handle proceed button
  const handleProceed = () => {
    if (selectedProject && selectedPdb) {
      onNext();
    } else {
      setError('Please select both a project and a PDB ID before proceeding.');
    }
  };

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Project & Target Selection</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Select a project and target PDB structure to begin lead identification.
        </p>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        
        {/* Project Selection Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-3">
            <span className="mr-2">🔍</span>
            Select Project
          </h3>
          
          {loadingProjects ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-pharma-blue dark:border-pharma-teal rounded-full"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading projects...</span>
            </div>
          ) : projects.length > 0 ? (
            <div className="card bg-opacity-50 dark:bg-opacity-50 max-h-60 overflow-auto">
              <ul className="space-y-3">
                {projects.map((project) => (
                  <li key={project.id} className={`
                    p-3 rounded-md cursor-pointer transition-all duration-200
                    ${selectedProject && selectedProject.id === project.id 
                      ? 'bg-pharma-blue/10 dark:bg-pharma-teal/10 border border-pharma-blue/30 dark:border-pharma-teal/30 shadow-sm' 
                      : 'bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{project.project_name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Disease: {project.disease}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Created: {new Date(project.created_at * 1000).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="card bg-opacity-50 dark:bg-opacity-50 flex flex-col items-center justify-center py-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-center text-gray-500 dark:text-gray-400">No existing projects found. Please create a project in the Target Identification module first.</p>
            </div>
          )}

          {selectedProject && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clearSelectedProject}
                className="text-sm text-pharma-red hover:text-opacity-80 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Clear Selection
              </button>
            </div>
          )}
        </div>
        
        {/* PDB ID Selection */}
        {selectedProject && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-3">
              <span className="mr-2">🧬</span>
              Select Target PDB Structure
            </h3>
            
            {loadingPdbs ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-pharma-blue dark:border-pharma-teal rounded-full"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Loading PDB structures...</span>
              </div>
            ) : pdbOptions.length > 0 ? (
              <div className="card bg-opacity-50 dark:bg-opacity-50 max-h-60 overflow-auto">
                <ul className="space-y-3">
                  {pdbOptions.map((pdb, index) => (
                    <li 
                      key={`${pdb.pdb_id}-${index}`} 
                      className={`
                        p-3 rounded-md cursor-pointer transition-all duration-200
                        ${selectedPdb && selectedPdb.pdb_id === pdb.pdb_id 
                          ? 'bg-pharma-blue/10 dark:bg-pharma-teal/10 border border-pharma-blue/30 dark:border-pharma-teal/30 shadow-sm' 
                          : 'bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }
                      `}
                      onClick={() => handlePdbSelect(pdb)}
                    >
                      <div className="font-medium text-gray-900 dark:text-white flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${pdb.good_structure ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        PDB ID: {pdb.pdb_id}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{pdb.target_name}</div>
                      {!pdb.good_structure && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Not preferred target structure
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="card bg-opacity-50 dark:bg-opacity-50 flex flex-col items-center justify-center py-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-center text-gray-500 dark:text-gray-400">No PDB structures found for this project.</p>
              </div>
            )}
          </div>
        )}
        
        {/* Proceed Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleProceed}
            disabled={!selectedProject || !selectedPdb}
            className={`btn-primary px-4 py-2 rounded-md ${
              (!selectedProject || !selectedPdb) ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            Proceed to Disease Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectPDBSelection; 