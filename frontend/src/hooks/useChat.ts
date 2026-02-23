// src/hooks/useChat.ts
import { useState, useCallback } from 'react';
import { floodAPI } from '../services/api';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: any[];
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    // Prevent empty messages
    if (!text.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await floodAPI.sendChatMessage(text.trim());
      
      // Add bot response
      const botMessage: Message = {
        text: response.response || "I couldn't process your request.",
        isUser: false,
        timestamp: new Date(),
        sources: response.sources || []
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Add error message
      const errorMessage: Message = {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return { messages, sendMessage, clearMessages, loading, error };
}
