import React, { useState, useEffect, useRef } from 'react';
import diseaseList from '../data/DiseaseList.json';

const DiseaseInput = ({ onNext, data, setData }) => {
  const [disease, setDisease] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [randomSuggestions, setRandomSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

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
    if (disease.trim() === '') {
      setSuggestions([]);
      return;
    }

    const filteredSuggestions = diseaseList
      .filter(item => 
        item.toLowerCase().includes(disease.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 suggestions to avoid overwhelming the UI
    
    setSuggestions(filteredSuggestions);
  }, [disease]);

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
    
    // Update recent searches
    updateRecentSearches(disease);
    
    // Update the global data state with the selected disease
    setData({
      ...data,
      disease: disease
    });
    
    onNext();
  };

  const handleSuggestionClick = (selectedDisease) => {
    setDisease(selectedDisease);
    setIsFocused(false);
  };

  const handleRecentSearchClick = (selectedDisease) => {
    setDisease(selectedDisease);
  };

  // Generate new random suggestions
  const regenerateSuggestions = () => {
    setRandomSuggestions(getRandomSuggestions());
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Disease Analysis Input</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label htmlFor="disease" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Disease for Investigation
            </label>
            <input
              type="text"
              id="disease"
              ref={inputRef}
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Type 2 Diabetes"
              required
            />
            
            {/* Suggestions dropdown */}
            {isFocused && suggestions.length > 0 && (
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
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white px-4 py-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Analyze Disease
          </button>
        </form>

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
      </div>
    </div>
  );
};

export default DiseaseInput; 