// src/pages/Predict.tsx
import React, { useState } from 'react';
import { floodAPI } from '../services/api';
import { 
  CloudRain, Thermometer, Droplets, Wind, Gauge, 
  AlertTriangle, Sun, CloudSnow, CloudLightning,
  MapPin, Calendar, Clock, ChevronDown, Shield,
  AlertCircle, CheckCircle
} from 'lucide-react';

// ============================================
// ALL 51 PAKISTANI CITIES FROM YOUR DATASET
// ============================================
const PAKISTAN_CITIES = {
  // ========== PUNJAB (10 cities) ==========
  "Punjab": [
    "Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala",
    "Sialkot", "Bahawalpur", "Sargodha", "Sheikhupura", "Rahim Yar Khan"
  ],
  
  // ========== SINDH (10 cities) ==========
  "Sindh": [
    "Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah",
    "Mirpur Khas", "Jacobabad", "Shikarpur", "Dadu", "Thatta"
  ],
  
  // ========== KHYBER PAKHTUNKHWA (10 cities) ==========
  "Khyber Pakhtunkhwa": [
    "Peshawar", "Mardan", "Abbottabad", "Swat", "Kohat",
    "Bannu", "Dera Ismail Khan", "Charsadda", "Nowshera", "Mansehra"
  ],
  
  // ========== BALOCHISTAN (10 cities) ==========
  "Balochistan": [
    "Quetta", "Gwadar", "Turbat", "Khuzdar", "Chaman",
    "Sibi", "Loralai", "Zhob", "Dera Bugti", "Panjgur"
  ],
  
  // ========== GILGIT-BALTISTAN (5 cities) ==========
  "Gilgit-Baltistan": [
    "Gilgit", "Skardu", "Hunza", "Chilas", "Ghizer"
  ],
  
  // ========== AZAD KASHMIR (5 cities) ==========
  "Azad Kashmir": [
    "Muzaffarabad", "Mirpur", "Rawalakot", "Kotli", "Bhimber"
  ],
  
  // ========== ISLAMABAD CAPITAL TERRITORY ==========
  "Islamabad": ["Islamabad"]
};

// Flatten cities array for dropdown
const ALL_CITIES = Object.values(PAKISTAN_CITIES).flat().sort();

interface PredictionResult {
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
  weather_alerts: Array<{
    alert_type: string;
    severity: 'MODERATE' | 'HIGH' | 'CRITICAL';
    message: string;
    temperature?: number;
    wind_speed?: number;
    rainfall?: number;
    start_date?: string;
    end_date?: string;
    actions: string[];
  }>;
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

const Predict = () => {
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  // Filter cities by province if selected
  const getFilteredCities = () => {
    if (!selectedProvince) return ALL_CITIES;
    return PAKISTAN_CITIES[selectedProvince as keyof typeof PAKISTAN_CITIES] || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity) {
      setError('Please select a city');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await floodAPI.predictForCity(selectedCity);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    if (type.includes('HEAT')) return <Sun className="h-5 w-5 text-orange-500" />;
    if (type.includes('COLD')) return <CloudSnow className="h-5 w-5 text-blue-500" />;
    if (type.includes('STORM') || type.includes('WIND')) return <CloudLightning className="h-5 w-5 text-purple-500" />;
    if (type.includes('RAIN')) return <CloudRain className="h-5 w-5 text-blue-500" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getFloodDisplay = () => {
    if (!result?.flood_prediction) return null;
    
    const pred = result.flood_prediction;
    const isFlood = pred.prediction === 1;
    
    return {
      isFlood,
      message: isFlood ? "FLOOD PREDICTED" : "NO FLOOD PREDICTED",
      icon: isFlood ? AlertCircle : CheckCircle,
      color: isFlood ? 'red' : 'green',
      bgColor: isFlood ? 'bg-red-50' : 'bg-green-50',
      textColor: isFlood ? 'text-red-700' : 'text-green-700',
      borderColor: isFlood ? 'border-red-200' : 'border-green-200'
    };
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Flood Prediction - Pakistan</h1>
      <p className="text-gray-600 mb-8">Select a city from any province to check flood risk using ML model</p>
      
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="grid md:grid-cols-3 gap-3">
          {/* Province Filter */}
          <div className="relative">
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedCity(''); // Reset city when province changes
              }}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">All Provinces</option>
              {Object.keys(PAKISTAN_CITIES).map((province) => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          </div>

          {/* City Select */}
          <div className="relative md:col-span-2">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              disabled={loading}
            >
              <option value="">Select a city...</option>
              {getFilteredCities().map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedCity}
            className="md:col-span-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Analyzing {selectedCity}...</span>
              </div>
            ) : (
              'Predict Flood Risk'
            )}
          </button>
        </div>

        {/* City Count Info */}
        <p className="text-xs text-gray-400 mt-2 text-center">
          {ALL_CITIES.length} cities available across Pakistan • Select province to filter
        </p>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* City Header with Province Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{result.city}</h2>
                <p className="text-gray-500 flex items-center gap-1 mt-1">
                  <Clock className="h-4 w-4" />
                  {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {Object.entries(PAKISTAN_CITIES).find(([, cities]) => 
                  cities.includes(result.city)
                )?.[0] || 'Pakistan'}
              </div>
            </div>
          </div>

          {/* Current Weather */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-blue-500" />
              Current Weather in {result.city}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Temperature</p>
                <p className="text-xl font-semibold">{result.current_weather.temperature}°C</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Humidity</p>
                <p className="text-xl font-semibold">{result.current_weather.humidity}%</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Rainfall</p>
                <p className="text-xl font-semibold">{result.current_weather.rainfall}mm</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Wind Speed</p>
                <p className="text-xl font-semibold">{result.current_weather.wind_speed} m/s</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Pressure</p>
                <p className="text-xl font-semibold">{result.current_weather.pressure} hPa</p>
              </div>
            </div>
          </div>

          {/* ML Model Prediction */}
          <div className={`rounded-lg shadow-lg p-6 ${
            getFloodDisplay()?.bgColor || 'bg-gray-50'
          } border ${
            getFloodDisplay()?.borderColor || 'border-gray-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${
                getFloodDisplay()?.isFlood ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {getFloodDisplay()?.isFlood ? (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">
                  ML Model Prediction: <span className={
                    getFloodDisplay()?.isFlood ? 'text-red-600' : 'text-green-600'
                  }>
                    {getFloodDisplay()?.message}
                  </span>
                </h3>
                <p className="text-sm text-gray-600">
                  Confidence: {(result.flood_prediction.confidence * 100).toFixed(1)}% • 
                  Risk Score: {result.flood_prediction.risk_score}% • 
                  Category: {result.flood_prediction.risk_category}
                </p>
              </div>
            </div>
            
            {/* Key Factors */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-2 bg-white rounded">
                <p className="text-xs text-gray-500">3-Day Rainfall</p>
                <p className="text-lg font-semibold">{result.flood_prediction.factors.rainfall_3day}mm</p>
              </div>
              <div className="p-2 bg-white rounded">
                <p className="text-xs text-gray-500">Pressure Trend</p>
                <p className="text-lg font-semibold capitalize">{result.flood_prediction.factors.pressure_trend}</p>
              </div>
              <div className="p-2 bg-white rounded">
                <p className="text-xs text-gray-500">Soil Saturation</p>
                <p className="text-lg font-semibold">{result.flood_prediction.factors.soil_saturation}%</p>
              </div>
              <div className="p-2 bg-white rounded">
                <p className="text-xs text-gray-500">Current Rain</p>
                <p className="text-lg font-semibold">{result.flood_prediction.factors.current_rainfall}mm</p>
              </div>
            </div>
          </div>

          {/* Weather Alerts */}
          {result.weather_alerts && result.weather_alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Weather Alerts
              </h3>
              
              <div className="space-y-4">
                {result.weather_alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.alert_type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{alert.alert_type}</h4>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-50">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm mb-3">{alert.message}</p>
                        {alert.start_date && (
                          <p className="text-xs mb-2">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(alert.start_date).toLocaleDateString()}
                            {alert.end_date && ` - ${new Date(alert.end_date).toLocaleDateString()}`}
                          </p>
                        )}
                        <ul className="text-xs space-y-1 list-disc list-inside">
                          {alert.actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-Day Forecast */}
          {result.forecast_7day && result.forecast_7day.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">7-Day Forecast</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {result.forecast_7day.slice(0, 5).map((day, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded text-center">
                    <p className="text-xs text-gray-500 mb-1">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-sm font-semibold">{day.max_temp}° / {day.min_temp}°C</p>
                    <p className="text-xs text-gray-600 mt-1">Rain: {day.rain}mm</p>
                    <p className="text-xs text-gray-600">Wind: {day.wind_speed} m/s</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">Recommended Actions</h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-blue-700">
                    <Shield className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!result && !loading && !error && (
        <div className="text-center py-12">
          <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-500 mb-2">Select a City</h3>
          <p className="text-gray-400">Choose from {ALL_CITIES.length} cities across Pakistan</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Analyzing Weather Data...</h3>
          <p className="text-gray-400">Running ML model for {selectedCity}</p>
        </div>
      )}
    </div>
  );
};

export default Predict;