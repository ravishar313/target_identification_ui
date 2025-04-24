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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Disease Analysis Input</h2>
        
        {/* Existing Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Existing Projects</h3>
            <button 
              onClick={handleRefreshProjects}
              className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
              disabled={loadingProjects}
            >
              {loadingProjects ? 'Loading...' : 'Refresh Projects'}
            </button>
          </div>
          
          {loadingProjects ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading projects...</p>
            </div>
          ) : projects.length > 0 ? (
            <div className="bg-gray-50 rounded-md p-4 border border-gray-200 max-h-60 overflow-auto">
              <ul className="space-y-2">
                {projects.map((project) => (
                  <li key={project.id} className={`
                    p-3 rounded-md cursor-pointer transition-colors duration-150
                    ${selectedProject && selectedProject.id === project.id 
                      ? 'bg-blue-100 border border-blue-300' 
                      : 'bg-white border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="font-medium">{project.project_name}</div>
                    <div className="text-sm text-gray-500">Disease: {project.disease}</div>
                    <div className="text-xs text-gray-400">
                      Created: {new Date(project.created_at * 1000).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">No existing projects found. Create one below.</p>
          )}

          {selectedProject && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clearSelectedProject}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear Selection & Create New Project
              </button>
            </div>
          )}
        </div>
        
        {/* Create New Project Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedProject ? 'Selected Project' : 'Create New Project'}
          </h3>
          
          {/* Project Name Input */}
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                selectedProject ? 'bg-gray-100' : ''
              }`}
              placeholder="e.g., Alzheimer Research Project 2023"
              required
              disabled={selectedProject !== null}
            />
          </div>

          {/* Disease Input */}
          <div className="relative">
            <label htmlFor="disease" className="block text-sm font-medium text-gray-700 mb-2">
              Disease for Investigation
            </label>
            <input
              type="text"
              id="disease"
              ref={inputRef}
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className={`w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                selectedProject ? 'bg-gray-100' : ''
              }`}
              placeholder="e.g., Type 2 Diabetes"
              required
              disabled={selectedProject !== null}
            />
            
            {/* Suggestions dropdown */}
            {isFocused && suggestions.length > 0 && !selectedProject && (
              <ul 
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {createProjectError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700">
              {createProjectError}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isCreatingProject}
            className={`w-full px-4 py-3 rounded-md ${
              isCreatingProject
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h3>
                <ul className="space-y-2">
                  {recentSearches.map((item, index) => (
                    <li
                      key={index}
                      className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors duration-150 text-gray-700"
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
                <h3 className="text-lg font-semibold text-gray-900">Suggested Diseases</h3>
                <button 
                  onClick={regenerateSuggestions}
                  className="text-sm text-blue-500 hover:text-blue-700"
                  aria-label="Get new suggestions"
                >
                  Refresh Suggestions
                </button>
              </div>
              <ul className="space-y-2">
                {randomSuggestions.map((item, index) => (
                  <li
                    key={index}
                    className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors duration-150 text-gray-700"
                    onClick={() => handleRecentSearchClick(item)}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DiseaseInput; 