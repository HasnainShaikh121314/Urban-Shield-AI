import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Bell, BellRing, Mail, MessageSquare, Smartphone, 
  MapPin, AlertTriangle, CheckCircle, Clock, Sun,
  CloudSnow, CloudLightning, CloudRain, Wind, Droplets,
  ChevronDown, Shield
} from "lucide-react";
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

const ALL_CITIES = Object.values(PAKISTAN_CITIES).flat().sort();

const AlertsPage = () => {
  const [selectedCity, setSelectedCity] = useState<string>("Islamabad");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [threshold, setThreshold] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionData, setPredictionData] = useState<any>(null);
  
  // Notification methods state
  const [methods, setMethods] = useState({ 
    email: true, 
    sms: false, 
    push: true 
  });

  // Filter cities by province
  const getFilteredCities = () => {
    if (!selectedProvince) return ALL_CITIES;
    return PAKISTAN_CITIES[selectedProvince as keyof typeof PAKISTAN_CITIES] || [];
  };

  // Fetch alerts when city changes
  useEffect(() => {
    if (selectedCity) {
      fetchAlerts();
    }
  }, [selectedCity]);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await floodAPI.predictForCity(selectedCity);
      setPredictionData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMethod = (method: keyof typeof methods) => {
    setMethods((prev) => ({ ...prev, [method]: !prev[method] }));
  };

  const saveConfiguration = () => {
    alert(`Alert configuration saved for ${selectedCity}!\nThreshold: ${threshold}%\nMethods: ${
      Object.entries(methods).filter(([, v]) => v).map(([k]) => k).join(', ')
    }`);
  };

  // Generate active alerts from prediction data
  const getActiveAlerts = () => {
    if (!predictionData) return [];

    const alerts = [];
    const floodRisk = predictionData.flood_prediction?.risk_score || 0;
    const weatherAlerts = predictionData.weather_alerts || [];

    // Add flood alert if risk is high enough
    if (floodRisk >= threshold) {
      let category = "Moderate";
      let message = "Moderate flood risk detected. Stay informed.";
      
      if (floodRisk >= 85) {
        category = "Severe";
        message = "Critical flood risk detected. Immediate action recommended.";
      } else if (floodRisk >= 70) {
        category = "High";
        message = "Water levels rising rapidly. Prepare for possible evacuation.";
      } else if (floodRisk >= 50) {
        category = "Moderate";
        message = "Moderate flood risk. Monitor weather updates.";
      }

      alerts.push({
        id: 1,
        type: "FLOOD",
        zone: `${selectedCity} Area`,
        risk: floodRisk,
        category,
        message,
        time: "Just now",
        icon: AlertTriangle,
        color: floodRisk >= 85 ? "red" : floodRisk >= 70 ? "orange" : "yellow"
      });
    }

    // Add weather alerts
    weatherAlerts.forEach((alert: any, index: number) => {
      let icon = AlertTriangle;
      let color = "yellow";
      
      if (alert.alert_type.includes('HEAT')) {
        icon = Sun;
        color = "orange";
      } else if (alert.alert_type.includes('COLD')) {
        icon = CloudSnow;
        color = "blue";
      } else if (alert.alert_type.includes('STORM')) {
        icon = CloudLightning;
        color = "purple";
      } else if (alert.alert_type.includes('RAIN')) {
        icon = CloudRain;
        color = "blue";
      } else if (alert.alert_type.includes('WIND')) {
        icon = Wind;
        color = "gray";
      }

      alerts.push({
        id: alerts.length + 1,
        type: alert.alert_type,
        zone: alert.alert_type.includes('FORECAST') ? `${selectedCity} (Forecast)` : selectedCity,
        risk: alert.temperature || alert.wind_speed || 0,
        category: alert.severity,
        message: alert.message,
        time: "Just now",
        icon,
        color: alert.severity === 'CRITICAL' ? 'red' : 
               alert.severity === 'HIGH' ? 'orange' : 'yellow',
        actions: alert.actions
      });
    });

    return alerts.slice(0, 5);
  };

  // Generate past alerts (simulated history)
  const getPastAlerts = () => {
    if (!predictionData) return [];

    const pastAlerts = [];
    const baseRisk = predictionData.flood_prediction?.risk_score || 50;
    
    const times = ["2 hours ago", "5 hours ago", "1 day ago", "3 days ago", "1 week ago", "2 weeks ago"];
    const categories = ["Moderate", "High", "Moderate", "Low", "Moderate", "Low"];
    const zones = [
      `${selectedCity} East`,
      `${selectedCity} West`,
      `${selectedCity} Central`,
      `${selectedCity} North`,
      `${selectedCity} South`,
      `${selectedCity} Suburbs`
    ];

    for (let i = 0; i < 6; i++) {
      pastAlerts.push({
        id: i + 10,
        zone: zones[i % zones.length],
        risk: Math.max(20, Math.min(80, baseRisk + (Math.random() * 20 - 10))),
        category: categories[i % categories.length],
        time: times[i % times.length],
        resolved: true
      });
    }

    return pastAlerts;
  };

  const activeAlerts = getActiveAlerts();
  const pastAlerts = getPastAlerts();

  const getCategoryClasses = (cat: string) => {
    switch (cat) {
      case "Moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "High": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Severe": return "bg-red-100 text-red-800 border-red-200";
      case "CRITICAL": return "bg-red-100 text-red-800 border-red-200";
      case "HIGH": return "bg-orange-100 text-orange-800 border-orange-200";
      case "MODERATE": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case "red": return "text-red-500";
      case "orange": return "text-orange-500";
      case "yellow": return "text-yellow-500";
      case "blue": return "text-blue-500";
      case "purple": return "text-purple-500";
      default: return "text-gray-500";
    }
  };

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
            <h1 className="font-heading text-3xl font-bold text-foreground">Alerts & Notifications</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <MapPin className="h-4 w-4 text-muted-foreground ml-2" />
                
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
                  {getFilteredCities().map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-muted-foreground mr-2" />
              </div>
              <p className="text-sm text-muted-foreground">
                {getProvinceName(selectedCity)} • {selectedCity}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Fetching alerts for {selectedCity}...</span>
        </div>
      )}

      {!loading && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Active Alerts */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <BellRing className="h-5 w-5 text-red-500" />
              Active Alerts ({activeAlerts.length})
            </h2>
            
            {activeAlerts.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-700">No Active Alerts</h3>
                <p className="text-sm text-gray-500 mt-1">All clear for {selectedCity}, {getProvinceName(selectedCity)}</p>
              </div>
            ) : (
              activeAlerts.map((alert, i) => {
                const Icon = alert.icon;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`card-elevated p-5 border-l-4 ${
                      alert.category === "Severe" || alert.category === "CRITICAL" 
                        ? "border-l-red-500" 
                        : alert.category === "High" || alert.category === "HIGH"
                        ? "border-l-orange-500"
                        : "border-l-yellow-500"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${getIconColor(alert.color)}`} />
                          {alert.zone}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {alert.time}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryClasses(alert.category)}`}>
                        {alert.type === "FLOOD" ? `${Math.round(alert.risk)}% — ` : ""}{alert.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    
                    {alert.actions && alert.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-semibold text-foreground mb-2">Recommended Actions:</p>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          {alert.actions.slice(0, 3).map((action: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* Past Alerts */}
            <h2 className="font-heading text-lg font-semibold text-foreground mt-8 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Past Alerts
            </h2>
            
            {pastAlerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="card-elevated p-4 opacity-70"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{alert.zone}</p>
                      <p className="text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryClasses(alert.category)}`}>
                    {alert.category}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Configuration Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-elevated p-6 h-fit space-y-6"
          >
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Alert Configuration for {selectedCity}
            </h3>
            <p className="text-xs text-muted-foreground -mt-2">{getProvinceName(selectedCity)}</p>

            {/* Risk Threshold Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Risk Threshold</label>
                <span className="font-mono-data text-sm font-semibold text-primary">{threshold}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>10% (Low)</span>
                <span>50% (Moderate)</span>
                <span>90% (Severe)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Current flood risk: {predictionData?.flood_prediction?.risk_score || 0}%
              </p>
            </div>

            {/* Notification Methods */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Notification Methods</p>
              <div className="space-y-3">
                {[
                  { key: "email" as const, icon: Mail, label: "Email", description: "Get alerts via email" },
                  { key: "sms" as const, icon: Smartphone, label: "SMS", description: "Text message alerts" },
                  { key: "push" as const, icon: Bell, label: "Push Notification", description: "Browser notifications" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => toggleMethod(m.key)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      methods[m.key]
                        ? "border-blue-500 bg-blue-50 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <m.icon className={`h-4 w-4 ${methods[m.key] ? 'text-blue-500' : ''}`} />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{m.label}</p>
                      <p className="text-xs opacity-75">{m.description}</p>
                    </div>
                    <span className={`ml-auto h-5 w-9 rounded-full p-0.5 transition-colors ${
                      methods[m.key] ? "bg-blue-500" : "bg-gray-300"
                    }`}>
                      <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        methods[m.key] ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Types Summary */}
            {predictionData?.weather_alerts && predictionData.weather_alerts.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">Active Alert Types:</h4>
                <div className="space-y-2">
                  {predictionData.weather_alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-yellow-700">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{alert.alert_type}: {alert.severity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={saveConfiguration}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-teal-600 transition-all"
            >
              Save Configuration for {selectedCity}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              You'll receive alerts when {selectedCity} flood risk exceeds {threshold}%
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;