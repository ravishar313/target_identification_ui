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

  // Render PyMol commands with execution status as a step thread
  const renderPyMolCommands = (commands, results) => {
    if (!commands || !results) return null;
    
    // Split commands into an array if it's a string
    const commandArray = typeof commands === 'string' 
      ? commands.split('\n') 
      : Array.isArray(commands) ? commands : [];
    
    return (
      <div className="mt-3 py-2 border-t border-gray-700">
        <h4 className="text-gray-300 font-medium mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          PyMol Execution Steps
        </h4>
        <div className="relative pl-6">
          {/* Vertical line connecting all steps */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 to-blue-500 rounded-full" />
          
          <div className="space-y-4">
            {commandArray.map((cmd, index) => {
              const result = results.find(r => r.command === cmd);
              const isSuccess = result?.status === 'success';
              const isError = result?.status === 'error';
              const executionTime = result?.execution_time ? `(${(result.execution_time * 1000).toFixed(0)}ms)` : '';
              
              return (
                <div 
                  key={index} 
                  className="flex items-start relative"
                >
                  <div className={`absolute left-[-12px] flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                    isSuccess ? 'bg-green-500 text-white' : 
                    isError ? 'bg-red-500 text-white' : 
                    'bg-gray-600 text-gray-200'
                  }`}>
                    {isSuccess ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isError ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="flex flex-col">
                      <pre className="text-sm font-mono bg-gray-800 px-3 py-2 rounded overflow-x-auto">{cmd}</pre>
                      {result && (
                        <div className={`mt-1 text-xs flex items-center ${
                          isSuccess ? 'text-green-400' : isError ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {isSuccess ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Executed successfully {executionTime}
                            </>
                          ) : isError ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Failed: {result.output || 'Unknown error'}
                            </>
                          ) : 'Pending...'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
        className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Avatar and sender info */}
          <div className={`flex items-center mb-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              isUser ? 'bg-blue-600' : 'bg-indigo-600'
            }`}>
              {isUser ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
              )}
            </div>
            <span className={`text-xs text-gray-400 ${isUser ? 'mr-2' : 'ml-2'}`}>
              {isUser ? 'You' : 'PyMol Assistant'}
            </span>
          </div>
          
          {/* Message content */}
          <div 
            className={`rounded-2xl px-4 py-3 ${
              isUser 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : message.error 
                  ? 'bg-red-600 text-white rounded-tl-none' 
                  : 'bg-gray-700 text-white rounded-tl-none'
            }`}
          >
            {/* For system messages, show commands first then content */}
            {!isUser && message.pymol_commands ? (
              <>
                {renderPyMolCommands(message.pymol_commands, message.pymol_results)}
                <div className="mt-3 border-t border-gray-600 pt-3 text-white">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="px-6 py-4 bg-gray-800/80 backdrop-blur border-b border-gray-700 flex items-center justify-between shadow-lg flex-shrink-0">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
          PyMol Chat
        </h2>
        <div className="flex items-center">
          <span className="text-sm mr-2 text-gray-300">Status:</span>
          {loading ? (
            <span className="text-sm text-yellow-400 flex items-center">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1 animate-pulse"></span>
              Checking...
            </span>
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
            <span className="text-sm text-gray-400 flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
              Not Checked
            </span>
          )}
          <button 
            onClick={checkConnectionStatus}
            className="ml-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full transition-colors shadow-md flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Check Connection
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Error notification */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 backdrop-blur-sm shadow-lg flex-shrink-0">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p className="font-medium">Connection Error:</p>
              <p className="mt-1">{error}</p>
              <button 
                onClick={checkConnectionStatus}
                className="mt-3 px-3 py-1.5 bg-red-700 hover:bg-red-800 rounded text-white text-sm transition flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Messages - Scrollable area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 p-6 overflow-y-auto min-h-0"
      >
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="bg-gray-800/70 rounded-lg p-8 backdrop-blur-sm shadow-lg max-w-md text-center border border-gray-700">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Welcome to PyMol Chat</h3>
              <p className="text-gray-300 mb-6">Send a message to start interacting with PyMol using natural language</p>
              
              <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-gray-700">
                <p className="text-gray-400 text-sm font-medium mb-2">Example commands:</p>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                    Load protein 1crn and show it as cartoon
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                    Show hydrophobic residues in 1crn
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                    Color secondary structure by element
                  </li>
                </ul>
              </div>
              
              <button
                onClick={checkConnectionStatus}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center justify-center mx-auto transition-colors shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking Connection...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    Check PyMol Connection
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map(renderChatMessage)}
            
            {/* Processing Loader */}
            {isProcessing && (
              <div className="flex items-start mb-6">
                <div className="max-w-[75%]">
                  <div className="flex items-center mb-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-indigo-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-400 ml-2">PyMol Assistant</span>
                  </div>
                  
                  <div className="bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3 text-white">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <p className="text-blue-300 animate-pulse">{loadingMessage}</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Input Area - Fixed at bottom */}
      <div className="p-4 bg-gray-800/80 backdrop-blur border-t border-gray-700 shadow-lg flex-shrink-0">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
          <div className="bg-gray-700 rounded-lg p-2 shadow-inner">
            <textarea
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your PyMol command or question..."
              className="w-full bg-transparent text-white placeholder-gray-400 border-0 focus:ring-0 p-2 min-h-[80px] resize-none"
              disabled={loading || connection !== 'established' || isProcessing}
            />
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-600">
              <div className="text-xs text-gray-400 flex items-center">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs mr-1">Shift</kbd>
                +
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs mx-1">Enter</kbd>
                for new line
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors shadow-md flex items-center"
                disabled={loading || connection !== 'established' || !inputMessage.trim() || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PyMolChat; 