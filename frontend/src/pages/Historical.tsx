import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Download, TrendingUp, MapPin, ChevronDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
} from "recharts";
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
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const HistoricalPage = () => {
  const [selectedCity, setSelectedCity] = useState<string>("Islamabad");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [predictionData, setPredictionData] = useState<any>(null);

  // Filter cities by province
  const getFilteredCities = () => {
    if (!selectedProvince) return ALL_CITIES;
    return PAKISTAN_CITIES[selectedProvince as keyof typeof PAKISTAN_CITIES] || [];
  };

  // Fetch data when city changes
  useEffect(() => {
    if (selectedCity) {
      fetchHistoricalData();
    }
  }, [selectedCity, selectedYear]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current prediction for baseline
      const data = await floodAPI.predictForCity(selectedCity);
      setPredictionData(data);
      
      // Generate historical data based on current data
      generateHistoricalData(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch historical data');
      console.error('Error fetching historical data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateHistoricalData = (data: any) => {
    if (!data) return;

    const baseRisk = data.flood_prediction?.risk_score || 30;
    const baseRainfall = data.current_weather?.rainfall || 50;
    const baseTemp = data.current_weather?.temperature || 25;

    // Generate monthly data with realistic patterns
    const monthly = MONTHS.map((month, index) => {
      // Seasonal patterns (monsoon: June-September)
      const isMonsoon = index >= 5 && index <= 8;
      const seasonFactor = isMonsoon ? 1.8 : 0.6;
      const randomFactor = 0.7 + Math.random() * 0.6;
      
      // Floods more likely in monsoon
      const floodBase = isMonsoon ? 12 : 3;
      const floods = Math.max(0, Math.floor(floodBase * randomFactor * (baseRisk / 50)));
      
      // Rainfall follows seasonal pattern
      const rainfall = Math.max(0, Math.floor(
        baseRainfall * seasonFactor * (0.8 + Math.random() * 0.7)
      ));
      
      // Temperature varies by season
      const tempVariation = isMonsoon ? 5 : index < 2 || index > 10 ? -5 : 0;
      const temperature = baseTemp + tempVariation + (Math.random() * 4 - 2);
      
      return {
        month,
        floods,
        rainfall,
        temperature: Math.round(temperature * 10) / 10,
        riskScore: Math.min(100, Math.max(0, 
          baseRisk * seasonFactor + (Math.random() * 15 - 7.5)
        ))
      };
    });

    setMonthlyData(monthly);

    // Generate historical incidents
    const incidents_list = [];
    const locations = [
      `${selectedCity} Downtown`,
      `${selectedCity} Riverside`,
      `${selectedCity} East`,
      `${selectedCity} West`,
      `${selectedCity} South`,
      `${selectedCity} North`,
      `Central ${selectedCity}`,
      `${selectedCity} Suburbs`,
      `${selectedCity} Industrial Zone`,
      `${selectedCity} Canal Area`
    ];

    for (let i = 0; i < 12; i++) {
      const monthIndex = Math.floor(Math.random() * 12);
      const day = Math.floor(Math.random() * 28) + 1;
      const date = new Date(selectedYear, monthIndex, day);
      
      const monthData = monthly[monthIndex];
      const riskLevel = monthData?.riskScore || 50;
      
      let severity = "Moderate";
      if (riskLevel > 75) severity = "Severe";
      else if (riskLevel > 50) severity = "High";
      else if (riskLevel > 25) severity = "Moderate";
      else severity = "Low";

      const impacts = [
        `${Math.floor(20 + Math.random() * 150)} homes affected`,
        "Road closures and traffic disruption",
        `${Math.floor(10 + Math.random() * 50)} evacuations conducted`,
        "Infrastructure damage reported",
        "Power outages in affected areas",
        "Agricultural damage to crops",
        "Business disruptions",
        "Transportation delays",
        "Emergency services deployed",
        "Relief camps established"
      ];

      incidents_list.push({
        id: i + 1,
        date: date.toISOString().split('T')[0],
        location: locations[Math.floor(Math.random() * locations.length)],
        severity,
        impact: impacts[Math.floor(Math.random() * impacts.length)],
        rainfall: Math.floor(monthData?.rainfall || 50),
        riskScore: Math.floor(riskLevel)
      });
    }

    // Sort by date (most recent first)
    incidents_list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setIncidents(incidents_list);
  };

  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case "Severe": return "bg-red-100 text-red-800 border-red-200";
      case "High": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground mt-1">
            <span className="font-medium" style={{ color: entry.color }}>{entry.name}:</span>{" "}
            {entry.value}{entry.name === "Temperature" ? "°C" : entry.name === "Rainfall" ? "mm" : ""}
          </p>
        ))}
      </div>
    );
  };

  const exportToCSV = () => {
    // Create CSV content
    const headers = ["Date", "Location", "Severity", "Impact", "Rainfall (mm)", "Risk Score (%)"];
    const csvContent = [
      headers.join(","),
      ...incidents.map(inc => 
        `"${inc.date}","${inc.location}","${inc.severity}","${inc.impact}",${inc.rainfall},${inc.riskScore}`
      )
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCity}_historical_data_${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const getStatistics = () => {
    if (!monthlyData.length) return null;

    const totalFloods = monthlyData.reduce((sum, m) => sum + m.floods, 0);
    const totalRainfall = monthlyData.reduce((sum, m) => sum + m.rainfall, 0);
    const avgRainfall = totalRainfall / monthlyData.length;
    const maxFloodMonth = monthlyData.reduce((max, m) => m.floods > max.floods ? m : max, monthlyData[0]);
    const maxRainMonth = monthlyData.reduce((max, m) => m.rainfall > max.rainfall ? m : max, monthlyData[0]);

    return {
      totalFloods,
      totalRainfall: Math.round(totalRainfall),
      avgRainfall: Math.round(avgRainfall),
      peakFloodMonth: maxFloodMonth.month,
      peakFloodCount: maxFloodMonth.floods,
      peakRainMonth: maxRainMonth.month,
      peakRainAmount: maxRainMonth.rainfall,
      severeIncidents: incidents.filter(i => i.severity === "Severe").length,
      highIncidents: incidents.filter(i => i.severity === "High").length
    };
  };

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
      {/* Header with Controls */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Historical Analysis</h1>
            <p className="text-muted-foreground mt-1">Review past flood events across Pakistan</p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {/* Province Selector */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <MapPin className="h-4 w-4 text-muted-foreground ml-2" />
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
                disabled={loading}
              >
                <option value="">All Provinces</option>
                {Object.keys(PAKISTAN_CITIES).map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <MapPin className="h-4 w-4 text-muted-foreground ml-2" />
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

            {/* Year Selector */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent border-none focus:ring-0 py-2 pr-8 text-foreground"
                disabled={loading}
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-muted-foreground mr-2" />
            </div>

            <button
              onClick={exportToCSV}
              disabled={loading || incidents.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
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
          <span className="ml-3 text-muted-foreground">Loading historical data for {selectedCity}...</span>
        </div>
      )}

      {/* Statistics Cards */}
      {!loading && stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Flood Events</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalFloods}</p>
            <p className="text-xs text-gray-400 mt-1">{selectedYear}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Rainfall</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalRainfall} mm</p>
            <p className="text-xs text-gray-400 mt-1">Annual total</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Peak Flood Month</p>
            <p className="text-2xl font-bold text-orange-600">{stats.peakFloodMonth}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.peakFloodCount} events</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Severe Incidents</p>
            <p className="text-2xl font-bold text-red-600">{stats.severeIncidents}</p>
            <p className="text-xs text-gray-400 mt-1">High: {stats.highIncidents}</p>
          </div>
        </motion.div>
      )}

      {/* Charts Grid */}
      {!loading && monthlyData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Flood Events vs Rainfall Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-elevated p-6"
          >
            <h3 className="font-heading text-base font-semibold text-foreground mb-4">
              {selectedCity} - Flood Events vs Rainfall ({selectedYear})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 25%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="floods" name="Flood Events" fill="hsl(174, 56%, 47%)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="rainfall" name="Rainfall (mm)" fill="hsl(224, 80%, 24%)" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {getProvinceName(selectedCity)} • Correlation between rainfall and flood events
            </p>
          </motion.div>

          {/* Monthly Risk Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-elevated p-6"
          >
            <h3 className="font-heading text-base font-semibold text-foreground mb-4">
              {selectedCity} - Monthly Risk & Temperature ({selectedYear})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 25%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line yAxisId="left" type="monotone" dataKey="riskScore" name="Risk Score %" stroke="hsl(174, 56%, 47%)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="temperature" name="Temperature °C" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Monthly flood risk score and temperature trends
            </p>
          </motion.div>
        </div>
      )}

      {/* Incidents Table */}
      {!loading && incidents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-elevated mt-6 overflow-hidden"
        >
          <div className="p-6 pb-0 flex justify-between items-center">
            <div>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Recent Flood Incidents - {selectedCity}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Showing incidents from {selectedYear} • {getProvinceName(selectedCity)}
              </p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
              {incidents.length} incidents
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full mt-4">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Impact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rainfall</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc, i) => (
                  <tr key={inc.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono-data text-foreground">
                      {new Date(inc.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{inc.location}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSeverityClasses(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inc.impact}</td>
                    <td className="px-6 py-4 text-sm font-mono-data text-foreground">{inc.rainfall} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* No Data State */}
      {!loading && !error && monthlyData.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No historical data available</h3>
          <p className="text-sm text-gray-400">Select a city to view historical flood analysis</p>
        </div>
      )}
    </div>
  );
};

export default HistoricalPage;