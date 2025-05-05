import { useState } from 'react';

const Sidebar = ({ activeModule, setActiveModule }) => {
  const [collapsed, setCollapsed] = useState(false);
  
  const modules = [
    { id: 'target-identification', name: 'Target Identification', icon: '🎯' },
    { id: 'lead-identification', name: 'Lead Identification', icon: '🔍' },
    { id: 'lead-optimization', name: 'Lead Optimization', icon: '⚗️' },
    { id: 'pcc-evaluation', name: 'PCC Evaluation', icon: '📊' },
    { id: 'pymol-chat', name: 'PyMol Chat', icon: '💬' },
    { id: 'services', name: 'Services', icon: '🧪' },
  ];

  return (
    <div 
      className={`h-screen bg-pharma-blue dark:bg-gray-800 text-white transition-all duration-300 ease-in-out flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-4 flex items-center justify-between border-b border-blue-700 dark:border-gray-700">
        {!collapsed && (
          <h2 className="text-xl font-bold">Fluent.Bio</h2>
        )}
        <button 
          className="p-1 rounded hover:bg-blue-700 dark:hover:bg-gray-700"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {modules.map((module) => (
            <li key={module.id}>
              <button
                className={`w-full flex items-center p-2 rounded-lg transition-colors duration-200 ${
                  activeModule === module.id
                    ? 'bg-blue-700 dark:bg-gray-700'
                    : 'hover:bg-blue-700/50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setActiveModule(module.id)}
              >
                <span className="text-xl mr-3">{module.icon}</span>
                {!collapsed && <span>{module.name}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-blue-700 dark:border-gray-700">
        {!collapsed && (
          <div className="text-sm text-blue-200 dark:text-gray-400">
            v1.0.0
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 