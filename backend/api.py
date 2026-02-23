from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import sys
import requests  # Moved import to top
from alert_engine import analyze_weather_conditions, get_weekly_summary
from realtime_weather import fetch_weather_by_city, fetch_5day_forecast, OPENWEATHER_API_KEY

# Import your RAG chatbot
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from chatbot import rag_pipeline, retrieve, all_chunks, index, model as sentence_model
    CHATBOT_AVAILABLE = True
except Exception as e:
    print(f"⚠️ Chatbot import error: {e}")
    CHATBOT_AVAILABLE = False
    all_chunks = []
    index = None

app = Flask(__name__)
CORS(app)

# Load flood prediction models
try:
    print("📂 Loading flood prediction models...")
    model = joblib.load("models/flood_model.pkl")
    scaler = joblib.load("models/scaler.pkl")
    features = joblib.load("models/feature_names.pkl")
    print("✅ Flood models loaded successfully!")
except Exception as e:
    print(f"❌ Error loading flood models: {e}")
    model = scaler = features = None

# Check if RAG chatbot is ready
if CHATBOT_AVAILABLE and index is not None and all_chunks and len(all_chunks) > 0:
    print(f"✅ RAG Chatbot ready with {len(all_chunks)} document chunks")
else:
    print("⚠️ RAG Chatbot not fully initialized. Please check documents folder.")

# Store weather history (use dictionary with city keys)
weather_history = {}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "FloodGuard AI API is running",
        "models_loaded": model is not None,
        "rag_ready": CHATBOT_AVAILABLE and index is not None and len(all_chunks) > 0,
        "rag_chunks": len(all_chunks) if all_chunks else 0,
        "cities_in_history": len(weather_history)
    })

@app.route('/api/predict', methods=['POST'])
def predict_flood_risk():
    """
    Endpoint for flood prediction based on city
    Returns classification result (Flood/No Flood) from ML model
    """
    try:
        if model is None:
            return jsonify({"error": "Models not loaded"}), 500
            
        data = request.json
        city = data.get('city', '').strip()
        
        if not city:
            return jsonify({"error": "City name is required"}), 400
        
        print(f"\n🌆 Processing request for city: {city}")
        
        # Fetch real-time weather for the city
        weather_df = fetch_weather_by_city(city)
        
        if weather_df is None or weather_df.empty:
            return jsonify({"error": f"Could not find weather data for '{city}'. Please check the city name."}), 404
        
        # Get city coordinates for forecast
        lat = None
        lon = None
        try:
            from realtime_weather import OPENWEATHER_API_KEY
            import requests
            geo_url = "http://api.openweathermap.org/geo/1.0/direct"
            geo_response = requests.get(geo_url, params={"q": city, "limit": 1, "appid": OPENWEATHER_API_KEY}, timeout=10)
            if geo_response.status_code == 200 and len(geo_response.json()) > 0:
                geo_data = geo_response.json()[0]
                lat = float(geo_data["lat"])
                lon = float(geo_data["lon"])
        except Exception as e:
            print(f"⚠️ Could not get coordinates for {city}: {e}")
        
        # Fetch 5-day forecast
        forecast_df = None
        if lat and lon:
            forecast_df = fetch_5day_forecast(lat, lon)
        
        # Get current weather values (already float from API)
        current_temp = float(weather_df['temp'].iloc[0])
        current_rain = float(weather_df['rain'].iloc[0])
        current_pressure = float(weather_df['pressure'].iloc[0])
        current_humidity = float(weather_df['humidity'].iloc[0])
        current_wind = float(weather_df['wind_speed'].iloc[0])
        
        # Calculate derived features for model
        now = datetime.now()
        
        # Store in history (simulate historical data)
        city_key = city.lower()
        if city_key not in weather_history:
            weather_history[city_key] = []
        
        weather_history[city_key].append({
            'date': now,
            'temp': current_temp,
            'rain': current_rain,
            'pressure': current_pressure,
            'humidity': current_humidity,
            'wind_speed': current_wind
        })
        
        # Keep last 30 days
        if len(weather_history[city_key]) > 30:
            weather_history[city_key] = weather_history[city_key][-30:]
        
        # Create history dataframe
        history_df = pd.DataFrame(weather_history[city_key])
        
        # Calculate 3-day and 7-day averages if enough history
        if len(history_df) >= 3:
            # Calculate means (these return numpy.float64)
            rain_3day_np = history_df['rain'].tail(3).mean()
            rain_7day_np = history_df['rain'].tail(7).mean() if len(history_df) >= 7 else rain_3day_np
            pressure_3day_avg_np = history_df['pressure'].tail(3).mean()
            temp_3day_avg_np = history_df['temp'].tail(3).mean()
            wind_3day_avg_np = history_df['wind_speed'].tail(3).mean()
            pressure_change_np = current_pressure - history_df['pressure'].iloc[-2] if len(history_df) >= 2 else 0
            
            # Convert numpy types to Python native types
            rain_3day = float(rain_3day_np) if hasattr(rain_3day_np, 'item') else rain_3day_np
            rain_7day = float(rain_7day_np) if hasattr(rain_7day_np, 'item') else rain_7day_np
            pressure_3day_avg = float(pressure_3day_avg_np) if hasattr(pressure_3day_avg_np, 'item') else pressure_3day_avg_np
            temp_3day_avg = float(temp_3day_avg_np) if hasattr(temp_3day_avg_np, 'item') else temp_3day_avg_np
            wind_3day_avg = float(wind_3day_avg_np) if hasattr(wind_3day_avg_np, 'item') else wind_3day_avg_np
            pressure_change = float(pressure_change_np) if hasattr(pressure_change_np, 'item') else pressure_change_np
        else:
            # These are already Python floats
            rain_3day = float(current_rain * 2.5)
            rain_7day = float(current_rain * 4)
            pressure_3day_avg = float(current_pressure)
            temp_3day_avg = float(current_temp)
            wind_3day_avg = float(current_wind)
            pressure_change = 0.0
        
        # Prepare input for model
        input_data = {
            'rain': float(current_rain),
            'rain_3day': float(rain_3day),
            'rain_7day': float(rain_7day),
            'rain_15day': float(rain_7day * 2),  # Estimate
            'pressure': float(current_pressure),
            'pressure_change': float(pressure_change),
            'pressure_3day_avg': float(pressure_3day_avg),
            'temp': float(current_temp),
            'temp_change': float(current_temp - temp_3day_avg),
            'temp_3day_avg': float(temp_3day_avg),
            'humidity': float(current_humidity),
            'humidity_change': 0.0,
            'wind_speed': float(current_wind),
            'wind_speed_3day_avg': float(wind_3day_avg),
            'month': int(now.month),
            'day_of_year': int(now.timetuple().tm_yday)
        }
        
        # Create DataFrame and predict
        df_input = pd.DataFrame([input_data])
        
        # Ensure all features are present
        for feature in features:
            if feature not in df_input.columns:
                df_input[feature] = 0.0
        
        df_input = df_input[features]
        scaled_data = scaler.transform(df_input)
        
        # Get flood prediction from ML model (CLASSIFICATION)
        probability = float(model.predict_proba(scaled_data)[0][1])  # Convert to float
        flood_prediction = 1 if probability > 0.5 else 0
        risk_score = int(probability * 100)
        
        # Determine risk category based on probability
        if risk_score < 30:
            category = "Low"
            color = "green"
        elif risk_score < 60:
            category = "Moderate"
            color = "yellow"
        elif risk_score < 85:
            category = "High"
            color = "orange"
        else:
            category = "Severe"
            color = "red"
        
        # Analyze weather alerts (heatwave, coldwave, storm)
        weather_alerts = analyze_weather_conditions(history_df, city, forecast_df)
        
        # Get weekly summary
        weekly_summary = get_weekly_summary(weather_df, forecast_df)
        
        # Generate recommendations
        recommendations = get_recommendations(flood_prediction, category, weather_alerts)
        
        # Prepare response with all values as Python native types
        response = {
            "city": str(weekly_summary['current'].get('city', city)),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "current_weather": {
                "temperature": float(weekly_summary['current'].get('temperature', 0)),
                "humidity": float(weekly_summary['current'].get('humidity', 0)),
                "rainfall": float(weekly_summary['current'].get('rainfall', 0)),
                "wind_speed": float(weekly_summary['current'].get('wind_speed', 0)),
                "pressure": float(weekly_summary['current'].get('pressure', 0)),
                "city": str(weekly_summary['current'].get('city', city))
            },
            "flood_prediction": {
                "prediction": int(flood_prediction),
                "risk_score": int(risk_score),
                "risk_category": str(category),
                "color": str(color),
                "confidence": float(probability if flood_prediction == 1 else 1 - probability),
                "factors": {
                    "rainfall_3day": float(round(rain_3day, 1)),
                    "pressure_trend": str("falling" if pressure_change < -1 else "rising" if pressure_change > 1 else "stable"),
                    "soil_saturation": int(min(100, int((rain_7day / 200) * 100))),
                    "current_rainfall": float(current_rain),
                    "temperature": float(current_temp),
                    "humidity": float(current_humidity)
                }
            },
            "weather_alerts": weather_alerts,  # Ensure this function returns Python native types
            "forecast_7day": weekly_summary['forecast'] if weekly_summary['forecast'] else [],
            "recommendations": [str(rec) for rec in recommendations]
        }
        
        print(f"✅ ML Model Prediction: {'FLOOD' if flood_prediction == 1 else 'NO FLOOD'} (Confidence: {response['flood_prediction']['confidence']*100:.1f}%) for {city}")
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
@app.route('/api/chat', methods=['POST'])
def chat():
    """
    RAG Chatbot endpoint using your document-based retrieval system
    """
    try:
        data = request.json
        message = data.get('message', '').strip()
        session_id = data.get('session_id', 'default')
        city = data.get('city', '')
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        print(f"\n💬 Chat request: '{message[:50]}...' from {city or 'unknown location'}")
        
        # Check if RAG is ready
        if not CHATBOT_AVAILABLE or index is None or not all_chunks:
            return jsonify({
                "response": "I'm still loading NDMA guidelines. Please try again in a moment.",
                "sources": [{
                    "agency": "NDMA Pakistan",
                    "document": "Guidelines",
                    "date": "2024",
                    "verified": True
                }],
                "suggestions": [
                    "NDMA flood guidelines",
                    "Earthquake safety tips",
                    "Emergency contacts Pakistan",
                    "What to do in flood?"
                ],
                "emergency": False,
                "verification_badge": "NDMA Guidelines"
            })
        
        # Use RAG pipeline to get answer
        try:
            # First, retrieve relevant chunks
            retrieved_chunks = retrieve(message, k=5)
            
            # Check if retrieved chunks are relevant to disasters
            disaster_keywords = ['flood', 'earthquake', 'landslide', 'cyclone', 'drought', 
                               'emergency', 'disaster', 'evacuation', 'safety', 'rescue',
                               'ndma', 'pakistan', 'relief', 'aid', 'shelter', 'helpline']
            
            is_disaster_related = any(keyword in message.lower() for keyword in disaster_keywords)
            
            # If no relevant chunks found or query is not disaster-related
            if not retrieved_chunks or len(retrieved_chunks[0]) < 20 or not is_disaster_related:
                return jsonify({
                    "response": "I can only provide information about disasters and emergencies based on NDMA Pakistan guidelines. Please ask me about floods, earthquakes, safety measures, or emergency contacts.",
                    "sources": [{
                        "agency": "NDMA Pakistan",
                        "document": "Guidelines",
                        "date": "2024",
                        "verified": True
                    }],
                    "suggestions": [
                        "NDMA flood guidelines",
                        "Earthquake safety tips",
                        "Emergency contacts",
                        "What to do in flood?"
                    ],
                    "emergency": False,
                    "verification_badge": "NDMA Guidelines"
                })
            
            # Then generate answer using OpenRouter
            answer = rag_pipeline(message, k=5)
            
            # Extract sources from retrieved chunks
            sources = []
            for i, chunk in enumerate(retrieved_chunks[:3]):
                sources.append({
                    "agency": "NDMA Pakistan",
                    "document": "Official Guidelines",
                    "date": "2024",
                    "verified": True,
                })
            
            # Check if message contains emergency keywords
            emergency_keywords = ["help", "emergency", "urgent", "1122", "danger", "rescue", "bachao"]
            is_emergency = any(keyword in message.lower() for keyword in emergency_keywords)
            
            # Generate suggestions based on query
            suggestions = [
                "NDMA flood guidelines",
                "Earthquake safety tips",
                "Emergency contacts Pakistan",
                "What to do in flood?",
                "Landslide precautions"
            ]
            
            # If emergency, add emergency-specific suggestions
            if is_emergency:
                suggestions = [
                    "Call 1122 (Emergency)",
                    "NDMA Helpline 111-157-157",
                    "Find nearest shelter",
                    "Evacuation routes",
                    "What to do now?"
                ]
            
            response_data = {
                "response": answer,
                "sources": sources,
                "suggestions": suggestions,
                "emergency": is_emergency,
                "verification_badge": "NDMA Guidelines"
            }
            
            print(f"✅ NDMA guidelines response generated from {len(retrieved_chunks)} chunks")
            return jsonify(response_data)
            
        except Exception as e:
            print(f"❌ RAG pipeline error: {str(e)}")
            return jsonify({
                "response": "I can only provide information about disasters and emergencies based on NDMA Pakistan guidelines. Please ask me about floods, earthquakes, safety measures, or emergency contacts.",
                "sources": [{
                    "agency": "NDMA Pakistan",
                    "document": "Emergency Response Guide",
                    "date": "2024",
                    "verified": True
                }],
                "suggestions": [
                    "NDMA flood guidelines",
                    "Earthquake safety",
                    "Emergency contacts",
                    "Evacuation tips"
                ],
                "emergency": False,
                "verification_badge": "NDMA Guidelines"
            })
        
    except Exception as e:
        print(f"❌ Chat error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat/debug', methods=['POST'])
def chat_debug():
    """
    Debug endpoint to test RAG retrieval
    """
    try:
        data = request.json
        message = data.get('message', '').strip()
        k = data.get('k', 3)
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        if not CHATBOT_AVAILABLE or index is None:
            return jsonify({"error": "RAG chatbot not initialized"}), 503
        
        # Retrieve chunks
        retrieved_chunks = retrieve(message, k=k)
        
        # Get query embedding
        query_embedding = sentence_model.encode([message], convert_to_numpy=True, normalize_embeddings=True)
        
        return jsonify({
            "query": message,
            "num_chunks_retrieved": len(retrieved_chunks),
            "total_chunks": len(all_chunks),
            "chunks": retrieved_chunks[:3],  # Return first 3 chunks only
            "query_embedding_shape": list(query_embedding.shape)
        })
        
    except Exception as e:
        print(f"❌ Debug error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_recommendations(flood_prediction, flood_category, weather_alerts):
    """Generate combined recommendations based on ML model output"""
    recommendations = []
    
    # Flood recommendations based on ML model prediction
    if flood_prediction == 1:  # Flood predicted
        if flood_category == "Severe":
            recommendations.append("🚨 CRITICAL: SEVERE FLOOD RISK! Follow evacuation orders immediately!")
            recommendations.append("🏃 Move to higher ground right now")
            recommendations.append("📱 Keep emergency phone charged and monitor alerts")
            recommendations.append("💧 Avoid walking or driving through flood waters")
        elif flood_category == "High":
            recommendations.append("⚠️ HIGH FLOOD RISK! Prepare for possible evacuation")
            recommendations.append("🛑 Move vehicles to higher ground")
            recommendations.append("📦 Prepare emergency kit with documents")
            recommendations.append("🔌 Charge all communication devices")
        elif flood_category == "Moderate":
            recommendations.append("🌊 Moderate flood risk detected")
            recommendations.append("🧰 Prepare emergency kit and supplies")
            recommendations.append("📺 Monitor local weather updates")
            recommendations.append("🏠 Clear drainage areas around your property")
        else:
            recommendations.append("⚠️ Flood risk detected. Stay alert and monitor conditions.")
    else:  # No flood predicted
        recommendations.append("✅ No flood risk detected by ML model")
        recommendations.append("👀 Continue monitoring weather conditions")
        recommendations.append("📋 Review your emergency plan regularly")
    
    # Add weather alert recommendations
    for alert in weather_alerts:
        if alert.get('severity') in ['CRITICAL', 'HIGH']:
            recommendations.extend(alert.get('actions', [])[:2])
    
    # Remove duplicates and return top 5
    seen = set()
    unique_recs = []
    for rec in recommendations:
        if rec not in seen:
            seen.add(rec)
            unique_recs.append(rec)
    
    return unique_recs[:5]

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Starting FloodGuard AI Backend")
    print("="*60)
    print(f"📁 Flood Prediction Models: {'✅ Loaded' if model is not None else '❌ Not Loaded'}")
    print(f"📚 RAG Chatbot Status: {'✅ Ready' if CHATBOT_AVAILABLE and index is not None and len(all_chunks) > 0 else '⚠️ Initializing'}")
    if CHATBOT_AVAILABLE and index is not None and len(all_chunks) > 0:
        print(f"   - Document chunks: {len(all_chunks)}")
    print(f"📍 Server will run on: http://localhost:5000")
    print("="*60 + "\n")
    app.run(debug=True, port=5000)