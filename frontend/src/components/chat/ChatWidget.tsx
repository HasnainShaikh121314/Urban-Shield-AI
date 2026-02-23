// src/components/chat/ChatWidget.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { Shield, X, Send } from 'lucide-react';

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
    "What should I do in flood?",
    "How to prepare for earthquake?",
    "Emergency contacts",
    "NDMA guidelines"
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-50"
      >
        <Shield className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[570px] bg-white rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-teal-600 text-white p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h3 className="font-bold text-lg">Urban Shield AI</h3>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Guidy</span>
            </div>
            <p className="text-xs text-white/80 mt-1">
              NDMA official guidelines • Pakistan
            </p>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-blue-300 mx-auto mb-3" />
            <h4 className="text-gray-600 font-medium mb-2">Ask Guidy anything!</h4>
            <p className="text-xs text-gray-400">
              Get official NDMA guidelines for floods, earthquakes, and emergencies
            </p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!msg.isUser && (
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center mr-2 flex-shrink-0">
                <Shield className="h-4 w-4 text-teal-600" />
              </div>
            )}
            <div
              className={`max-w-xs p-3 rounded-lg ${
                msg.isUser
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-none border border-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              
              {/* Show NDMA Guidelines without emoji for bot messages */}
              {!msg.isUser && msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                  NDMA Guidelines
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center mr-2">
              <Shield className="h-4 w-4 text-teal-600 animate-pulse" />
            </div>
            <div className="bg-white text-gray-800 p-3 rounded-lg shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <div className="px-4 py-2 bg-white border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Guidy..."
            className="flex-1 p-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-center text-gray-400 mt-2">
          Following NDMA (National Disaster Management Authority) guidelines
        </p>
      </form>
    </div>
  );
};

export default ChatWidget;