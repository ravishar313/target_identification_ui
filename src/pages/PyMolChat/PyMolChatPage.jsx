import PyMolChat from '../../components/PyMolChat';

const PyMolChatPage = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 bg-gray-900 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">PyMol Chat Interface</h1>
        <p className="text-gray-400 mt-1">Interact with PyMol using natural language commands</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <PyMolChat />
      </div>
    </div>
  );
};

export default PyMolChatPage; 