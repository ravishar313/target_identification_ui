import { useState, useEffect, useRef } from 'react';
import { endpoints } from '../constants/api';

const quirkyLoadingMessages = [
  "Asking the protein to strike a pose...",
  "Convincing molecules to socialize...",
  "Translating from human to PyMol...",
  "Folding proteins and folding laundry...",
  "Teaching old proteins new tricks...",
  "Spinning up the molecular dance floor...",
  "Consulting the oracle of biochemistry...",
  "Negotiating with stubborn ligands...",
  "Doing molecular gymnastics...",
  "Untangling the protein spaghetti..."
];

const PyMolChat = () => {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const chatContainerRef = useRef(null);
  const mountedRef = useRef(false);

  // Clear chat when component mounts (tab is switched to)
  useEffect(() => {
    // Only clear if this isn't the first mount
    if (mountedRef.current) {
      setChatHistory([]);
    } else {
      mountedRef.current = true;
    }

    // Cleanup function for when component unmounts
    return () => {
      // We don't reset mountedRef here so we can detect when the component is re-mounted
    };
  }, []);

  // Scroll to bottom of chat when chat history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Function to check PyMol connection status
  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(endpoints.pymolChatStatusUrl);
      const data = await response.json();
      
      if (data.status === 'success' && data.connection === 'established') {
        setConnection('established');
      } else {
        setConnection('error');
        setError('PyMol connection is not established');
      }
    } catch (err) {
      setConnection('error');
      setError('Failed to connect to PyMol: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle key press in textarea
  const handleKeyPress = (e) => {
    // Add new line with Shift+Enter
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setInputMessage(prev => prev + '\n');
    } 
    // Send message with Enter (without Shift)
    else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Function to send a message to PyMol
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if (!inputMessage.trim() || isProcessing) return;
    
    // Add user message to chat history
    const userMessage = { role: 'user', content: inputMessage };
    setChatHistory(prev => [...prev, userMessage]);
    
    // Clear input and set processing state
    setInputMessage('');
    setIsProcessing(true);
    
    // Set a random quirky loading message
    setLoadingMessage(quirkyLoadingMessages[Math.floor(Math.random() * quirkyLoadingMessages.length)]);
    
    try {
      // Send query to PyMol
      const response = await fetch(endpoints.pymolChatQueryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage.content }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Add system response to chat history
        setChatHistory(prev => [
          ...prev,
          {
            role: 'system',
            content: data.final_response,
            pymol_commands: data.pymol_commands,
            pymol_results: data.pymol_results,
          },
        ]);
      } else {
        // Add error message to chat history
        setChatHistory(prev => [
          ...prev,
          {
            role: 'system',
            content: 'Error: Failed to process your request.',
            error: true,
          },
        ]);
        setError('Failed to process request: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      // Add error message to chat history
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: 'Error: ' + err.message,
          error: true,
        },
      ]);
      setError('Failed to send message: ' + err.message);
    } finally {
      setIsProcessing(false);
      setLoadingMessage('');
    }
  };

  // Render PyMol commands with execution status
  const renderPyMolCommands = (commands, results) => {
    if (!commands || !results) return null;
    
    // Split commands into an array if it's a string
    const commandArray = typeof commands === 'string' 
      ? commands.split('\n') 
      : Array.isArray(commands) ? commands : [];
    
    return (
      <div className="mt-2 p-3 bg-gray-800 rounded-md text-xs overflow-auto max-h-60">
        <h4 className="text-gray-300 font-medium mb-2">PyMol Commands:</h4>
        <div className="space-y-1">
          {commandArray.map((cmd, index) => {
            const result = results.find(r => r.command === cmd);
            const statusColor = result?.status === 'success' 
              ? 'text-green-500' 
              : result?.status === 'error' ? 'text-red-500' : 'text-gray-400';
            
            return (
              <div key={index} className="flex">
                <span className="text-blue-400 mr-2">{index + 1}:</span>
                <span className="text-white">{cmd}</span>
                {result && (
                  <span className={`ml-2 ${statusColor}`}>
                    [{result.status}]
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render a chat message
  const renderChatMessage = (message, index) => {
    const isUser = message.role === 'user';
    
    return (
      <div 
        key={index}
        className={`flex flex-col mb-4 ${isUser ? 'items-end' : 'items-start'}`}
      >
        <div 
          className={`max-w-3/4 rounded-lg px-4 py-2 ${
            isUser 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : message.error 
                ? 'bg-red-600 text-white rounded-tl-none' 
                : 'bg-gray-700 text-white rounded-tl-none'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          
          {!isUser && message.pymol_commands && (
            renderPyMolCommands(message.pymol_commands, message.pymol_results)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">PyMol Chat</h2>
        <div className="flex items-center">
          <span className="text-sm mr-2">Status:</span>
          {loading ? (
            <span className="text-sm text-yellow-400">Checking...</span>
          ) : connection === 'established' ? (
            <span className="flex items-center text-sm text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              Connected
            </span>
          ) : connection === 'error' ? (
            <span className="flex items-center text-sm text-red-400">
              <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
              Disconnected
            </span>
          ) : (
            <span className="text-sm text-gray-400">Not Checked</span>
          )}
          <button 
            onClick={checkConnectionStatus}
            className="ml-3 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Check Connection'}
          </button>
        </div>
      </div>
      
      {/* Connection Error */}
      {error && (
        <div className="m-4 p-3 bg-red-600 bg-opacity-20 border border-red-400 rounded-md text-red-300">
          <p className="font-medium">Connection Error:</p>
          <p>{error}</p>
          <button 
            onClick={checkConnectionStatus}
            className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition"
          >
            Retry Connection
          </button>
        </div>
      )}
      
      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 p-4 overflow-y-auto bg-gray-900"
      >
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p className="text-center mb-2">Send a message to start interacting with PyMol</p>
            <p className="text-center text-sm">Example: "Load protein 1crn and show it as cartoon"</p>
            <button
              onClick={checkConnectionStatus}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
              disabled={loading}
            >
              {loading ? 'Checking Connection...' : 'Check PyMol Connection'}
            </button>
          </div>
        ) : (
          <>
            {chatHistory.map(renderChatMessage)}
            
            {/* Processing Loader */}
            {isProcessing && (
              <div className="flex items-center space-x-3 text-left text-gray-400 animate-pulse">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p>{loadingMessage}</p>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <form onSubmit={sendMessage} className="flex flex-col">
          <textarea
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your PyMol command or question... (Shift+Enter for new line, Enter to send)"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-t-md border border-gray-600 focus:outline-none focus:border-blue-500 min-h-[80px] resize-none"
            disabled={loading || connection !== 'established' || isProcessing}
          />
          <div className="flex items-center justify-between bg-gray-700 border-t-0 border border-gray-600 rounded-b-md px-4 py-2">
            <div className="text-xs text-gray-400">
              Press <kbd className="px-1 py-0.5 bg-gray-600 rounded">Shift</kbd> + <kbd className="px-1 py-0.5 bg-gray-600 rounded">Enter</kbd> for new line
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition"
              disabled={loading || connection !== 'established' || !inputMessage.trim() || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PyMolChat; 