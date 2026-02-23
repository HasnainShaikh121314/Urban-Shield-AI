// src/services/api.ts
console.log('🔍 DEBUG: Starting API service');
console.log('🔍 DEBUG: import.meta.env:', import.meta.env);
console.log('🔍 DEBUG: VITE_API_URL from env:', import.meta.env.VITE_API_URL);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
console.log('🔍 DEBUG: Final API_BASE_URL:', API_BASE_URL);

export interface PredictionInput {
  rainfall?: number;
  rainfall_3day?: number;
  rainfall_7day?: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  lat?: number;
  lng?: number;
  city?: string;
}

export interface Alert {
  alert_type: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  message: string;
  temperature?: number;
  rainfall?: number;
  wind_speed?: number;
  actions: string[];
}

export interface PredictionResponse {
  city: string;
  timestamp: string;
  current_weather: {
    temperature: number;
    humidity: number;
    rainfall: number;
    wind_speed: number;
    pressure: number;
    city: string;
  };
  flood_prediction: {
    prediction: number;
    risk_score: number;
    risk_category: 'Low' | 'Moderate' | 'High' | 'Severe';
    color: 'green' | 'yellow' | 'orange' | 'red';
    confidence: number;
    factors: {
      rainfall_3day: number;
      pressure_trend: 'rising' | 'falling' | 'stable';
      soil_saturation: number;
      current_rainfall: number;
      temperature: number;
      humidity: number;
    };
  };
  weather_alerts: Alert[];
  forecast_7day: Array<{
    date: string;
    max_temp: number;
    min_temp: number;
    avg_temp: number;
    rain: number;
    wind_speed: number;
    humidity: number;
  }>;
  recommendations: string[];
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    agency: string;
    document: string;
    date: string;
    verified: boolean;
  }>;
  suggestions: string[];
  emergency: boolean;
  verification_badge?: string;
}

class FloodGuardAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('🔍 DEBUG: API instance created with baseUrl:', this.baseUrl);
  }

  async checkHealth() {
    console.log('🔍 DEBUG: Calling health check at:', `${this.baseUrl}/health`);
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('🔍 DEBUG: Health response status:', response.status);
      const data = await response.json();
      console.log('🔍 DEBUG: Health data:', data);
      return data;
    } catch (error) {
      console.error('🔍 DEBUG: Health check failed:', error);
      return { status: 'unhealthy', message: 'Cannot connect to backend' };
    }
  }

  async predictForCity(city: string): Promise<PredictionResponse> {
    console.log('🔍 DEBUG: Predicting for city:', city);
    console.log('🔍 DEBUG: POST to:', `${this.baseUrl}/api/predict`);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ city }),
      });

      console.log('🔍 DEBUG: Predict response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Prediction failed');
      }

      const data = await response.json();
      console.log('🔍 DEBUG: Predict data received');
      return data;
    } catch (error) {
      console.error('🔍 DEBUG: Predict error:', error);
      throw error;
    }
  }

  async sendChatMessage(message: string, location?: { lat: number; lng: number }) {
    console.log('🔍 DEBUG: Sending chat message');
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          message,
          location,
        }),
      });

      console.log('🔍 DEBUG: Chat response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      return response.json();
    } catch (error) {
      console.error('🔍 DEBUG: Chat error:', error);
      throw error;
    }
  }
}

export const floodAPI = new FloodGuardAPI();
