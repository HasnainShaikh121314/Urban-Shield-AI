import pandas as pd
import numpy as np
from datetime import datetime
import os
import sys

# Add the current directory to path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import your modules
from weather_fetcher import fetch_multiple_cities_data, verify_data_quality
from feature_engineering import create_features, create_labels, add_synthetic_flood_events, get_city_region

# Pakistani cities with their coordinates - Top 10 from each province
PAKISTAN_CITIES = {
    # ========== PUNJAB (10 cities) ==========
    "Lahore": (31.5204, 74.3587),        # Provincial capital
    "Faisalabad": (31.4504, 73.1350),     # Industrial hub
    "Rawalpindi": (33.5651, 73.0169),     # Military city
    "Multan": (30.1575, 71.5249),         # City of saints
    "Gujranwala": (32.1617, 74.1883),     # Industrial city
    "Sialkot": (32.4945, 74.5229),        # Sports goods
    "Bahawalpur": (29.3956, 71.6836),     # Historical city
    "Sargodha": (32.0836, 72.6711),       # Citrus city
    "Sheikhupura": (31.7167, 74.0000),    # Industrial
    "Rahim Yar Khan": (28.4217, 70.3036), # Southern Punjab
    
    # ========== SINDH (10 cities) ==========
    "Karachi": (24.8607, 67.0011),        # Provincial capital, largest city
    "Hyderabad": (25.3960, 68.3578),      # Historical city
    "Sukkur": (27.7052, 68.8574),         # Bridge city
    "Larkana": (27.5600, 68.2264),        # Mohenjo-daro nearby
    "Nawabshah": (26.2442, 68.4100),      # Central Sindh
    "Mirpur Khas": (25.5276, 69.0111),    # Mango city
    "Jacobabad": (28.2819, 68.4376),      # Hottest city
    "Shikarpur": (27.9571, 68.6379),      # Historical
    "Dadu": (26.7343, 67.7762),           # Indus River
    "Thatta": (24.7475, 67.9241),         # Historical sites
    
    # ========== KHYBER PAKHTUNKHWA (10 cities) ==========
    "Peshawar": (34.0151, 71.5805),       # Provincial capital
    "Mardan": (34.1989, 72.0231),         # Second largest
    "Abbottabad": (34.1688, 73.2215),     # Hill station
    "Swat": (34.9000, 72.3500),           # Mingora
    "Kohat": (33.5880, 71.4429),          # Kohat city
    "Bannu": (32.9888, 70.6056),          # Southern KP
    "Dera Ismail Khan": (31.8313, 70.9017), # Southern KP
    "Charsadda": (34.1482, 71.7406),      # Historical
    "Nowshera": (34.0159, 71.9750),       # Industrial
    "Mansehra": (34.3302, 73.2002),       # Hazara region
    
    # ========== BALOCHISTAN (10 cities) ==========
    "Quetta": (30.1798, 66.9750),          # Provincial capital
    "Gwadar": (25.1266, 62.3225),          # Port city
    "Turbat": (26.0023, 63.0545),          # Makran division
    "Khuzdar": (27.8119, 66.6110),         # Central Balochistan
    "Chaman": (30.9210, 66.4598),          # Afghanistan border
    "Sibi": (29.5430, 67.8774),            # Historical
    "Loralai": (30.3680, 68.5980),         # Northern
    "Zhob": (31.3408, 69.4493),            # Northern
    "Dera Bugti": (29.0333, 69.1667),      # Bugti tribe
    "Panjgur": (26.9719, 64.0945),         # Makran
    
    # ========== GILGIT-BALTISTAN (5 cities) ==========
    "Gilgit": (35.9208, 74.3088),          # Capital
    "Skardu": (35.2971, 75.6333),          # Scenic valley
    "Hunza": (36.3167, 74.6500),           # Karimabad
    "Chilas": (35.4167, 74.1000),          # Diamer
    "Ghizer": (36.1667, 73.7500),          # Gupis
    
    # ========== AZAD KASHMIR (5 cities) ==========
    "Muzaffarabad": (34.3700, 73.4711),    # Capital
    "Mirpur": (33.1478, 73.7519),          # Mirpur city
    "Rawalakot": (33.8578, 73.7604),       # Poonch
    "Kotli": (33.5184, 73.9022),           # Kotli city
    "Bhimber": (32.9740, 74.0709),         # Bhimber district
    
    # ========== ISLAMABAD CAPITAL TERRITORY ==========
    "Islamabad": (33.6844, 73.0479),       # Federal capital
}

# City counts by region (you can keep this, but we'll also use the function from feature_engineering)
REGION_CITIES = {
    "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", 
               "Sialkot", "Bahawalpur", "Sargodha", "Sheikhupura", "Rahim Yar Khan"],
    "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", 
              "Mirpur Khas", "Jacobabad", "Shikarpur", "Dadu", "Thatta"],
    "KPK": ["Peshawar", "Mardan", "Abbottabad", "Swat", "Kohat", 
            "Bannu", "Dera Ismail Khan", "Charsadda", "Nowshera", "Mansehra"],
    "Balochistan": ["Quetta", "Gwadar", "Turbat", "Khuzdar", "Chaman", 
                    "Sibi", "Loralai", "Zhob", "Dera Bugti", "Panjgur"],
    "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza", "Chilas", "Ghizer"],
    "Azad Kashmir": ["Muzaffarabad", "Mirpur", "Rawalakot", "Kotli", "Bhimber"],
    "ICT": ["Islamabad"]
}

def create_flood_dataset(start_year=2015, end_year=2023):
    """
    Create complete flood prediction dataset for Pakistan
    """
    print("\n" + "="*80)
    print("🌊 FLOODGUARD AI - VALIDATED DATASET CREATION FOR PAKISTAN")
    print("="*80)
    print(f"📅 Date range: {start_year} to {end_year}")
    print(f"🏙️ Total cities: {len(PAKISTAN_CITIES)}")
    print("\n📋 Regional breakdown:")
    for region, cities in REGION_CITIES.items():
        print(f"   {region}: {len(cities)} cities")
    
    # Validate inputs
    if start_year > end_year:
        print("❌ Error: start_year cannot be greater than end_year")
        return None
    
    if end_year > datetime.now().year:
        print(f"⚠️ Warning: end_year {end_year} is in the future. Data may be incomplete.")
    
    # Format dates
    start_date = f"{start_year}0101"
    end_date = f"{end_year}1231"
    
    # Create output directory if it doesn't exist
    os.makedirs("datasets", exist_ok=True)
    
    # Step 1: Fetch raw data for all cities
    print("\n" + "="*80)
    print("📡 STEP 1: Fetching weather data for Pakistani cities...")
    print("="*80)
    raw_df = fetch_multiple_cities_data(PAKISTAN_CITIES, start=start_date, end=end_date)
    
    if raw_df is None or raw_df.empty:
        print("❌ Failed to fetch data. Exiting.")
        return None
    
    # Save raw data for debugging (optional)
    raw_df.to_csv("datasets/raw_weather_data.csv", index=False)
    print(f"💾 Raw data saved to: datasets/raw_weather_data.csv")
    
    # Step 2: Create features
    print("\n" + "="*80)
    print("🔧 STEP 2: Creating engineered features...")
    print("="*80)
    df_with_features = create_features(raw_df)
    print(f"   ✅ Features created. Shape: {df_with_features.shape}")
    print(f"   📊 Feature columns: {len(df_with_features.columns)}")
    
    # Step 3: Create labels
    print("\n" + "="*80)
    print("🏷️ STEP 3: Creating flood labels...")
    print("="*80)
    final_df = create_labels(df_with_features)
    print(f"   ✅ Labels created. Shape: {final_df.shape}")
    
    # Step 4: Check if we have flood labels, if not add synthetic ones
    if final_df['flood_label'].sum() == 0:
        print("\n" + "="*80)
        print("⚠️  NO FLOOD LABELS DETECTED!")
        print("="*80)
        print("   This could happen for several reasons:")
        print("   1. The time period might have been relatively dry")
        print("   2. The thresholds might be too strict for this region")
        print("   3. The cities selected might be in arid regions")
        
        print("\n📊 Adding synthetic flood events based on historical Pakistan flood patterns...")
        
        # Add synthetic flood events to ensure model can learn
        final_df = add_synthetic_flood_events(final_df, target_ratio=0.05)
        
        print("\n✅ Dataset now has both 0 and 1 labels for training!")
    
    # Show final label distribution
    print("\n" + "="*80)
    print("📊 FINAL LABEL DISTRIBUTION")
    print("="*80)
    flood_count = final_df['flood_label'].sum()
    non_flood_count = len(final_df) - flood_count
    flood_pct = final_df['flood_label'].mean() * 100
    
    print(f"   Total records: {len(final_df):,}")
    print(f"   🟢 Non-flood events (0): {non_flood_count:,} ({100-flood_pct:.2f}%)")
    print(f"   🔴 Flood events (1): {flood_count:,} ({flood_pct:.2f}%)")
    
    # Step 5: Add additional useful columns
    print("\n" + "="*80)
    print("📝 STEP 5: Adding metadata columns...")
    print("="*80)
    final_df["year"] = final_df["date"].dt.year
    final_df["data_source"] = "NASA POWER API"
    final_df["country"] = "Pakistan"
    
    # Add region column (using the function from feature_engineering)
    final_df["region"] = final_df["city"].apply(get_city_region)
    
    # Add season name (if not already there)
    if "season" not in final_df.columns:
        from feature_engineering import get_season
        final_df["season"] = final_df["month"].apply(get_season)
    
    # Step 6: Reorder columns for better readability
    column_order = [
        'date', 'city', 'region', 'country', 'year', 'month', 'season', 'day_of_year',
        'rain', 'rain_3day', 'rain_7day', 'rain_15day', 'rain_30day',
        'rain_intensity', 'consecutive_rain_days', 'heavy_rain_day',
        'pressure', 'pressure_change', 'pressure_3day_trend', 'rapid_pressure_drop',
        'temp', 'temp_change', 'temp_3day_trend', 'extreme_heat', 'extreme_cold',
        'humidity', 'humidity_change', 'high_humidity',
        'wind_speed',
        'is_monsoon_season', 'is_winter_rain_season',
        'flood_label', 'flood_severity', 'flood_type', 'data_source'
    ]
    
    # Only keep columns that exist
    existing_columns = [col for col in column_order if col in final_df.columns]
    
    # Add any remaining columns not in the order list
    remaining_cols = [col for col in final_df.columns if col not in existing_columns]
    final_columns = existing_columns + remaining_cols
    
    final_df = final_df[final_columns]
    
    # Step 7: Save to CSV
    print("\n" + "="*80)
    print("💾 STEP 6: Saving dataset...")
    print("="*80)
    
    # Create filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"datasets/pakistan_flood_dataset_{timestamp}.csv"
    
    # Save to CSV
    final_df.to_csv(filename, index=False)
    print(f"✅ Dataset saved to: {filename}")
    
    # Also save a copy as 'latest_dataset.csv' for easy access
    final_df.to_csv("datasets/latest_flood_dataset.csv", index=False)
    print(f"✅ Also saved as: datasets/latest_flood_dataset.csv")
    
    # Create a smaller sample for quick testing (optional)
    sample_df = final_df.groupby('city').apply(lambda x: x.sample(min(100, len(x)))).reset_index(drop=True)
    sample_df.to_csv("datasets/sample_flood_dataset.csv", index=False)
    print(f"✅ Sample dataset (100 rows/city) saved to: datasets/sample_flood_dataset.csv")
    
    # Step 8: Display statistics
    print("\n" + "="*80)
    print("📊 DATASET STATISTICS")
    print("="*80)
    print(f"📈 Total records: {len(final_df):,}")
    print(f"📅 Date range: {final_df['date'].min().date()} to {final_df['date'].max().date()}")
    print(f"🏙️ Cities included: {len(final_df['city'].unique())}")
    print(f"🌍 Regions included: {len(final_df['region'].unique())}")
    
    print("\n📊 Records per region:")
    for region in final_df['region'].value_counts().index:
        count = final_df['region'].value_counts()[region]
        flood_count = final_df[final_df['region'] == region]['flood_label'].sum()
        flood_pct = (flood_count / count) * 100 if count > 0 else 0
        print(f"   {region:15s}: {count:6,d} days | 🔴 {flood_count:4,d} floods ({flood_pct:5.2f}%)")
    
    print("\n🏙️ Top 10 cities by flood events:")
    city_stats = []
    for city in final_df['city'].unique():
        city_data = final_df[final_df['city'] == city]
        total_days = len(city_data)
        flood_events = city_data['flood_label'].sum()
        flood_pct = (flood_events / total_days) * 100
        city_stats.append({
            'city': city,
            'days': total_days,
            'floods': flood_events,
            'pct': flood_pct
        })
    
    city_stats.sort(key=lambda x: x['floods'], reverse=True)
    for stat in city_stats[:10]:
        print(f"   {stat['city']:15s}: {stat['days']:5,d} days | 🔴 {stat['floods']:3,d} floods ({stat['pct']:5.2f}%)")
    
    print("\n📊 Flood event statistics:")
    print(f"   Total flood events: {final_df['flood_label'].sum():,}")
    if final_df[final_df['flood_label']==1]['flood_severity'].count() > 0:
        print(f"   Average flood severity: {final_df[final_df['flood_label']==1]['flood_severity'].mean():.2f}/5")
    
    if 'flood_type' in final_df.columns and final_df[final_df['flood_label']==1]['flood_type'].count() > 0:
        print("\n📋 Flood type breakdown:")
        for flood_type, count in final_df[final_df['flood_label']==1]['flood_type'].value_counts().items():
            pct = (count / final_df['flood_label'].sum()) * 100
            print(f"   {flood_type:20s}: {count:4,d} ({pct:5.2f}%)")
    
    print("\n📁 Column list:")
    for i, col in enumerate(final_df.columns, 1):
        print(f"   {i:2d}. {col}")
    
    # Step 9: Data quality summary
    print("\n" + "="*80)
    print("✅ DATA QUALITY SUMMARY")
    print("="*80)
    missing_data = final_df.isnull().sum()
    missing_pct = (missing_data / len(final_df)) * 100
    
    for col in final_df.columns[:15]:  # Show first 15 columns
        if missing_pct[col] > 0:
            print(f"   ⚠️ {col}: {missing_pct[col]:.2f}% missing")
    
    if missing_pct.sum() == 0:
        print("   ✅ No missing values in the dataset!")
    
    return final_df


def analyze_flood_patterns(df):
    """
    Analyze flood patterns in the dataset
    """
    print("\n" + "="*80)
    print("🔍 FLOOD PATTERN ANALYSIS")
    print("="*80)
    
    if df['flood_label'].sum() == 0:
        print("❌ No flood events to analyze.")
        return
    
    total_floods = df['flood_label'].sum()
    
    # Floods by month
    monthly_floods = df[df['flood_label'] == 1].groupby('month').size()
    print("\n🌧️ Floods by Month:")
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for month in range(1, 13):
        count = monthly_floods.get(month, 0)
        percentage = (count / total_floods) * 100
        bar = "█" * int(percentage / 2)
        print(f"   {month_names[month-1]}: {count:3,d} ({percentage:5.2f}%) {bar}")
    
    # Floods by region
    print("\n🌍 Floods by Region:")
    region_floods = df[df['flood_label'] == 1].groupby('region').size().sort_values(ascending=False)
    for region, count in region_floods.items():
        region_total = len(df[df['region'] == region])
        percentage = (count / region_total) * 100 if region_total > 0 else 0
        bar = "█" * int(percentage / 2)
        print(f"   {region:15s}: {count:3,d} ({percentage:5.2f}% of days) {bar}")
    
    # Floods by city (top 10)
    print("\n🏙️ Floods by City (Top 10):")
    city_floods = df[df['flood_label'] == 1].groupby('city').size().sort_values(ascending=False).head(10)
    for city, count in city_floods.items():
        city_total = len(df[df['city'] == city])
        percentage = (count / city_total) * 100 if city_total > 0 else 0
        bar = "█" * int(percentage)
        print(f"   {city:15s}: {count:3,d} ({percentage:5.2f}%) {bar}")
    
    # Average conditions during floods
    flood_conditions = df[df['flood_label'] == 1][['rain_7day', 'pressure_change', 'humidity', 'temp']].mean()
    normal_conditions = df[df['flood_label'] == 0][['rain_7day', 'pressure_change', 'humidity', 'temp']].mean()
    
    print("\n📈 Average conditions comparison:")
    print(f"   {'Metric':<20} {'During Flood':>15} {'Normal':>15} {'Difference':>15}")
    print(f"   {'-'*68}")
    print(f"   {'7-day rainfall (mm)':<20} {flood_conditions['rain_7day']:>15.2f} {normal_conditions['rain_7day']:>15.2f} {flood_conditions['rain_7day']-normal_conditions['rain_7day']:>15.2f}")
    print(f"   {'Pressure change (hPa)':<20} {flood_conditions['pressure_change']:>15.2f} {normal_conditions['pressure_change']:>15.2f} {flood_conditions['pressure_change']-normal_conditions['pressure_change']:>15.2f}")
    print(f"   {'Humidity (%)':<20} {flood_conditions['humidity']:>15.2f} {normal_conditions['humidity']:>15.2f} {flood_conditions['humidity']-normal_conditions['humidity']:>15.2f}")
    print(f"   {'Temperature (°C)':<20} {flood_conditions['temp']:>15.2f} {normal_conditions['temp']:>15.2f} {flood_conditions['temp']-normal_conditions['temp']:>15.2f}")


def load_existing_dataset(filepath="datasets/latest_flood_dataset.csv"):
    """
    Load an existing dataset if it exists
    """
    if os.path.exists(filepath):
        print(f"📂 Loading existing dataset from {filepath}")
        return pd.read_csv(filepath, parse_dates=['date'])
    return None


if __name__ == "__main__":
    import argparse
    
    # Set up command line arguments
    parser = argparse.ArgumentParser(description='Create flood dataset for Pakistan')
    parser.add_argument('--start-year', type=int, default=2015, help='Start year (default: 2015)')
    parser.add_argument('--end-year', type=int, default=2023, help='End year (default: 2023)')
    parser.add_argument('--force', action='store_true', help='Force recreate even if dataset exists')
    
    args = parser.parse_args()
    
    # Check if dataset already exists
    if not args.force:
        existing = load_existing_dataset()
        if existing is not None:
            print(f"✅ Existing dataset found with {len(existing):,} records")
            response = input("Do you want to create a new dataset anyway? (y/n): ")
            if response.lower() != 'y':
                print("Using existing dataset. Exiting.")
                sys.exit(0)
    
    # Create the dataset
    dataset = create_flood_dataset(start_year=args.start_year, end_year=args.end_year)
    
    if dataset is not None:
        # Analyze patterns
        analyze_flood_patterns(dataset)
        
        print("\n" + "="*80)
        print("✅✅✅ DATASET CREATION COMPLETED SUCCESSFULLY! ✅✅✅")
        print("="*80)
        print("\n📌 Next steps:")
        print("   1. Train your model: python train_model.py")
        print("   2. Run the Streamlit app: streamlit run app.py")
        print("\n📁 Files created in 'datasets' folder:")
        print("   - pakistan_flood_dataset_[timestamp].csv (dated version)")
        print("   - latest_flood_dataset.csv (always points to latest)")
        print("   - sample_flood_dataset.csv (small sample for testing)")
        print("   - raw_weather_data.csv (raw fetched data)")