import React, { createContext, useContext, useState, ReactNode } from 'react';
import { floodAPI, ChatResponse } from '../services/api';

interface ChatContextType {
  messages: Array<{ text: string; isUser: boolean; timestamp: Date; sources?: any[] }>;
  sendMessage: (message: string) => Promise<void>;
  loading: boolean;
  clearHistory: () => void;
  sessionId: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean; timestamp: Date; sources?: any[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substring(2, 15));

  const sendMessage = async (message: string) => {
    // Add user message
    setMessages(prev => [...prev, { 
      text: message, 
      isUser: true, 
      timestamp: new Date() 
    }]);
    
    setLoading(true);
    
    try {
      // Get location if available
      let location;
      if (navigator.geolocation) {
        // You might want to get this from your app's location context instead
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        }).catch(() => null);
        
        if (position) {
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        }
      }

      const response = await floodAPI.sendChatMessage(message, sessionId, location);
      
      // Add bot response with sources
      setMessages(prev => [...prev, { 
        text: response.response, 
        isUser: false, 
        timestamp: new Date(),
        sources: response.sources
      }]);
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please try again.', 
        isUser: false, 
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    floodAPI.clearChatSession(sessionId);
  };

  return (
    <ChatContext.Provider value={{ messages, sendMessage, loading, clearHistory, sessionId }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}