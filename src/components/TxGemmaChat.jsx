import { useState, useEffect, useRef } from 'react';
import { endpoints } from '../constants/api';

const quirkyLoadingMessages = [
  "Consulting biology textbooks...",
  "Sequencing proteins...",
  "Analyzing medical literature...",
  "Investigating cellular mechanisms...",
  "Exploring metabolic pathways...",
  "Decoding genetic sequences...",
  "Studying biochemical reactions...",
  "Examining clinical data...",
  "Modeling molecular interactions...",
  "Running virtual experiments..."
];

const TxGemmaChat = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [currentEvent, setCurrentEvent] = useState(null);
  const chatContainerRef = useRef(null);
  const mountedRef = useRef(false);
  const abortControllerRef = useRef(null);

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Scroll to bottom of chat when chat history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, streamingContent]);

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

  // Format the chat history into a properly structured query
  const formatChatHistory = () => {
    return chatHistory.map(message => ({
      role: message.role,
      content: message.content
    }));
  };

  // Cancel the current streaming request
  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
      setLoadingMessage('');
      setStreamingContent('');
      setCurrentEvent(null);
    }
  };

  // Function to send a message to TxGemma
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if (!inputMessage.trim() || isProcessing) return;
    
    // Add user message to chat history
    const userMessage = { role: 'user', content: inputMessage };
    setChatHistory(prev => [...prev, userMessage]);
    
    // Clear input and set processing state
    setInputMessage('');
    setIsProcessing(true);
    setStreamingContent('');
    setCurrentEvent(null);
    
    // Set a random quirky loading message
    setLoadingMessage(quirkyLoadingMessages[Math.floor(Math.random() * quirkyLoadingMessages.length)]);
    
    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Prepare the query with chat history
      const query = inputMessage;
      
      // Send query to TxGemma streaming endpoint
      const response = await fetch(`${endpoints.txGemmaQueryStreamUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalAnswer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            setCurrentEvent(event);
            
            if (event.type === 'final_answer' && event.data && event.data.answer) {
              finalAnswer = event.data.answer;
            } else if (event.type === 'error') {
              throw new Error(event.message || 'Unknown error');
            } else if (event.type === 'generating_answer' || event.type === 'complete') {
              // These are progress events - we can show a message
              setStreamingContent(finalAnswer || 'Generating answer...');
            }
          } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError, line);
          }
        }
      }
      
      // Add system response to chat history
      if (finalAnswer) {
        setChatHistory(prev => [
          ...prev,
          {
            role: 'system',
            content: finalAnswer,
          },
        ]);
      } else {
        // If no final answer was received
        setChatHistory(prev => [
          ...prev,
          {
            role: 'system',
            content: 'Error: No response received from TxGemma.',
            error: true,
          },
        ]);
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      // Add error message to chat history
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          content: 'Error: ' + (err.message || 'Unknown error'),
          error: true,
        },
      ]);
      setError('Failed to send message: ' + err.message);
    } finally {
      setIsProcessing(false);
      setLoadingMessage('');
      setStreamingContent('');
      setCurrentEvent(null);
      abortControllerRef.current = null;
    }
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
              isUser ? 'bg-blue-600' : 'bg-purple-600'
            }`}>
              {isUser ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              )}
            </div>
            <span className={`text-xs text-gray-400 ${isUser ? 'mr-2' : 'ml-2'}`}>
              {isUser ? 'You' : 'TxGemma'}
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
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  // Render the streaming UI
  const renderStreaming = () => {
    if (!isProcessing || !currentEvent) return null;
    
    let statusMessage = loadingMessage;
    let progress = 10; // Default starting progress
    
    // Determine progress based on event type
    switch (currentEvent.type) {
      case 'start':
        progress = 10;
        statusMessage = currentEvent.message || "Starting...";
        break;
      case 'identifying_tool':
        progress = 20;
        statusMessage = currentEvent.message || "Deciding which tool to use...";
        break;
      case 'tool_identified':
        progress = 30;
        statusMessage = `Using ${currentEvent.data?.tool_name || 'specialized tool'}...`;
        break;
      case 'getting_inputs':
        progress = 40;
        statusMessage = currentEvent.message || "Extracting required information...";
        break;
      case 'inputs_extracted':
        progress = 50;
        statusMessage = currentEvent.message || "Preparing to process...";
        break;
      case 'calling_tool':
        progress = 60;
        statusMessage = currentEvent.message || "Consulting medical knowledge base...";
        break;
      case 'tool_response':
        progress = 70;
        statusMessage = currentEvent.message || "Received response from knowledge base...";
        break;
      case 'generating_answer':
        progress = 80;
        statusMessage = currentEvent.message || "Formulating your final answer...";
        break;
      case 'complete':
        progress = 90;
        statusMessage = currentEvent.message || "Finishing up...";
        break;
      default:
        progress = 50;
        statusMessage = "Processing...";
    }
    
    return (
      <div className="flex mb-6 justify-start">
        <div className="flex flex-col max-w-[75%] items-start">
          {/* Avatar and sender info */}
          <div className="flex items-center mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <span className="text-xs text-gray-400 ml-2">
              TxGemma
            </span>
          </div>
          
          {/* Message content */}
          <div className="rounded-2xl px-4 py-3 bg-gray-700 text-white rounded-tl-none w-full">
            <div className="flex flex-col">
              {/* Progress bar */}
              <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              {/* Status message */}
              <div className="flex items-center text-sm text-gray-300 mb-3">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {statusMessage}
              </div>
              
              {/* Streaming content if available */}
              {streamingContent && (
                <div className="whitespace-pre-wrap mt-2 border-t border-gray-600 pt-3">
                  {streamingContent}
                </div>
              )}
            </div>
          </div>
          
          {/* Timestamp and cancel button */}
          <div className="flex justify-between items-center w-full mt-1">
            <div className="text-xs text-gray-500">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button 
              onClick={cancelRequest}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cancel
            </button>
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
          <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
          TxGemma Biology Assistant
        </h2>
      </div>
      
      {/* Error notification */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 backdrop-blur-sm shadow-lg flex-shrink-0">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p className="font-medium">Error:</p>
              <p className="mt-1">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-3 px-3 py-1.5 bg-red-700 hover:bg-red-800 rounded text-white text-sm transition flex items-center"
              >
                Dismiss
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
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Welcome to TxGemma Chat</h3>
              <p className="text-gray-300 mb-6">Ask biology-related questions or run clinical predictions</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setInputMessage("What is the blood-brain barrier and how do drugs cross it?")}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-left text-gray-200 rounded-lg transition-colors"
                >
                  What is the blood-brain barrier and how do drugs cross it?
                </button>
                <button 
                  onClick={() => setInputMessage("Can you explain how CRISPR gene editing works?")}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-left text-gray-200 rounded-lg transition-colors"
                >
                  Can you explain how CRISPR gene editing works?
                </button>
                <button 
                  onClick={() => setInputMessage("What are the mechanisms of antibiotic resistance?")}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-left text-gray-200 rounded-lg transition-colors"
                >
                  What are the mechanisms of antibiotic resistance?
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {chatHistory.map((message, index) => renderChatMessage(message, index))}
            {isProcessing && renderStreaming()}
          </div>
        )}
      </div>
      
      {/* Input area - Fixed at bottom */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/80 backdrop-blur flex-shrink-0">
        <form onSubmit={sendMessage} className="flex items-start gap-3">
          <div className="relative flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your biology question or request clinical predictions..."
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={inputMessage.split('\n').length > 2 ? 3 : 1}
              disabled={isProcessing}
            ></textarea>
            <div className="absolute right-3 bottom-3 text-xs text-gray-400">
              <span>Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!inputMessage.trim() || isProcessing}
            className={`px-4 py-3 rounded-lg text-white shadow-lg transition-colors flex items-center justify-center h-[42px] w-[42px] ${
              !inputMessage.trim() || isProcessing
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isProcessing ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TxGemmaChat; 