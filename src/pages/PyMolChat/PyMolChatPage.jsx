import { useEffect, useState } from 'react';
import PyMolChat from '../../components/PyMolChat';

const PyMolChatPage = ({ activeModule }) => {
  // This key will force the PyMolChat component to remount
  // whenever the tab is switched to this page
  const [chatKey, setChatKey] = useState(Date.now());
  
  // Set a new key whenever this page becomes active
  useEffect(() => {
    if (activeModule === 'pymol-chat') {
      setChatKey(Date.now());
    }
  }, [activeModule]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 bg-gray-900 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">PyMol Chat Interface</h1>
        <p className="text-gray-400 mt-1">Interact with PyMol using natural language commands</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <PyMolChat key={chatKey} />
      </div>
    </div>
  );
};

export default PyMolChatPage; 