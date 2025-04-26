import React, { useState, useEffect, useRef } from 'react';
import diseaseList from '../data/DiseaseList.json';
import { endpoints } from '../constants/api';

const DiseaseInput = ({ onNext, data, setData }) => {
  const [disease, setDisease] = useState(data.disease || '');
  const [projectName, setProjectName] = useState(data.projectName || '');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [randomSuggestions, setRandomSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Fetch projects from API
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch(endpoints.listProjectsUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Create a new project via API
  const createProject = async () => {
    if (!projectName.trim() || !disease.trim()) {
      return;
    }

    setIsCreatingProject(true);
    setCreateProjectError(null);

    try {
      const response = await fetch(endpoints.createProjectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          disease: disease
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create project');
      }

      const projectData = await response.json();
      
      // Update the global state with the created project
      setData({
        ...data,
        projectName: projectData.project_name,
        disease: projectData.disease,
        projectId: projectData.id,
        createdAt: projectData.created_at
      });

      // Update recent searches
      updateRecentSearches(disease);
      
      // Continue to next step
      onNext();
    } catch (err) {
      console.error('Error creating project:', err);
      setCreateProjectError(err.message || 'An error occurred while creating the project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Fetch projects when component mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  // Handle project selection
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setDisease(project.disease);
    setProjectName(project.project_name);
    
    // Update global state
    setData({
      ...data,
      projectName: project.project_name,
      disease: project.disease,
      projectId: project.id,
      createdAt: project.created_at
    });
  };

  // Generate random suggestions from the disease list
  const getRandomSuggestions = () => {
    const shuffled = [...diseaseList].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  };

  // Load recent searches from localStorage and generate random suggestions on component mount
  useEffect(() => {
    const storedSearches = localStorage.getItem('recentDiseaseSearches');
    if (storedSearches) {
      setRecentSearches(JSON.parse(storedSearches));
    }
    
    // Generate random suggestions
    setRandomSuggestions(getRandomSuggestions());
  }, []);

  // Filter suggestions based on input
  useEffect(() => {
    if (disease.trim() === '' || selectedProject) {
      setSuggestions([]);
      return;
    }

    const filteredSuggestions = diseaseList
      .filter(item => 
        item.toLowerCase().includes(disease.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 suggestions to avoid overwhelming the UI
    
    setSuggestions(filteredSuggestions);
  }, [disease, selectedProject]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateRecentSearches = (newDisease) => {
    // Don't add empty searches
    if (!newDisease.trim()) return;

    // Create new array with the new disease at the beginning
    // Remove any duplicates and limit to 5 items
    const updatedSearches = [
      newDisease,
      ...recentSearches.filter(item => item !== newDisease)
    ].slice(0, 5);
    
    setRecentSearches(updatedSearches);
    
    // Save to localStorage
    localStorage.setItem('recentDiseaseSearches', JSON.stringify(updatedSearches));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // If a project is selected, we can proceed to the next step
    if (selectedProject) {
      onNext();
      return;
    }
    
    // Otherwise, create a new project
    createProject();
  };

  const handleSuggestionClick = (selectedDisease) => {
    if (!selectedProject) {
      setDisease(selectedDisease);
    }
    setIsFocused(false);
  };

  const handleRecentSearchClick = (selectedDisease) => {
    if (!selectedProject) {
      setDisease(selectedDisease);
    }
  };

  // Generate new random suggestions
  const regenerateSuggestions = () => {
    setRandomSuggestions(getRandomSuggestions());
  };

  // Clear selected project
  const clearSelectedProject = () => {
    setSelectedProject(null);
    setDisease('');
    setProjectName('');
  };

  // Refresh projects list
  const handleRefreshProjects = () => {
    fetchProjects();
  };

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Disease Analysis Input</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Select an existing project or create a new one to begin identifying potential targets for drug discovery.
        </p>
        
        {/* Existing Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              <span className="molecule-icon mr-2">🧪</span>Existing Projects
            </h3>
            <button 
              onClick={handleRefreshProjects}
              className="text-sm text-pharma-blue dark:text-pharma-teal hover:text-opacity-80 flex items-center transition-colors"
              disabled={loadingProjects}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {loadingProjects ? 'Loading...' : 'Refresh Projects'}
            </button>
          </div>
          
          {loadingProjects ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pharma-blue dark:border-pharma-teal mx-auto"></div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading projects...</p>
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
              <p className="text-center text-gray-500 dark:text-gray-400">No existing projects found. Create one below.</p>
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
                Clear Selection & Create New Project
              </button>
            </div>
          )}
        </div>
        
        {/* Create New Project Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <span className="molecule-icon mr-2">🧬</span>
            {selectedProject ? 'Selected Project' : 'Create New Project'}
          </h3>
          
          {/* Project Name Input */}
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={`input-field w-full p-3 ${
                selectedProject ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              placeholder="e.g., Alzheimer Research Project 2023"
              required
              disabled={selectedProject !== null}
            />
          </div>

          {/* Disease Input */}
          <div className="relative">
            <label htmlFor="disease" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Disease for Investigation
            </label>
            <input
              type="text"
              id="disease"
              ref={inputRef}
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className={`input-field w-full p-3 ${
                selectedProject ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              placeholder="e.g., Type 2 Diabetes"
              required
              disabled={selectedProject !== null}
            />
            
            {/* Suggestions dropdown */}
            {isFocused && suggestions.length > 0 && !selectedProject && (
              <ul 
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {createProjectError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-red-700 dark:text-red-400">
              {createProjectError}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isCreatingProject}
            className={`btn-primary w-full px-4 py-3 rounded-md ${
              isCreatingProject ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isCreatingProject ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin h-5 w-5 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                Creating Project...
              </span>
            ) : selectedProject ? (
              'Proceed with Selected Project'
            ) : (
              'Create Project & Proceed'
            )}
          </button>
        </form>

        {/* Only show recent searches and suggestions if no project is selected */}
        {!selectedProject && (
          <>
            {/* Recent Searches Section */}
            {recentSearches.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                  <span className="molecule-icon mr-2">🔍</span>Recent Searches
                </h3>
                <ul className="space-y-2">
                  {recentSearches.map((item, index) => (
                    <li
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 text-gray-700 dark:text-gray-200"
                      onClick={() => handleRecentSearchClick(item)}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions Section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="molecule-icon mr-2">💡</span>Suggested Diseases
                </h3>
                <button 
                  onClick={regenerateSuggestions}
                  className="text-sm text-pharma-blue dark:text-pharma-teal hover:text-opacity-80 transition-colors flex items-center"
                  aria-label="Get new suggestions"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Refresh Suggestions
                </button>
              </div>
              <div className="molecule-grid">
                {randomSuggestions.map((item, index) => (
                  <div
                    key={index}
                    className="card p-4 cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-transparent hover:border-pharma-blue/20 dark:hover:border-pharma-teal/20"
                    onClick={() => handleRecentSearchClick(item)}
                  >
                    <div className="flex items-start mb-2">
                      <div className="molecule-icon text-xl mr-2">🧪</div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{item}</h4>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Start a new drug discovery project targeting {item.toLowerCase()}.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DiseaseInput; 