// frontend/src/hooks/useChat.ts
import { useState, useCallback } from 'react';
import { floodAPI } from '../services/api';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: Array<{
    agency: string;
    document: string;
    date: string;
    verified: boolean;
  }>;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    // Add user message
    const userMessage: Message = {
      text,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      // Get location if available
      let location;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch (e) {
          console.log('Location permission denied or unavailable');
        }
      }

      const response = await floodAPI.sendChatMessage(text, location);
      
      // Add bot response - sources will be stored but not displayed as "Document X"
      const botMessage: Message = {
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        sources: response.sources, // Keep sources for reference but we'll show custom text
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
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
  };

  return { messages, sendMessage, clearMessages, loading, error };
}