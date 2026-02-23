import { motion } from "framer-motion";
import { ArrowRight, MapPin, Droplets, Shield, CloudRain, Thermometer, Wind, Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { floodAPI } from "@/services/api";
import RiskGauge from "@/components/RiskGauge";
import WeatherCard from "@/components/WeatherCard";
import ForecastChart from "@/components/ForecastChart";

// Pakistani cities organized by province
const PAKISTAN_CITIES = {
  "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha", "Sheikhupura", "Rahim Yar Khan"],
  "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas", "Jacobabad", "Shikarpur", "Dadu", "Thatta"],
  "Khyber Pakhtunkhwa": ["Peshawar", "Mardan", "Abbottabad", "Swat", "Kohat", "Bannu", "Dera Ismail Khan", "Charsadda", "Nowshera", "Mansehra"],
  "Balochistan": ["Quetta", "Gwadar", "Turbat", "Khuzdar", "Chaman", "Sibi", "Loralai", "Zhob", "Dera Bugti", "Panjgur"],
  "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza", "Chilas", "Ghizer"],
  "Azad Kashmir": ["Muzaffarabad", "Mirpur", "Rawalakot", "Kotli", "Bhimber"],
  "Islamabad": ["Islamabad"]
};

const ALL_CITIES = Object.values(PAKISTAN_CITIES).flat().sort();
const QUICK_CITIES = ["Islamabad", "Lahore", "Karachi", "Peshawar", "Quetta", "Gilgit"];

const Dashboard = () => {
  const [selectedCity, setSelectedCity] = useState<string>("Islamabad");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [weatherData, setWeatherData] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter cities by province
  const getFilteredCities = () => {
    if (!selectedProvince) return ALL_CITIES;
    return PAKISTAN_CITIES[selectedProvince as keyof typeof PAKISTAN_CITIES] || [];
  };

  // Fetch data when city changes
  useEffect(() => {
    if (selectedCity) {
      fetchCityData(selectedCity);
    }
  }, [selectedCity]);

  const fetchCityData = async (city: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await floodAPI.predictForCity(city);
      setWeatherData(data.current_weather);
      setPrediction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching city data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare forecast chart data
  const getChartData = () => {
    if (!prediction?.forecast_7day) return [];
    
    return prediction.forecast_7day.slice(0, 7).map((day: any) => ({
      day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      risk: prediction.flood_prediction.risk_score,
      rainfall: day.rain
    }));
  };

  // Get province name for display
  const getProvinceName = (city: string) => {
    for (const [province, cities] of Object.entries(PAKISTAN_CITIES)) {
      if (cities.includes(city)) return province;
    }
    return "Pakistan";
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-700 opacity-90" />
        
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white">
                <Shield className="h-3.5 w-3.5" />
                AI-Powered Protection
              </div>
              <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
                Flood Prediction & Early Warning System
              </h1>
              <p className="mt-4 max-w-lg text-base text-white/70 md:text-lg">
                Leverage machine learning to forecast flood risks with real-time weather data analysis across Pakistan.
              </p>
              
              {/* City Selector */}
              <div className="mt-8 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
                  <MapPin className="h-5 w-5 text-white/60 ml-2" />
                  
                  {/* Province Filter */}
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      setSelectedProvince(e.target.value);
                      if (e.target.value) {
                        const cities = PAKISTAN_CITIES[e.target.value as keyof typeof PAKISTAN_CITIES];
                        if (cities && cities.length > 0) {
                          setSelectedCity(cities[0]);
                        }
                      }
                    }}
                    className="bg-transparent text-white border-none focus:ring-0 py-2 px-2 text-sm"
                  >
                    <option value="" className="text-gray-900">All Provinces</option>
                    {Object.keys(PAKISTAN_CITIES).map((province) => (
                      <option key={province} value={province} className="text-gray-900">{province}</option>
                    ))}
                  </select>

                  <span className="text-white/40">|</span>

                  {/* City Select */}
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="bg-transparent text-white border-none focus:ring-0 py-2 pr-8"
                    disabled={loading}
                  >
                    {getFilteredCities().map((city) => (
                      <option key={city} value={city} className="text-gray-900">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                
                <Link
                  to="/predict"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-600 transition-transform hover:scale-105"
                >
                  Detailed Analysis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {error && (
                <p className="mt-4 text-red-300 text-sm">{error}</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                {loading ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <>
                    <RiskGauge 
                      value={prediction?.flood_prediction?.risk_score || 0} 
                      size={200} 
                      label={`${selectedCity} Flood Risk`} 
                    />
                    <p className="text-center text-white/60 text-xs mt-2">
                      {getProvinceName(selectedCity)} • {prediction?.flood_prediction?.risk_category || "Normal"}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <WeatherCard 
            icon={CloudRain} 
            label="Rainfall" 
            value={weatherData?.rainfall?.toFixed(1) || "0"} 
            unit="mm" 
            trend={prediction?.flood_prediction?.factors?.pressure_trend === "rising" ? "up" : "down"}
            trendValue={weatherData?.rainfall ? `${weatherData.rainfall > 0 ? '+' : ''}${weatherData.rainfall.toFixed(1)}` : "0"}
            delay={0} 
          />
          <WeatherCard 
            icon={Thermometer} 
            label="Temperature" 
            value={weatherData?.temperature?.toFixed(1) || "0"} 
            unit="°C" 
            trend="stable"
            trendValue="±0.5"
            delay={0.1} 
          />
          <WeatherCard 
            icon={Droplets} 
            label="Humidity" 
            value={weatherData?.humidity?.toFixed(0) || "0"} 
            unit="%" 
            trend={weatherData?.humidity > 70 ? "up" : "down"}
            trendValue={`${weatherData?.humidity ? Math.abs(weatherData.humidity - 65).toFixed(0) : '0'}%`}
            delay={0.2} 
          />
          <WeatherCard 
            icon={Wind} 
            label="Wind Speed" 
            value={weatherData?.wind_speed?.toFixed(1) || "0"} 
            unit="m/s" 
            trend={weatherData?.wind_speed > 5 ? "up" : "down"}
            trendValue={(weatherData?.wind_speed - 5).toFixed(1)}
            delay={0.3} 
          />
        </div>
      </section>

      {/* Forecast */}
      <section className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="card-elevated p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ForecastChart data={getChartData()} />
        )}
      </section>

      {/* Weather Alerts Preview */}
      {prediction?.weather_alerts && prediction.weather_alerts.length > 0 && (
        <section className="container mx-auto px-4 pb-8">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Active Weather Alerts for {selectedCity}
            </h3>
            <div className="space-y-2">
              {prediction.weather_alerts.slice(0, 2).map((alert: any, index: number) => (
                <div key={index} className="text-sm text-orange-700">
                  • {alert.message}
                </div>
              ))}
            </div>
            <Link to="/alerts" className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium inline-block">
              View all alerts →
            </Link>
          </div>
        </section>
      )}

      {/* Quick stats */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="card-elevated p-6 text-center"
          >
            <p className="font-mono-data text-3xl font-bold text-primary">
              {prediction?.flood_prediction?.risk_score || 0}%
            </p>
            <p className="mt-1 font-heading text-sm font-semibold text-foreground">Current Flood Risk</p>
            <p className="text-xs text-muted-foreground">{selectedCity}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="card-elevated p-6 text-center"
          >
            <p className="font-mono-data text-3xl font-bold text-primary">
              {prediction?.weather_alerts?.length || 0}
            </p>
            <p className="mt-1 font-heading text-sm font-semibold text-foreground">Active Weather Alerts</p>
            <p className="text-xs text-muted-foreground">Heatwave • Cold • Storm</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="card-elevated p-6 text-center"
          >
            <p className="font-mono-data text-3xl font-bold text-primary">
              {(prediction?.flood_prediction?.confidence * 100 || 0).toFixed(1)}%
            </p>
            <p className="mt-1 font-heading text-sm font-semibold text-foreground">Prediction Confidence</p>
            <p className="text-xs text-muted-foreground">ML Model Accuracy</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;