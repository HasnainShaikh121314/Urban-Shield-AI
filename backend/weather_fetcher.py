import requests
import pandas as pd
import os
import time
import numpy as np  # <-- ADD THIS LINE
from datetime import datetime, timedelta

def fetch_weather_data(lat, lon, start="20150101", end="20231231", city_name=None, save_csv=False, csv_path=None):
    """
    Fetches weather data from NASA POWER API
    Enhanced for Pakistan's diverse geography
    
    Args:
        lat (float): Latitude of the location
        lon (float): Longitude of the location
        start (str): Start date in YYYYMMDD
        end (str): End date in YYYYMMDD
        city_name (str): Name of the city
        save_csv (bool): Whether to save the data as CSV
        csv_path (str): Path for the CSV file
    
    Returns:
        pd.DataFrame: Weather data
    """
    
    # NASA POWER API endpoint
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    
    # Parameters for the API request
    parameters = {
        "parameters": "PRECTOTCORR,T2M,PS,WS2M,RH2M",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start,
        "end": end,
        "format": "JSON"
    }
    
    try:
        print(f"  Fetching data for coordinates: {lat}, {lon}")
        response = requests.get(url, params=parameters, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Check if data exists
        if "properties" not in data or "parameter" not in data["properties"]:
            print(f"  ⚠️ No data returned for {city_name or f'{lat},{lon}'}")
            return None
        
        # Extract properties
        properties = data["properties"]
        parameter_data = properties["parameter"]
        
        # Check if required parameters exist
        if "PRECTOTCORR" not in parameter_data:
            print(f"  ⚠️ Rainfall data missing for {city_name}")
            return None
        
        # Create DataFrame
        dates = list(parameter_data["PRECTOTCORR"].keys())
        
        # Ensure we have data
        if len(dates) == 0:
            print(f"  ⚠️ No dates found for {city_name}")
            return None
        
        df = pd.DataFrame({
            "date": pd.to_datetime(dates),
            "rain": [parameter_data["PRECTOTCORR"][d] for d in dates],
            "temp": [parameter_data.get("T2M", {}).get(d, np.nan) for d in dates],  # np.nan works now
            "pressure": [parameter_data.get("PS", {}).get(d, np.nan) for d in dates],
            "wind_speed": [parameter_data.get("WS2M", {}).get(d, np.nan) for d in dates],
            "humidity": [parameter_data.get("RH2M", {}).get(d, np.nan) for d in dates]
        })
        
        # Add city name if provided
        if city_name:
            df["city"] = city_name
        
        # Sort by date
        df = df.sort_values("date").reset_index(drop=True)
        
        # Handle missing values (interpolate for short gaps)
        df = df.interpolate(method='linear', limit=5)  # Interpolate up to 5 consecutive missing values
        
        # Drop any remaining NaN values at the edges
        df = df.dropna()
        
        # Add elevation data (approximate for Pakistan regions)
        # This helps model differentiate between mountain and plain cities
        df["elevation"] = get_approximate_elevation(lat, lon)
        
        # Add distance to coast (km) for coastal flood risk
        df["distance_to_coast"] = calculate_distance_to_coast(lat, lon)
        
        # Save to CSV if requested
        if save_csv and csv_path:
            folder = os.path.dirname(csv_path)
            if folder and not os.path.exists(folder):
                os.makedirs(folder)
            df.to_csv(csv_path, index=False)
            print(f"  Data saved to {csv_path}")
        
        print(f"  ✅ Successfully fetched {len(df)} days of data for {city_name}")
        return df
        
    except requests.exceptions.Timeout:
        print(f"  ⏱️ Timeout error for {city_name} - skipping")
        return None
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Error fetching data for {city_name}: {e}")
        return None
    except Exception as e:
        print(f"  ❌ Unexpected error for {city_name}: {e}")
        return None


def fetch_multiple_cities_data(cities_dict, start="20150101", end="20231231", max_retries=2):
    """
    Fetch weather data for multiple cities with retry logic
    
    Args:
        cities_dict: Dictionary with city names and coordinates
        start: Start date
        end: End date
        max_retries: Number of retry attempts for failed cities
    
    Returns:
        Combined DataFrame for all cities
    """
    all_data = []
    failed_cities = []
    
    print("\n" + "="*70)
    print("🌍 FETCHING WEATHER DATA FOR PAKISTANI CITIES")
    print("="*70)
    print(f"Total cities to process: {len(cities_dict)}")
    print(f"Date range: {start} to {end}")
    print("="*70)
    
    for i, (city_name, (lat, lon)) in enumerate(cities_dict.items(), 1):
        print(f"\n📍 [{i}/{len(cities_dict)}] Processing: {city_name}")
        
        # Try fetching with retries
        success = False
        for attempt in range(max_retries):
            df = fetch_weather_data(
                lat=lat, 
                lon=lon, 
                start=start, 
                end=end,
                city_name=city_name
            )
            
            if df is not None and not df.empty and len(df) > 100:  # Ensure minimum data
                all_data.append(df)
                success = True
                break
            elif attempt < max_retries - 1:
                print(f"  Retrying {city_name} (attempt {attempt + 2}/{max_retries})...")
                time.sleep(2)  # Wait longer before retry
        
        if not success:
            failed_cities.append(city_name)
            print(f"  ⚠️ Failed to fetch data for {city_name} after {max_retries} attempts")
        
        # Respect API rate limits
        time.sleep(1.5)  # Increased delay to avoid rate limiting
    
    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
        
        print("\n" + "="*70)
        print("✅ DATA FETCH SUMMARY")
        print("="*70)
        print(f"📊 Total records fetched: {len(combined_df):,}")
        print(f"🏙️ Cities successfully fetched: {len(combined_df['city'].unique())}")
        print(f"   {', '.join(combined_df['city'].unique())}")
        
        if failed_cities:
            print(f"\n⚠️ Failed cities ({len(failed_cities)}): {', '.join(failed_cities)}")
        
        # Print data range
        print(f"\n📅 Date range: {combined_df['date'].min().date()} to {combined_df['date'].max().date()}")
        
        # Print data quality
        missing_pct = (combined_df.isnull().sum() / len(combined_df)) * 100
        print(f"\n📈 Data quality:")
        for col in ['rain', 'temp', 'pressure', 'wind_speed', 'humidity']:
            if col in combined_df.columns:
                print(f"   {col}: {100 - missing_pct[col]:.1f}% complete")
        
        return combined_df
    else:
        print("\n❌ No data fetched for any city")
        return None


def fetch_city_with_retry(city_name, lat, lon, start, end, max_attempts=3):
    """
    Fetch data for a single city with retry logic
    """
    for attempt in range(max_attempts):
        df = fetch_weather_data(
            lat=lat,
            lon=lon,
            start=start,
            end=end,
            city_name=city_name
        )
        
        if df is not None and not df.empty and len(df) > 100:
            return df
        
        if attempt < max_attempts - 1:
            wait_time = (attempt + 1) * 5  # Progressive wait: 5s, 10s, 15s
            print(f"  Retrying {city_name} in {wait_time}s...")
            time.sleep(wait_time)
    
    return None


def get_approximate_elevation(lat, lon):
    """
    Get approximate elevation for Pakistan regions
    This is a simplified approach - in production, use a proper elevation API
    
    Returns elevation in meters
    """
    # Rough elevation map for Pakistan
    if lat > 35:  # Northern Areas (Gilgit, Skardu, Hunza)
        return 1500 + (lat - 35) * 500  # Higher latitudes = higher elevation
    elif lat > 33:  # Northern Punjab, KP mountains
        return 500 + (lat - 33) * 300
    elif lat < 25:  # Coastal areas
        return 10  # Near sea level
    elif lon < 66 and lat < 30:  # Balochistan plateau
        return 500 + (30 - lat) * 50
    else:  # Plains (Punjab, Sindh)
        return 100 + (33 - lat) * 20
    
    return 100  # Default


def calculate_distance_to_coast(lat, lon):
    """
    Calculate approximate distance to the nearest coastline (km)
    Simplified for Pakistan
    """
    # Pakistan coastline roughly follows 24.5°N to 25.5°N along 66°E to 68°E
    coastal_lat_range = (24.5, 25.5)
    coastal_lon_range = (66.0, 68.0)
    
    if coastal_lat_range[0] <= lat <= coastal_lat_range[1] and coastal_lon_range[0] <= lon <= coastal_lon_range[1]:
        return 0  # Coastal city
    
    # Calculate distance to nearest coastal point (simplified)
    # This is a rough approximation
    coastal_lat = 25.0
    coastal_lon = 66.5
    
    # Rough conversion: 1 degree ≈ 111 km
    distance = ((lat - coastal_lat)**2 + (lon - coastal_lon)**2)**0.5 * 111
    
    return distance


def verify_data_quality(df, city_name):
    """
    Verify data quality for a city
    """
    if df is None or df.empty:
        return False
    
    total_days = len(df)
    expected_days = 365 * 9  # 2015-2023 is about 9 years
    
    # Check if we have at least 80% of expected data
    if total_days < expected_days * 0.8:
        print(f"  ⚠️ {city_name}: Only {total_days}/{expected_days} days ({total_days/expected_days*100:.1f}%)")
        return False
    
    # Check for excessive missing values
    missing_rain = df['rain'].isnull().sum()
    if missing_rain > total_days * 0.1:  # More than 10% missing
        print(f"  ⚠️ {city_name}: {missing_rain} days missing rain data")
        return False
    
    return True


# Add a function to fetch current weather (for real-time predictions)
def fetch_current_weather(city_name, lat, lon):
    """
    Fetch current weather for real-time predictions
    Uses OpenWeatherMap API (you'll need an API key)
    """
    # This would require OpenWeatherMap API key
    # For now, return None and let the main API handle it
    return None