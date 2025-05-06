import { useState, useEffect, useRef } from 'react';
import { endpoints } from '../constants/api';

const TxGemmaChat = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [formattedHistory, setFormattedHistory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing your query...');
  const [streamingContent, setStreamingContent] = useState('');
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);
  const [expandedMessages, setExpandedMessages] = useState({});
  const chatContainerRef = useRef(null);
  const mountedRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Clear chat when component mounts (tab is switched to)
  useEffect(() => {
    // Only clear if this isn't the first mount
    if (mountedRef.current) {
      setChatHistory([]);
      setEventHistory([]);
      setExpandedMessages({});
      setFormattedHistory('');
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
  }, [chatHistory, streamingContent, eventHistory]);

  // Update formatted history whenever chat history changes
  useEffect(() => {
    // Skip if chat history is empty
    if (chatHistory.length === 0) {
      setFormattedHistory('');
      return;
    }

    // Format the chat history as a string
    let historyString = '';
    
    chatHistory.forEach((message) => {
      const role = message.role === 'user' ? 'Human' : 'Assistant';
      historyString += `${role}: ${message.content}\n\n`;
    });
    
    setFormattedHistory(historyString);
  }, [chatHistory]);

  // Toggle the expanded state of a message
  const toggleMessageExpanded = (messageIndex) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
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
    setEventHistory([]);
    
    // Set standard loading message
    setLoadingMessage('Processing your query...');
    
    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Create a query that includes the chat history and current query
      const queryWithHistory = formattedHistory ? 
        `${formattedHistory}Human: ${userMessage.content}` : 
        userMessage.content;
      
      // Send query to TxGemma streaming endpoint
      const response = await fetch(`${endpoints.txGemmaQueryStreamUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryWithHistory }),
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalAnswer = '';
      let completeEventHistory = [];
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            setCurrentEvent(event);
            
            // Add event to local variable and state
            completeEventHistory = [...completeEventHistory, event];
            setEventHistory(completeEventHistory);
            
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
      
      // Add system response to chat history with the events included
      if (finalAnswer) {
        setChatHistory(prev => [
          ...prev,
          {
            role: 'system',
            content: finalAnswer,
            events: completeEventHistory
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
            events: completeEventHistory
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
          events: [...eventHistory]
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

  // Renders the event step UI (showing all reasoning steps)
  const renderEventSteps = (events) => {
    if (!events || events.length === 0) return null;
    
    // Create a map of event types to prevent duplicates in visualization
    const uniqueEvents = [];
    const seenEventTypes = new Set();
    
    // Process events to identify unique ones, prioritizing those with data
    for (const event of events) {
      // Always include certain critical events or events with data
      const isDataEvent = event.data && Object.keys(event.data).length > 0;
      const isCriticalEvent = ['tool_identified', 'inputs_extracted', 'tool_response', 'final_answer'].includes(event.type);
      
      if (isDataEvent || isCriticalEvent || !seenEventTypes.has(event.type)) {
        uniqueEvents.push(event);
        seenEventTypes.add(event.type);
      }
    }
    
    return (
      <div className="mt-3 space-y-3 border-t border-gray-600 pt-3">
        <h4 className="text-gray-300 font-medium mb-2">Processing Steps:</h4>
        <div className="space-y-3">
          {uniqueEvents.map((event, index) => {
            // Skip rendering certain events that don't add value to the UI
            if (event.type === 'final_answer') return null;
            
            // Determine styling based on event type
            const getEventIcon = () => {
              switch (event.type) {
                case 'start':
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                  );
                case 'tool_identified':
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  );
                case 'inputs_extracted':
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  );
                case 'calling_tool':
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  );
                case 'tool_response':
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                    </svg>
                  );
                case 'generating_answer':
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                    </svg>
                  );
                case 'complete':
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  );
                case 'error':
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  );
                default:
                  return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  );
              }
            };

            // Format any data for display
            const renderData = () => {
              if (!event.data) return null;
              
              // Handle different data types
              if (event.type === 'tool_identified' && event.data.tool_name) {
                return (
                  <div className="mt-2 bg-gray-800 rounded p-3 text-sm">
                    <p className="text-gray-300 font-medium">Tool: <span className="text-green-400">{event.data.tool_name}</span></p>
                    {event.data.reason && (
                      <p className="text-gray-300 mt-1">Reason: {event.data.reason}</p>
                    )}
                  </div>
                );
              }
              
              if (event.type === 'inputs_extracted' && event.data.inputs) {
                return (
                  <div className="mt-2 bg-gray-800 rounded p-3 text-sm">
                    <p className="text-gray-300 font-medium">Inputs:</p>
                    <pre className="text-gray-300 mt-1 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(event.data.inputs, null, 2)}
                    </pre>
                  </div>
                );
              }
              
              // For any other data
              if (Object.keys(event.data).length > 0) {
                return (
                  <div className="mt-2 bg-gray-800 rounded p-3 text-sm">
                    <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                );
              }
              
              return null;
            };
            
            return (
              <div key={index} className="flex space-x-3 p-3 bg-gray-800/60 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getEventIcon()}
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-200">
                    {event.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </h5>
                  {event.message && (
                    <p className="text-sm text-gray-300 mt-1">{event.message}</p>
                  )}
                  {renderData()}
                </div>
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
    const isExpanded = expandedMessages[index] || false;
    const hasEvents = !isUser && message.events && message.events.length > 0;
    
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
            {/* For system messages with events, show the content first with option to expand steps */}
            {!isUser && hasEvents ? (
              <>
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Details toggle button */}
                {message.events.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <button
                      onClick={() => toggleMessageExpanded(index)}
                      className="flex items-center text-sm text-purple-300 hover:text-purple-200 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          Hide processing details
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          View processing details
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Render steps only if expanded */}
                {isExpanded && renderEventSteps(message.events)}
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

  // Render the streaming UI
  const renderStreaming = () => {
    if (!isProcessing) return null;
    
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
              {/* Status message */}
              <div className="flex items-center text-sm text-gray-300 mb-3">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loadingMessage}
              </div>
              
              {/* Show all events collected so far */}
              {eventHistory.length > 0 && renderEventSteps(eventHistory)}
              
              {/* Streaming content if available */}
              {streamingContent && (
                <div className="whitespace-pre-wrap mt-2 border-t border-gray-600 pt-3">
                  <h4 className="text-gray-300 font-medium mb-2">Current Answer:</h4>
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
              <p className="text-gray-300 mb-4">Ask biology-related questions or run clinical predictions</p>
              
              <a 
                href="https://arxiv.org/pdf/2504.06196" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center text-sm text-purple-300 hover:text-purple-200 mb-6 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Read more about TxGemma - capabilities and evals
              </a>
              
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