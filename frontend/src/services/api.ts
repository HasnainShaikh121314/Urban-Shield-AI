// src/services/api.ts
const API_BASE_URL = 'http://localhost:5000';

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  pressure: number;
  city: string;
}

export interface FloodPrediction {
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
}

export interface WeatherAlert {
  alert_type: string;
  severity: 'MODERATE' | 'HIGH' | 'CRITICAL';
  message: string;
  temperature?: number;
  wind_speed?: number;
  rainfall?: number;
  start_date?: string;
  end_date?: string;
  actions: string[];
}

export interface ForecastDay {
  date: string;
  max_temp: number;
  min_temp: number;
  avg_temp: number;
  rain: number;
  wind_speed: number;
  humidity: number;
}

export interface PredictionResponse {
  city: string;
  timestamp: string;
  current_weather: CurrentWeather;
  flood_prediction: FloodPrediction;
  weather_alerts: WeatherAlert[];
  forecast_7day: ForecastDay[];
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
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unhealthy', message: 'Cannot connect to backend' };
    }
  }

  async predictForCity(city: string): Promise<PredictionResponse> {
    const response = await fetch(`${this.baseUrl}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ city }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Prediction failed');
    }

    return response.json();
  }

  async sendChatMessage(message: string, city?: string) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        city,
      }),
    });

    if (!response.ok) {
      throw new Error('Chat request failed');
    }

    return response.json();
  }
}

export const floodAPI = new FloodGuardAPI();