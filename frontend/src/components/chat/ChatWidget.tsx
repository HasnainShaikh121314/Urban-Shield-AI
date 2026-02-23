// src/components/chat/ChatWidget.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { Shield, X, Send } from 'lucide-react';
import icon from '../assets/icon.png'; // ✅ Import the image

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, loading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await sendMessage(input);
    setInput('');
  };

  // Suggested questions
  const suggestedQuestions = [
    "Flood safety?",
    "Earthquake tips?",
    "Emergency contacts",
    "NDMA guide"
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-700 to-teal-600 text-white p-3 rounded-full shadow-lg hover:from-blue-800 hover:to-teal-700 z-50 transition-all hover:scale-110"
        title="Ask UrbanShield AI"
        aria-label="Open chat"
      >
        <img 
          src={icon} 
          alt="UrbanShield AI" 
          className="h-6 w-6 object-contain"
        />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[90vw] max-w-sm bg-white rounded-lg shadow-xl flex flex-col z-50 border border-gray-200" style={{ height: 'min(80vh, 600px)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-teal-600 text-white px-3 py-2 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img 
            src={icon}
            alt="UrbanShield AI" 
            className="h-6 w-6 object-contain rounded-full bg-white/20 p-1 flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-bold text-sm truncate">UrbanShield AI</span>
              <span className="text-[8px] bg-white/20 px-1 rounded whitespace-nowrap">Guidy</span>
            </div>
            <span className="text-[8px] text-white/70 truncate">NDMA Pakistan</span>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="p-0.5 flex-shrink-0 hover:bg-white/10 rounded transition-colors"
          aria-label="Close chat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 text-xs">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <img 
              src={icon}
              alt="UrbanShield AI" 
              className="h-10 w-10 mx-auto mb-2 opacity-50"
            />
            <p className="text-[10px] text-gray-500">Ask Guidy about disasters</p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            {!msg.isUser && (
              <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center mr-1 flex-shrink-0">
                <img 
                  src={icon}
                  alt="Guidy" 
                  className="h-3 w-3 object-contain"
                />
              </div>
            )}
            <div className={`max-w-[80%] p-1.5 rounded-lg break-words ${
              msg.isUser
                ? 'bg-blue-600 text-white text-[11px] rounded-br-none'
                : 'bg-white text-gray-800 text-[11px] rounded-bl-none border'
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              {!msg.isUser && msg.sources && msg.sources.length > 0 && (
                <div className="mt-0.5 pt-0.5 border-t border-gray-200 text-[8px] text-gray-400">
                  NDMA Guidelines
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center mr-1">
              <img 
                src={icon}
                alt="Guidy is typing" 
                className="h-3 w-3 object-contain"
              />
            </div>
            <div className="bg-white p-1.5 rounded-lg">
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="px-2 py-1 bg-white border-t overflow-x-auto">
          <div className="flex flex-nowrap gap-1 pb-1">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded-full hover:bg-gray-200 whitespace-nowrap transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-1.5 bg-white border-t">
        <div className="flex gap-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Guidy..."
            className="flex-1 p-1 text-[10px] border rounded-full px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-1 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-full disabled:opacity-50 flex-shrink-0 hover:from-blue-700 hover:to-teal-600 transition-all"
            aria-label="Send message"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWidget;
