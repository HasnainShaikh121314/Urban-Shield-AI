import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def analyze_weather_conditions(df, city=None, forecast_df=None):
    """
    Analyze weather data for multiple hazard conditions
    """
    alerts = []
    
    if df is None or df.empty:
        return alerts
    
    # Get latest data
    latest = df.iloc[-1:].copy()
    
    # ============================================
    # 1. HEATWAVE DETECTION (Current + Forecast)
    # ============================================
    def check_heatwave():
        conditions = []
        
        # Check current/last 7 days
        if len(df) >= 3:
            temps = df['temp'].tail(7).values if len(df) >= 7 else df['temp'].values
            max_temp = float(max(temps))  # Convert to Python float
            severe_heat_days = int(sum(temps > 40))  # Convert to Python int
            moderate_heat_days = int(sum(temps > 35))  # Convert to Python int
            
            # Current heatwave
            if severe_heat_days >= 3:
                return {
                    "alert_type": "HEATWAVE",
                    "severity": "CRITICAL",
                    "message": f"🔥 CRITICAL HEATWAVE! Temperature above 40°C for {severe_heat_days} days.",
                    "temperature": max_temp,
                    "start_date": datetime.now().strftime("%Y-%m-%d"),
                    "end_date": (datetime.now() + timedelta(days=int(severe_heat_days))).strftime("%Y-%m-%d"),
                    "actions": [
                        "Avoid outdoor activities",
                        "Stay hydrated",
                        "Never leave children/pets in vehicles",
                        "Use fans/air conditioning",
                        "Check on elderly and vulnerable neighbors"
                    ]
                }
            elif moderate_heat_days >= 3:
                return {
                    "alert_type": "HEATWAVE",
                    "severity": "HIGH",
                    "message": f"🌡️ HIGH HEATWAVE ALERT! Temperature above 35°C for {moderate_heat_days} days.",
                    "temperature": max_temp,
                    "start_date": datetime.now().strftime("%Y-%m-%d"),
                    "end_date": (datetime.now() + timedelta(days=int(moderate_heat_days))).strftime("%Y-%m-%d"),
                    "actions": [
                        "Limit outdoor activities",
                        "Stay hydrated",
                        "Wear light clothing",
                        "Take frequent breaks in shade"
                    ]
                }
        
        # Check forecast for upcoming heatwave
        if forecast_df is not None and not forecast_df.empty:
            forecast_temps = forecast_df['temp'].values
            max_forecast_temp = float(max(forecast_temps))
            hot_forecast_days = int(sum(forecast_temps > 35))  # Convert to Python int
            
            if hot_forecast_days >= 3 and max_forecast_temp > 35:
                return {
                    "alert_type": "HEATWAVE (FORECAST)",
                    "severity": "HIGH" if max_forecast_temp > 40 else "MODERATE",
                    "message": f"⚠️ Heatwave expected in next 5 days! Temperatures up to {max_forecast_temp:.1f}°C.",
                    "temperature": max_forecast_temp,
                    "start_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
                    "end_date": (datetime.now() + timedelta(days=int(hot_forecast_days))).strftime("%Y-%m-%d"),
                    "actions": [
                        "Prepare for hot weather",
                        "Stock up on water",
                        "Check air conditioning",
                        "Plan activities for cooler times"
                    ]
                }
        
        return None
    
    # ============================================
    # 2. COLD WAVE DETECTION (Current + Forecast)
    # ============================================
    def check_coldwave():
        if len(df) >= 3:
            temps = df['temp'].tail(3).values
            min_temp = float(min(temps))  # Convert to Python float
            
            if min_temp < 0:
                return {
                    "alert_type": "COLD WAVE",
                    "severity": "CRITICAL",
                    "message": f"❄️ CRITICAL COLD WAVE! Temperature below freezing: {min_temp:.1f}°C.",
                    "temperature": min_temp,
                    "start_date": datetime.now().strftime("%Y-%m-%d"),
                    "actions": [
                        "Stay indoors if possible",
                        "Wear warm clothing",
                        "Protect pipes from freezing",
                        "Check on elderly neighbors"
                    ]
                }
            elif min_temp < 5:
                return {
                    "alert_type": "COLD WAVE",
                    "severity": "HIGH",
                    "message": f"🥶 HIGH COLD WAVE ALERT! Very cold: {min_temp:.1f}°C.",
                    "temperature": min_temp,
                    "start_date": datetime.now().strftime("%Y-%m-%d"),
                    "actions": [
                        "Dress in layers",
                        "Limit time outdoors",
                        "Keep warm indoors"
                    ]
                }
        
        # Check forecast
        if forecast_df is not None and not forecast_df.empty:
            forecast_temps = forecast_df['temp'].values
            min_forecast_temp = float(min(forecast_temps))  # Convert to Python float
            
            if min_forecast_temp < 0:
                return {
                    "alert_type": "COLD WAVE (FORECAST)",
                    "severity": "HIGH",
                    "message": f"❄️ Freezing temperatures expected! Down to {min_forecast_temp:.1f}°C.",
                    "temperature": min_forecast_temp,
                    "start_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
                    "actions": [
                        "Prepare for cold weather",
                        "Stock warm clothing",
                        "Protect pipes",
                        "Check heating systems"
                    ]
                }
        
        return None
    
    # ============================================
    # 3. STORM DETECTION (Current + Forecast)
    # ============================================
    def check_storm():
        if len(df) >= 2:
            pressure_change = float(df['pressure_change'].iloc[-1]) if 'pressure_change' in df.columns else 0.0
            wind_speed = float(latest['wind_speed'].values[0]) if 'wind_speed' in latest.columns else 0.0
            rain = float(latest['rain'].values[0]) if 'rain' in latest.columns else 0.0
            
            # Severe storm
            if pressure_change < -5 and wind_speed > 15:
                return {
                    "alert_type": "STORM",
                    "severity": "CRITICAL",
                    "message": f"⛈️ CRITICAL STORM! Rapid pressure drop ({pressure_change:.1f} hPa) with high winds ({wind_speed:.1f} m/s).",
                    "wind_speed": wind_speed,
                    "pressure_change": pressure_change,
                    "actions": [
                        "Take shelter immediately",
                        "Secure outdoor objects",
                        "Avoid windows",
                        "Stay away from trees and power lines"
                    ]
                }
            elif wind_speed > 20:
                return {
                    "alert_type": "HIGH WIND",
                    "severity": "CRITICAL",
                    "message": f"💨 CRITICAL HIGH WIND! Speed: {wind_speed:.1f} m/s.",
                    "wind_speed": wind_speed,
                    "actions": [
                        "Stay indoors",
                        "Secure outdoor items",
                        "Avoid travel"
                    ]
                }
        
        # Check forecast for storms
        if forecast_df is not None and not forecast_df.empty:
            max_wind = float(forecast_df['wind_speed'].max())
            total_rain = float(forecast_df['rain'].sum())
            
            if max_wind > 20:
                return {
                    "alert_type": "STORM (FORECAST)",
                    "severity": "HIGH",
                    "message": f"⚠️ Strong winds expected: up to {max_wind:.1f} m/s in next 5 days.",
                    "wind_speed": max_wind,
                    "start_date": datetime.now().strftime("%Y-%m-%d"),
                    "actions": [
                        "Prepare for strong winds",
                        "Secure outdoor items",
                        "Check emergency supplies"
                    ]
                }
            elif total_rain > 100:
                return {
                    "alert_type": "HEAVY RAIN (FORECAST)",
                    "severity": "HIGH",
                    "message": f"☔ Heavy rain expected: {total_rain:.1f}mm in next 5 days.",
                    "rainfall": total_rain,
                    "actions": [
                        "Prepare for possible flooding",
                        "Clear drainage areas",
                        "Monitor weather updates"
                    ]
                }
        
        return None
    
    # Check all conditions
    checks = [
        check_heatwave(),
        check_coldwave(),
        check_storm()
    ]
    
    # Filter out None results
    alerts = [alert for alert in checks if alert is not None]
    
    # Convert any remaining numpy types in alerts
    for alert in alerts:
        for key, value in list(alert.items()):
            if hasattr(value, 'item'):  # Check if it's a numpy type
                alert[key] = value.item()
            elif isinstance(value, (np.integer, np.floating)):
                alert[key] = value.item()
            elif isinstance(value, np.ndarray):
                alert[key] = value.tolist()
    
    # Sort by severity
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2}
    alerts.sort(key=lambda x: severity_order.get(x.get('severity', 'MODERATE'), 999))
    
    return alerts


def get_weekly_summary(weather_data, forecast_data=None):
    """Generate 7-day weather summary"""
    summary = {
        "current": {},
        "forecast": []
    }
    
    if weather_data is not None and not weather_data.empty:
        latest = weather_data.iloc[-1]
        summary["current"] = {
            "temperature": float(latest.get('temp', 0)),
            "humidity": float(latest.get('humidity', 0)),
            "rainfall": float(latest.get('rain', 0)),
            "wind_speed": float(latest.get('wind_speed', 0)),
            "pressure": float(latest.get('pressure', 0)),
            "city": str(latest.get('city', 'Unknown'))
        }
    
    if forecast_data is not None and not forecast_data.empty:
        # Make a copy to avoid modifying original
        forecast_copy = forecast_data.copy()
        
        # Convert datetime to date for grouping
        if 'datetime' in forecast_copy.columns:
            forecast_copy['date'] = pd.to_datetime(forecast_copy['datetime']).dt.date
        elif 'date' in forecast_copy.columns:
            forecast_copy['date'] = pd.to_datetime(forecast_copy['date']).dt.date
        
        # Group by day for 5-day forecast
        daily_forecast = forecast_copy.groupby('date').agg({
            'temp': ['max', 'min', 'mean'],
            'rain': 'sum',
            'wind_speed': 'max',
            'humidity': 'mean'
        }).round(1)
        
        # Flatten column names
        daily_forecast.columns = ['max_temp', 'min_temp', 'avg_temp', 'total_rain', 'max_wind', 'avg_humidity']
        daily_forecast = daily_forecast.reset_index()
        
        # Convert to list of dicts with Python native types
        forecast_list = []
        for _, row in daily_forecast.iterrows():
            forecast_list.append({
                "date": str(row['date']),
                "max_temp": float(row['max_temp']),
                "min_temp": float(row['min_temp']),
                "avg_temp": float(row['avg_temp']),
                "rain": float(row['total_rain']),
                "wind_speed": float(row['max_wind']),
                "humidity": float(row['avg_humidity'])
            })
        
        summary["forecast"] = forecast_list
    
    return summary