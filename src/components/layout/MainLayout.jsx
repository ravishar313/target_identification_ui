import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    // Check for user preference in localStorage or system preference
    if (localStorage.getItem('darkMode') !== null) {
      return localStorage.getItem('darkMode') === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Toggle dark mode and save preference
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', newValue);
      return newValue;
    });
  };

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen bg-white dark:bg-pharma-dark text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Sidebar */}
      {children[0]}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-pharma-blue dark:bg-gray-800 shadow-md">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">MoleculeAI Discovery</h1>
              
              {/* Dark Mode Toggle */}
              <button 
                onClick={toggleDarkMode}
                className="rounded-full p-2 bg-white/10 hover:bg-white/20 text-white"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            {children[1]}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-100 dark:bg-gray-800 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="px-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">© 2023 MoleculeAI Discovery. All rights reserved.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-pharma-blue dark:hover:text-pharma-teal">Privacy Policy</a>
                <a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-pharma-blue dark:hover:text-pharma-teal">Terms of Service</a>
                <a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-pharma-blue dark:hover:text-pharma-teal">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout; 