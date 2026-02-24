# 🛡️ UrbanShield AI - Flood Prediction & Early Warning System for Pakistan

## 📋 Overview

UrbanShield AI is an advanced flood prediction and early warning system specifically designed for Pakistan. It leverages machine learning, real-time weather data, and official NDMA (National Disaster Management Authority) guidelines to provide accurate flood risk assessments and multi-hazard alerts across 51 cities in Pakistan.

### ✨ Key Features

- **🤖 ML-Powered Flood Prediction**: Gradient Boosting model with 99.7% accuracy
- **🌤️ Real-time Weather Monitoring**: Integration with OpenWeatherMap API
- **⚠️ Multi-Hazard Alerts**: Heatwave, cold wave, and storm detection
- **💬 RAG Chatbot "Guidy"**: AI assistant using NDMA official guidelines
- **🗺️ 51 Cities Coverage**: Major cities across all provinces of Pakistan
- **📊 Historical Analysis**: 9 years of weather data (2015-2023)
- **📱 Responsive Design**: Works on desktop, tablet, and mobile

---

## 🏗️ System Architecture

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ React Frontend│────▶│ Flask Backend │────▶│ ML Model │
│ (TypeScript) │◀────│ (Python) │◀────│ (Gradient Boosting)
└─────────────────┘ └────────┬────────┘ └─────────────────┘
│
┌────────────┼────────────┐
▼ ▼ ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ RAG Chatbot │ │ Weather API │ │ Alert Engine │
│ (FAISS + GPT) │ │ (OpenWeatherMap)│ │ (Heat/Cold/Storm)│
└─────────────────┘ └─────────────────┘ └─────────────────┘

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 16+
- npm or yarn
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/urbanshield-ai.git
cd urbanshield-ai

# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create required folders
mkdir documents models datasets

# Add your NDMA PDF guidelines to the 'documents' folder
# Add trained ML models to the 'models' folder


# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:5000" > .env.development


cd backend
python api.py
# Server runs at http://localhost:5000


cd frontend
npm run dev
# App runs at http://localhost:8080


cd backend
python create_validated_data.py

cd backend
python train_model.py


urbanshield-ai/
├── backend/
│   ├── api.py                 # Main Flask API
│   ├── chatbot.py              # RAG chatbot implementation
│   ├── alert_engine.py         # Weather alert detection
│   ├── realtime_weather.py     # OpenWeatherMap integration
│   ├── train_model.py          # Model training script
│   ├── create_validated_data.py # Dataset creation
│   ├── feature_engineering.py   # Feature creation
│   ├── requirements.txt         # Python dependencies
│   ├── models/                  # Trained ML models
│   ├── datasets/                # Generated datasets
│   ├── documents/                # NDMA PDF guidelines
│   └── index/                    # FAISS vector store
│
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── chat/             # Chatbot widget
│   │   │   ├── ui/                # UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── RiskGauge.tsx
│   │   │   └── WeatherCard.tsx
│   │   ├── pages/                 # Page components
│   │   │   ├── Index.tsx          # Dashboard
│   │   │   ├── Predict.tsx        # Prediction page
│   │   │   ├── Monitoring.tsx     # Real-time monitoring
│   │   │   ├── Historical.tsx     # Historical analysis
│   │   │   └── Alerts.tsx         # Alerts configuration
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/               # API services
│   │   ├── assets/                  # Images and icons
│   │   └── App.tsx                  # Main app component
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
├── requirements.txt                # Project dependencies
└── README.md                       # This file
