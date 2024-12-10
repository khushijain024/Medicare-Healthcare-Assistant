import { useState, useRef } from 'react';
import logoImage from './assets/logo.png';
const SYSTEM_PROMPT = `You are a helpful healthcare assistant. Provide brief, clear responses that are:
1. Concise and to the point (2-3 sentences max per topic)
2. Easy to understand
3. Focused on practical advice
4. Include only essential medical information
5. Add a very brief disclaimer only when necessary

Keep total response length under 100 words.`;

// Helper function to format messages with bold text and line breaks
const formatMessage = (text) => {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={i}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        })}
      </div>
    );
  });
};

// Function to download response as text file
const downloadResponse = (content) => {
  const text = `
Medical Consultation Report
--------------------------
ID: ${content.reportId}
Timestamp: ${content.timestamp}

Patient Query:
${content.query}

Medical Response:
${content.response}

Disclaimer: This is an AI-generated response for informational purposes only.
Please consult with a qualified healthcare professional for medical advice.
`;

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medical-report-${content.reportId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const Chatbot = () => {
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatContainerRef = useRef(null);

  const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent";
  const API_KEY = import.meta.env.VITE_API_KEY;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userMessage.trim()) return;
    if (!API_KEY) {
      setError('API key is not configured');
      return;
    }

    const newUserMessage = {
      type: 'user',
      content: userMessage
    };
    setMessages(prev => [...prev, newUserMessage]);
    setUserMessage('');
    setIsLoading(true);

    try {
      const requestBody = {
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}\n\nAssistant:`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 150,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const res = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();
      if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
        throw new Error('Invalid API response');
      }

      const botResponse = {
        type: 'bot',
        content: {
          query: userMessage,
          response: data.candidates[0].content.parts[0].text.trim(),
          timestamp: new Date().toLocaleString(),
          reportId: Math.random().toString(36).substr(2, 9).toUpperCase()
        }
      };

      setMessages(prev => [...prev, botResponse]);

      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }

    } catch (error) {
      console.error('Error:', error);
      setError('Failed to process your request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-green-50 to-blue-50">
  {/* Header */}
  <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 md:py-4 px-4 md:px-6 shadow-lg">
    <h1 className="text-lg md:text-xl font-bold">Medicare Healthcare Assistant</h1>
  </div>

  {/* Chat Container */}
  <div className="flex-1 overflow-y-auto p-2 md:p-4" ref={chatContainerRef}>
    <div className="max-w-3xl mx-auto">
      {/* Welcome Screen */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="p-4 md:p-8 rounded-lg">
            <img
              src={logoImage}
              alt="Healthcare Assistant"
              className="w-24 h-24 md:w-32 md:h-32 mb-4 md:mb-6 mx-auto rounded-full shadow-md"
            />
            <div className="text-center text-gray-600 space-y-2">
              <p className="text-base md:text-lg font-medium">👋 Hello! I am your healthcare assistant.</p>
              <p className="text-sm md:text-base">How can I help you today?</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((message, index) => (
        <div
          key={index}
          className={`mb-4 md:mb-6 flex ${message.type === 'user' ? 'justify-end' : 'justify-start w-full'}`}
        >
          {message.type === 'user' ? (
            <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg px-3 py-2 md:px-4 md:py-2 max-w-[80%] md:max-w-[70%] shadow-md">
              {message.content}
            </div>
          ) : (
            <div className="bg-white shadow-lg rounded-lg w-full max-w-[90%] md:max-w-[85%] overflow-hidden">
              {/* Report Header */}
              <div className="bg-gradient-to-r from-green-100 to-blue-100 px-4 md:px-6 py-3 border-b border-green-200">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-bold text-green-800 text-sm md:text-base">Medical Consultation Report</span>
                  </div>
                  <span className="text-xs md:text-sm text-blue-600">ID: {message.content.reportId}</span>
                </div>
              </div>

              {/* Report Content */}
              <div className="px-4 md:px-6 py-3 md:py-4">
                <div className="mb-3 md:mb-4">
                  <div className="text-gray-500 text-xs md:text-sm mb-1">Timestamp</div>
                  <div className="text-gray-700 text-sm md:text-base">{message.content.timestamp}</div>
                </div>

                <div className="mb-3 md:mb-4">
                  <div className="text-gray-500 text-xs md:text-sm mb-1">Patient Query</div>
                  <div className="text-gray-700 bg-gray-50 p-2 md:p-3 rounded-md text-sm md:text-base">
                    {message.content.query}
                  </div>
                </div>

                <div className="mb-3 md:mb-4">
                  <div className="text-gray-500 text-xs md:text-sm mb-1">Medical Response</div>
                  <div className="text-gray-700 bg-gradient-to-r from-green-50 to-blue-50 p-2 md:p-3 rounded-md text-sm md:text-base">
                    {formatMessage(message.content.response)}
                  </div>
                </div>
              </div>

              {/* Report Footer */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-4 md:px-6 py-2 md:py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-r from-green-100 to-blue-100 flex items-center justify-center">
                      <span className="text-green-600 text-xs md:text-sm">🤖</span>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadResponse(message.content)}
                    className="text-green-600 hover:text-blue-600 transition-colors text-xs md:text-sm flex items-center space-x-1"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Loading Animation */}
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-white shadow-md rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-center my-2 p-2 bg-red-50 rounded text-sm md:text-base">
          {error}
        </div>
      )}
    </div>
  </div>

  {/* Input Form */}
  <div className="border-t border-gray-200 p-2 md:p-4 bg-white">
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
      <input
        type="text"
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
        placeholder="Type your health-related question..."
        className="flex-1 p-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        disabled={isLoading}
      />
      <button
        type="submit"
        className={`px-3 md:px-4 py-2 rounded-lg transition-colors text-sm md:text-base ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white'
        }`}
        disabled={isLoading}
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
  </div>
</div>
  );
};

export default Chatbot;