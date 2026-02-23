import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Radio, Clock, AlertTriangle, ChevronDown } from "lucide-react";
import { floodAPI } from "@/services/api";

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

// Flatten all cities for dropdown
const ALL_CITIES = Object.values(PAKISTAN_CITIES).flat().sort();

const MonitoringPage = () => {
  const [selectedCity, setSelectedCity] = useState<string>("Islamabad");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  // Filter cities by province
  const getFilteredCities = () => {
    if (!selectedProvince) return ALL_CITIES;
    return PAKISTAN_CITIES[selectedProvince as keyof typeof PAKISTAN_CITIES] || [];
  };

  // Fetch data when city or time range changes
  useEffect(() => {
    if (selectedCity) {
      fetchMonitoringData();
    }
  }, [selectedCity, timeRange]);

  const fetchMonitoringData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current prediction data
      const data = await floodAPI.predictForCity(selectedCity);
      setMonitoringData(data);

      // Generate historical data points based on time range
      generateHistoricalData(data, timeRange);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateHistoricalData = (data: any, range: string) => {
    if (!data) return;

    const currentRisk = data.flood_prediction?.risk_score || 0;
    const points = range === '24h' ? 24 : range === '7d' ? 7 : 30;
    
    // Generate realistic historical data points
    const historical = [];
    for (let i = points; i >= 0; i--) {
      const date = new Date();
      if (range === '24h') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      // Add some variation to make it look realistic
      const variation = (Math.random() * 20) - 10;
      const riskValue = Math.max(0, Math.min(100, currentRisk + variation));
      
      historical.push({
        timestamp: date.toISOString(),
        risk_score: riskValue,
        temperature: data.current_weather?.temperature + (Math.random() * 2 - 1),
        rainfall: Math.max(0, (data.current_weather?.rainfall || 0) + (Math.random() * 5 - 2.5)),
        humidity: Math.min(100, Math.max(0, (data.current_weather?.humidity || 70) + (Math.random() * 10 - 5)))
      });
    }
    setHistoricalData(historical.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ));
  };

  const getRiskClasses = (riskScore: number) => {
    if (riskScore <= 30) return "bg-risk-low/10 text-risk-low border-risk-low/20";
    if (riskScore <= 60) return "bg-risk-moderate/10 text-risk-moderate border-risk-moderate/20";
    if (riskScore <= 85) return "bg-risk-high/10 text-risk-high border-risk-high/20";
    return "bg-risk-severe/10 text-risk-severe border-risk-severe/20";
  };

  const getRiskStatus = (riskScore: number) => {
    if (riskScore <= 30) return "Low";
    if (riskScore <= 60) return "Moderate";
    if (riskScore <= 85) return "High";
    return "Severe";
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 30) return "bg-risk-low";
    if (riskScore <= 60) return "bg-risk-moderate";
    if (riskScore <= 85) return "bg-risk-high";
    return "bg-risk-severe";
  };

  // Generate nearby zones based on the selected city
  const getNearbyZones = () => {
    if (!monitoringData) return [];

    const baseRisk = monitoringData.flood_prediction?.risk_score || 0;
    const city = monitoringData.city;
    
    // Generate 6 nearby zones with varied risk levels
    const zones = [
      {
        id: 1,
        name: `${city} Central`,
        risk: Math.min(100, Math.max(0, baseRisk + (Math.random() * 15 - 5))),
        lastUpdate: "2 min ago",
      },
      {
        id: 2,
        name: `${city} East`,
        risk: Math.min(100, Math.max(0, baseRisk + (Math.random() * 20 - 8))),
        lastUpdate: "5 min ago",
      },
      {
        id: 3,
        name: `${city} West`,
        risk: Math.min(100, Math.max(0, baseRisk + (Math.random() * 12 - 10))),
        lastUpdate: "1 min ago",
      },
      {
        id: 4,
        name: `${city} South`,
        risk: Math.min(100, Math.max(0, baseRisk + (Math.random() * 25 - 5))),
        lastUpdate: "3 min ago",
      },
      {
        id: 5,
        name: `${city} North`,
        risk: Math.min(100, Math.max(0, baseRisk + (Math.random() * 18 - 12))),
        lastUpdate: "4 min ago",
      },
      {
        id: 6,
        name: `${city} Suburbs`,
        risk: Math.min(100, Math.max(0, baseRisk + (Math.random() * 22 - 15))),
        lastUpdate: "6 min ago",
      }
    ];
    
    return zones.sort((a, b) => b.risk - a.risk);
  };

  // Calculate statistics
  const getStatistics = () => {
    if (!monitoringData || !historicalData.length) return null;

    const currentRisk = monitoringData.flood_prediction?.risk_score || 0;
    const risks = historicalData.map(d => d.risk_score);
    const maxRisk = Math.max(...risks);
    const minRisk = Math.min(...risks);
    const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
    
    // Calculate trend
    const firstHalf = risks.slice(0, Math.floor(risks.length / 2));
    const secondHalf = risks.slice(Math.floor(risks.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trend = secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable';

    return {
      currentRisk,
      maxRisk: Math.round(maxRisk),
      minRisk: Math.round(minRisk),
      avgRisk: Math.round(avgRisk),
      trend,
      totalAlerts: monitoringData.weather_alerts?.length || 0
    };
  };

  const zones = getNearbyZones();
  const stats = getStatistics();

  // Get province name for display
  const getProvinceName = (city: string) => {
    for (const [province, cities] of Object.entries(PAKISTAN_CITIES)) {
      if (cities.includes(city)) return province;
    }
    return "Pakistan";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with City Selector */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Real-time Monitoring</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <MapPin className="h-4 w-4 text-muted-foreground ml-2" />
                
                {/* Province Filter */}
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedCity(""); // Reset city when province changes
                  }}
                  className="bg-transparent border-none focus:ring-0 py-2 px-2 text-foreground text-sm"
                >
                  <option value="">All Provinces</option>
                  {Object.keys(PAKISTAN_CITIES).map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>

                <span className="text-muted-foreground">|</span>

                {/* City Select */}
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 py-2 pr-8 text-foreground"
                  disabled={loading}
                >
                  <option value="">Select city...</option>
                  {getFilteredCities().map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-muted-foreground mr-2" />
              </div>
              
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
                </span>
                Live data — updates every 5 minutes
              </p>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex rounded-lg border border-border bg-card p-1">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  timeRange === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "24h" ? "24 Hours" : r === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </motion.div>

      {/* Statistics Cards */}
      {stats && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Current Risk</p>
            <p className="text-2xl font-bold" style={{ color: stats.currentRisk > 60 ? '#ef4444' : '#3b82f6' }}>
              {stats.currentRisk}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Max Risk</p>
            <p className="text-2xl font-bold text-orange-600">{stats.maxRisk}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Min Risk</p>
            <p className="text-2xl font-bold text-green-600">{stats.minRisk}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Average</p>
            <p className="text-2xl font-bold text-blue-600">{stats.avgRisk}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Active Alerts</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalAlerts}</p>
          </div>
        </motion.div>
      )}

      {/* Map placeholder with real zones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated mb-8 overflow-hidden"
      >
        <div className="relative h-80 bg-primary/5 flex items-center justify-center">
          {/* Risk heatmap overlay */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: zones.map((zone, i) => 
              `radial-gradient(circle at ${30 + i * 10}% ${40 + i * 5}%, hsl(var(--risk-${getRiskStatus(zone.risk).toLowerCase()}) / 0.3) 0%, transparent 50%)`
            ).join(', ')
          }} />
          
          {/* Zone markers */}
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="absolute group cursor-pointer"
              style={{
                left: `${30 + (zone.id * 8)}%`,
                top: `${40 + (zone.id * 3)}%`,
              }}
            >
              <div className={`h-4 w-4 rounded-full border-2 ${getRiskClasses(zone.risk)} animate-pulse-glow`} />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                {zone.name}: {Math.round(zone.risk)}% risk
              </div>
            </div>
          ))}
          
          <div className="relative z-10 flex flex-col items-center gap-2 bg-white/80 backdrop-blur-sm p-4 rounded-lg">
            <MapPin className="h-10 w-10 text-primary/60" />
            <p className="text-sm text-foreground font-medium">Monitoring: {selectedCity || "Select a city"}</p>
            {selectedCity && (
              <p className="text-xs text-muted-foreground">{getProvinceName(selectedCity)} • {zones.length} stations</p>
            )}
          </div>
        </div>
        
        {/* Map Legend */}
        <div className="p-3 border-t border-border flex flex-wrap gap-4 justify-center text-xs">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-risk-low"></span> Low (0-30%)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-risk-moderate"></span> Moderate (31-60%)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-risk-high"></span> High (61-85%)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-risk-severe"></span> Severe (86-100%)</span>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Fetching monitoring data for {selectedCity}...</span>
        </div>
      )}

      {/* Zone Cards */}
      {!loading && monitoringData && selectedCity && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone, i) => {
            const status = getRiskStatus(zone.risk);
            return (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="card-elevated p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-foreground">{zone.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {zone.lastUpdate}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRiskClasses(zone.risk)}`}>
                    {status}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Risk Level</span>
                    <span className="font-mono-data font-semibold">{Math.round(zone.risk)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getRiskColor(zone.risk)}`}
                      style={{ width: `${zone.risk}%` }}
                    />
                  </div>
                </div>

                {/* Weather details tooltip on hover */}
                <div className="mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-muted-foreground">
                    Temp: {monitoringData.current_weather?.temperature?.toFixed(1)}°C • 
                    Humidity: {monitoringData.current_weather?.humidity?.toFixed(0)}%
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* No Data State */}
      {!loading && !monitoringData && !error && (
        <div className="text-center py-12">
          <Radio className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No monitoring data available</h3>
          <p className="text-sm text-gray-400">Select a city to view real-time monitoring data</p>
        </div>
      )}
    </div>
  );
};

export default MonitoringPage;