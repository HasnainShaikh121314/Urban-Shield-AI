# backend/realtime_weather.py
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time

OPENWEATHER_API_KEY = "0460ec9cdc86f82135ddd87935c9dd1f"  # Your API key

def fetch_weather_by_city(city_name):
    """
    Fetch current weather for a city name
    Returns DataFrame with Python native types (no numpy types)
    """
    try:
        print(f"  🌤️ Fetching weather for {city_name}...")
        
        # First, get coordinates for the city
        geo_url = "http://api.openweathermap.org/geo/1.0/direct"
        geo_params = {
            "q": city_name,
            "limit": 1,
            "appid": OPENWEATHER_API_KEY
        }
        
        geo_response = requests.get(geo_url, params=geo_params, timeout=10)
        
        if geo_response.status_code == 200 and len(geo_response.json()) > 0:
            geo_data = geo_response.json()[0]
            lat = float(geo_data["lat"])  # Convert to Python float
            lon = float(geo_data["lon"])  # Convert to Python float
            city_display = str(geo_data.get("name", city_name))
            country = str(geo_data.get("country", ""))
            
            print(f"  📍 Found: {city_display}, {country} ({lat}, {lon})")
            
            # Now get weather data
            return fetch_weather_by_coords(lat, lon, city_display)
        else:
            print(f"  ❌ City '{city_name}' not found")
            return None
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def fetch_weather_by_coords(lat, lon, city_name=None):
    """
    Fetch current weather by coordinates
    Returns DataFrame with Python native types (no numpy types)
    """
    try:
        # Ensure lat/lon are Python floats
        lat = float(lat)
        lon = float(lon)
        
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric"
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Get rain data (if any) - ensure Python float
            rain = 0.0
            if "rain" in data:
                rain = float(data["rain"].get("1h", data["rain"].get("3h", 0)))
            
            # Get all values as Python native types (not numpy)
            temp = float(data["main"]["temp"])
            pressure = float(data["main"]["pressure"])
            humidity = float(data["main"]["humidity"])
            wind_speed = float(data["wind"]["speed"])
            city = str(city_name or data.get("name", "Unknown"))
            
            # Create DataFrame with explicit Python types
            df = pd.DataFrame({
                "date": [datetime.now()],
                "rain": [rain],
                "temp": [temp],
                "pressure": [pressure],
                "wind_speed": [wind_speed],
                "humidity": [humidity],
                "city": [city]
            })
            
            # Ensure all numeric columns are Python float, not numpy.float64
            for col in ['rain', 'temp', 'pressure', 'wind_speed', 'humidity']:
                df[col] = df[col].astype(float)
            
            print(f"  ✅ Success! Temp: {temp:.1f}°C")
            return df
            
        else:
            print(f"  ❌ API Error {response.status_code}")
            return None
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def fetch_5day_forecast(lat, lon):
    """
    Fetch 5-day weather forecast for predictions
    Returns DataFrame with Python native types (no numpy types)
    """
    try:
        # Ensure lat/lon are Python floats
        lat = float(lat)
        lon = float(lon)
        
        url = "https://api.openweathermap.org/data/2.5/forecast"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric"
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Process forecast data (8 forecasts per day, every 3 hours)
            forecasts = []
            for item in data["list"]:
                # Convert all values to Python native types
                forecast = {
                    "datetime": datetime.fromtimestamp(item["dt"]),
                    "temp": float(item["main"]["temp"]),
                    "humidity": float(item["main"]["humidity"]),
                    "pressure": float(item["main"]["pressure"]),
                    "wind_speed": float(item["wind"]["speed"]),
                    "rain": float(item.get("rain", {}).get("3h", 0)) if "rain" in item else 0.0,
                    "weather": str(item["weather"][0]["description"])
                }
                forecasts.append(forecast)
            
            # Create DataFrame
            df = pd.DataFrame(forecasts)
            
            # Ensure all numeric columns are Python float
            for col in ['temp', 'humidity', 'pressure', 'wind_speed', 'rain']:
                if col in df.columns:
                    df[col] = df[col].astype(float)
            
            print(f"  ✅ Forecast fetched: {len(df)} time points")
            return df
        else:
            print(f"  ❌ Forecast API Error {response.status_code}")
            return None
            
    except Exception as e:
        print(f"  ❌ Forecast Error: {e}")
        return None

def test_api_connection():
    """
    Test function to verify API is working
    """
    print("\n" + "="*50)
    print("🔍 Testing OpenWeatherMap API Connection")
    print("="*50)
    
    # Test with Islamabad
    test_city = "Islamabad"
    print(f"\nTesting with {test_city}...")
    
    df = fetch_weather_by_city(test_city)
    
    if df is not None and not df.empty:
        print("\n✅ API Connection Successful!")
        print(f"   City: {df['city'].iloc[0]}")
        print(f"   Temperature: {df['temp'].iloc[0]:.1f}°C")
        print(f"   Humidity: {df['humidity'].iloc[0]:.0f}%")
        print(f"   Pressure: {df['pressure'].iloc[0]:.0f} hPa")
        print(f"   Wind Speed: {df['wind_speed'].iloc[0]:.1f} m/s")
        print(f"   Rainfall: {df['rain'].iloc[0]:.1f} mm")
        
        # Test forecast
        print("\n📅 Testing 5-day forecast...")
        # Get coordinates for Islamabad
        geo_url = "http://api.openweathermap.org/geo/1.0/direct"
        geo_response = requests.get(geo_url, params={"q": "Islamabad", "limit": 1, "appid": OPENWEATHER_API_KEY})
        if geo_response.status_code == 200 and len(geo_response.json()) > 0:
            lat = float(geo_response.json()[0]["lat"])
            lon = float(geo_response.json()[0]["lon"])
            forecast_df = fetch_5day_forecast(lat, lon)
            
            if forecast_df is not None:
                print(f"   Forecast points: {len(forecast_df)}")
                print(f"   Temperature range: {forecast_df['temp'].min():.1f} - {forecast_df['temp'].max():.1f}°C")
        
        return True
    else:
        print("\n❌ API Connection Failed!")
        return False

if __name__ == "__main__":
    # Run test when script is executed directly
    test_api_connection()