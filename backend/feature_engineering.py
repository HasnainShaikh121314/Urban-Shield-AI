import pandas as pd
import numpy as np

def create_features(df):
    """
    Create time-based features for flood prediction
    Enhanced for Pakistan's diverse geography
    """
    df = df.copy()
    
    # Sort by city and date to ensure correct rolling calculations
    df = df.sort_values(['city', 'date']).reset_index(drop=True)
    
    # ============================================
    # TIME FEATURES - CREATE THESE FIRST!
    # ============================================
    
    df["month"] = df["date"].dt.month
    df["day_of_year"] = df["date"].dt.dayofyear
    df["week_of_year"] = df["date"].dt.isocalendar().week
    df["season"] = df["month"].apply(get_season)
    
    # Pakistan-specific seasonal flags
    df["is_monsoon_season"] = df["month"].isin([7, 8, 9]).astype(int)  # July-September
    df["is_winter_rain_season"] = df["month"].isin([1, 2, 3]).astype(int)  # Jan-March
    df["is_pre_monsoon"] = df["month"].isin([4, 5, 6]).astype(int)  # April-June
    df["is_post_monsoon"] = df["month"].isin([10, 11]).astype(int)  # Oct-Nov
    
    # ============================================
    # RAINFALL FEATURES
    # ============================================
    
    # Rolling sums by city
    df["rain_3day"] = df.groupby('city')['rain'].transform(lambda x: x.rolling(3, min_periods=1).sum())
    df["rain_7day"] = df.groupby('city')['rain'].transform(lambda x: x.rolling(7, min_periods=1).sum())
    df["rain_15day"] = df.groupby('city')['rain'].transform(lambda x: x.rolling(15, min_periods=1).sum())
    df["rain_30day"] = df.groupby('city')['rain'].transform(lambda x: x.rolling(30, min_periods=1).sum())
    
    # Rainfall intensity features
    df["rain_intensity"] = df["rain"] / 24  # mm per hour (approximate)
    df["heavy_rain_day"] = (df["rain"] > 50).astype(int)  # Heavy rain threshold
    
    # Consecutive rain days (important for soil saturation)
    def count_consecutive_rain(series):
        count = 0
        result = []
        for val in series:
            if val > 0.1:  # More than 0.1mm rain
                count += 1
            else:
                count = 0
            result.append(count)
        return result
    
    df["consecutive_rain_days"] = df.groupby('city')['rain'].transform(
        lambda x: count_consecutive_rain(x)
    )
    
    # Rain accumulation patterns
    df["rain_7day_vs_30day"] = df["rain_7day"] / (df["rain_30day"] + 0.001)  # Recent vs historical
    
    # ============================================
    # PRESSURE FEATURES
    # ============================================
    
    df["pressure_change"] = df.groupby('city')['pressure'].diff()
    df["pressure_3day_trend"] = df.groupby('city')['pressure'].transform(
        lambda x: x.rolling(3, min_periods=1).apply(lambda y: y.iloc[-1] - y.iloc[0] if len(y) > 1 else 0)
    )
    
    # Rapid pressure drop indicator (for cyclones/storms)
    df["rapid_pressure_drop"] = (df["pressure_change"] < -3).astype(int)
    
    # ============================================
    # TEMPERATURE FEATURES
    # ============================================
    
    df["temp_change"] = df.groupby('city')['temp'].diff()
    
    # 3-day temperature trend
    df["temp_3day_trend"] = df.groupby('city')['temp'].transform(
        lambda x: x.rolling(3, min_periods=1).apply(lambda y: y.iloc[-1] - y.iloc[0] if len(y) > 1 else 0)
    )
    
    # Temperature extremes
    df["extreme_heat"] = (df["temp"] > 40).astype(int)  # Heatwave threshold
    df["extreme_cold"] = (df["temp"] < 5).astype(int)   # Cold wave threshold
    
    # ============================================
    # HUMIDITY FEATURES
    # ============================================
    
    df["humidity_change"] = df.groupby('city')['humidity'].diff()
    df["high_humidity"] = (df["humidity"] > 80).astype(int)  # High humidity indicator
    
    # ============================================
    # GEOGRAPHIC FEATURES
    # ============================================
    
    # Define geographic regions based on city
    def get_city_region(city):
        coastal_cities = ["Karachi", "Gwadar", "Thatta"]
        northern_cities = ["Gilgit", "Skardu", "Hunza", "Chilas", "Muzaffarabad"]
        mountain_cities = ["Abbottabad", "Murree", "Swat", "Mansehra"]
        plain_cities = ["Lahore", "Faisalabad", "Multan", "Sialkot", "Gujranwala", "Rawalpindi"]
        arid_cities = ["Quetta", "Turbat", "Khuzdar", "Jacobabad", "Sukkur"]
        
        if city in coastal_cities:
            return "coastal"
        elif city in northern_cities:
            return "northern"
        elif city in mountain_cities:
            return "mountain"
        elif city in plain_cities:
            return "plain"
        elif city in arid_cities:
            return "arid"
        else:
            return "other"
    
    df["geographic_region"] = df["city"].apply(get_city_region)
    
    # ============================================
    # INTERACTION FEATURES
    # ============================================
    
    # Monsoon × rainfall (interaction)
    df["monsoon_rain_7day"] = df["is_monsoon_season"] * df["rain_7day"]
    
    # Coastal × pressure drop (for cyclones)
    df["coastal_storm_risk"] = ((df["geographic_region"] == "coastal").astype(int)) * df["rapid_pressure_drop"]
    
    # Mountain × rain (for landslides)
    df["mountain_rain_risk"] = ((df["geographic_region"] == "mountain").astype(int)) * (df["rain_3day"] > 100).astype(int)
    
    # ============================================
    # PRESSURE ANOMALY - NOW USING MONTH COLUMN THAT EXISTS
    # ============================================
    
    # Calculate monthly average pressure AFTER month column is created
    df["monthly_avg_pressure"] = df.groupby(['city', 'month'])['pressure'].transform('mean')
    df["pressure_anomaly"] = df["pressure"] - df["monthly_avg_pressure"]
    
    return df


def get_season(month):
    """Assign season based on month (Pakistan context)"""
    if month in [12, 1, 2]:
        return 'winter'
    elif month in [3, 4, 5]:
        return 'spring'
    elif month in [6, 7, 8, 9]:
        return 'monsoon'  # June-September is monsoon in Pakistan
    else:
        return 'autumn'


def create_labels(df):
    """
    Create flood labels based on Pakistan's actual flood patterns
    Enhanced for diverse geographic regions
    """
    df = df.copy()
    
    # ============================================
    # REGION-SPECIFIC THRESHOLDS
    # ============================================
    
    # Coastal areas (Karachi, Gwadar) - cyclones, storm surges
    coastal_flood = (
        (df["geographic_region"] == "coastal") &
        (
            (df["rapid_pressure_drop"] == 1) |  # Cyclone indicator
            (df["rain_3day"] > 100)  # Heavy rain
        )
    )
    
    # Northern areas (Gilgit, Skardu) - glacial lake outbursts, heavy snowmelt
    northern_flood = (
        (df["geographic_region"] == "northern") &
        (
            (df["temp"] > 25) & (df["rain_7day"] > 50)  # Snowmelt + rain
        )
    )
    
    # Mountain areas (Abbottabad, Murree) - landslides, flash floods
    mountain_flood = (
        (df["geographic_region"] == "mountain") &
        (
            (df["rain_3day"] > 150) |  # Heavy rain in mountains
            (df["consecutive_rain_days"] > 3)  # Prolonged rain
        )
    )
    
    # Plain areas (Punjab) - riverine flooding
    plain_flood = (
        (df["geographic_region"] == "plain") &
        (
            (df["rain_15day"] > 200) |  # Sustained rainfall
            ((df["is_monsoon_season"] == 1) & (df["rain_7day"] > 100))
        )
    )
    
    # Arid areas (Balochistan) - flash floods after drought
    arid_flood = (
        (df["geographic_region"] == "arid") &
        (
            (df["rain"] > 30) &  # Even moderate rain can cause flash floods in arid regions
            (df["consecutive_rain_days"] == 1)  # First rain after dry period
        )
    )
    
    # ============================================
    # ORIGINAL FLOOD SCENARIOS
    # ============================================
    
    # Scenario 1: EXTREME RAINFALL EVENT
    extreme_rainfall = (
        (df["rain"] > 100) |  # Very heavy rainfall in one day
        (df["rain_3day"] > 200) |  # Heavy rainfall over 3 days
        (df["rain_7day"] > 300)  # Heavy rainfall over a week
    )
    
    # Scenario 2: MONSOON FLOODING
    monsoon_flood = (
        (df["is_monsoon_season"] == 1) &
        (
            (df["rain_3day"] > 80) |
            (df["rain_7day"] > 150)
        ) &
        (df["pressure_change"] < -1)
    )
    
    # Scenario 3: URBAN FLOODING
    urban_flood = (
        (df["rain"] > 50) &
        (df["rain_3day"] > 70)
    )
    
    # Scenario 4: RIVERINE FLOOD
    riverine_flood = (
        (df["rain_15day"] > 250) |
        (df["rain_30day"] > 400)
    )
    
    # Scenario 5: STORM-INDUCED FLOOD
    storm_flood = (
        (df["pressure_change"] < -3) &
        (df["rain"] > 40)
    )
    
    # Scenario 6: WINTER RAINFALL FLOOD
    winter_flood = (
        (df["is_winter_rain_season"] == 1) &
        (df["rain_3day"] > 60) &
        (df["temp"] < 20)
    )
    
    # ============================================
    # COMBINE ALL SCENARIOS
    # ============================================
    
    df["flood_label"] = (
        extreme_rainfall |
        monsoon_flood |
        urban_flood |
        riverine_flood |
        storm_flood |
        winter_flood |
        coastal_flood |
        northern_flood |
        mountain_flood |
        plain_flood |
        arid_flood
    ).astype(int)
    
    # ============================================
    # FLOOD SEVERITY
    # ============================================
    
    df["flood_severity"] = 0
    flood_mask = df["flood_label"] == 1
    
    if flood_mask.any():
        rain_factor = np.clip(df.loc[flood_mask, "rain_7day"] / 300, 0, 1)
        pressure_factor = np.clip(abs(df.loc[flood_mask, "pressure_change"]) / 5, 0, 1)
        duration_factor = np.clip(df.loc[flood_mask, "consecutive_rain_days"] / 7, 0, 1)
        
        severity_score = (
            rain_factor * 0.4 +
            pressure_factor * 0.3 +
            duration_factor * 0.3
        )
        
        df.loc[flood_mask, "flood_severity"] = (severity_score * 4 + 1).round().astype(int)
    
    # ============================================
    # FLOOD TYPE CLASSIFICATION
    # ============================================
    
    df["flood_type"] = "none"
    
    df.loc[extreme_rainfall, "flood_type"] = "extreme_rainfall"
    df.loc[monsoon_flood & ~extreme_rainfall, "flood_type"] = "monsoon"
    df.loc[urban_flood & ~extreme_rainfall & ~monsoon_flood, "flood_type"] = "urban"
    df.loc[riverine_flood & ~extreme_rainfall & ~monsoon_flood & ~urban_flood, "flood_type"] = "riverine"
    df.loc[storm_flood, "flood_type"] = "storm"
    df.loc[winter_flood, "flood_type"] = "winter"
    df.loc[coastal_flood, "flood_type"] = "coastal_cyclone"
    df.loc[northern_flood, "flood_type"] = "glacial"
    df.loc[mountain_flood, "flood_type"] = "flash_flood"
    df.loc[arid_flood, "flood_type"] = "arid_flash"
    
    # ============================================
    # STATISTICS
    # ============================================
    
    total_records = len(df)
    flood_count = df["flood_label"].sum()
    flood_percentage = (flood_count / total_records) * 100
    
    print(f"\n📊 FLOOD LABEL STATISTICS:")
    print(f"   Total records: {total_records:,}")
    print(f"   Non-flood days (0): {total_records - flood_count:,} ({(100 - flood_percentage):.1f}%)")
    print(f"   Flood days (1): {flood_count:,} ({flood_percentage:.1f}%)")
    
    if flood_count > 0:
        print(f"\n📋 Flood Type Breakdown:")
        for flood_type in df[df["flood_label"] == 1]["flood_type"].value_counts().index:
            count = df[df["flood_type"] == flood_type].shape[0]
            percentage = (count / flood_count) * 100
            print(f"   {flood_type}: {count} ({percentage:.1f}%)")
    
    return df


def add_synthetic_flood_events(df, target_ratio=0.05):
    """
    Add synthetic flood events with region-appropriate characteristics
    """
    df = df.copy()
    
    current_ratio = df["flood_label"].mean()
    
    if current_ratio >= target_ratio:
        return df
    
    print(f"\n🔄 Adding synthetic flood events to achieve {target_ratio*100:.1f}% flood ratio")
    print(f"   Current ratio: {current_ratio*100:.2f}%")
    
    # Get non-flood days
    non_flood_mask = df["flood_label"] == 0
    non_flood_indices = df[non_flood_mask].index
    
    # Calculate how many synthetic events needed
    total_needed = int(len(df) * target_ratio)
    current_flood = df["flood_label"].sum()
    synthetic_needed = total_needed - current_flood
    
    if synthetic_needed <= 0:
        return df
    
    # Select random non-flood days to convert
    np.random.seed(42)
    synthetic_indices = np.random.choice(
        non_flood_indices, 
        size=min(synthetic_needed, len(non_flood_indices)),
        replace=False
    )
    
    # Create synthetic floods based on region
    for idx in synthetic_indices:
        city = df.loc[idx, "city"]
        region = get_city_region(city)
        
        df.loc[idx, "flood_label"] = 1
        
        # Region-specific synthetic flood characteristics
        if region == "coastal":
            df.loc[idx, "pressure_change"] = np.random.uniform(-5, -3)
            df.loc[idx, "rain_3day"] = np.random.uniform(80, 150)
            df.loc[idx, "flood_type"] = "synthetic_coastal"
        elif region == "northern":
            df.loc[idx, "temp"] = np.random.uniform(20, 30)
            df.loc[idx, "rain_7day"] = np.random.uniform(60, 120)
            df.loc[idx, "flood_type"] = "synthetic_glacial"
        elif region == "mountain":
            df.loc[idx, "rain_3day"] = np.random.uniform(120, 200)
            df.loc[idx, "consecutive_rain_days"] = np.random.randint(3, 6)
            df.loc[idx, "flood_type"] = "synthetic_flash"
        else:
            df.loc[idx, "rain_7day"] = np.random.uniform(150, 250)
            df.loc[idx, "rain_15day"] = np.random.uniform(200, 350)
            df.loc[idx, "flood_type"] = "synthetic"
        
        df.loc[idx, "flood_severity"] = np.random.randint(2, 5)
    
    print(f"   Added {synthetic_needed} synthetic flood events")
    print(f"   New flood ratio: {df['flood_label'].mean()*100:.2f}%")
    
    return df


def get_city_region(city):
    """Helper to determine geographic region of a city"""
    coastal_cities = ["Karachi", "Gwadar", "Thatta"]
    northern_cities = ["Gilgit", "Skardu", "Hunza", "Chilas", "Muzaffarabad"]
    mountain_cities = ["Abbottabad", "Murree", "Swat", "Mansehra"]
    plain_cities = ["Lahore", "Faisalabad", "Multan", "Sialkot", "Gujranwala", "Rawalpindi"]
    arid_cities = ["Quetta", "Turbat", "Khuzdar", "Jacobabad", "Sukkur"]
    
    if city in coastal_cities:
        return "coastal"
    elif city in northern_cities:
        return "northern"
    elif city in mountain_cities:
        return "mountain"
    elif city in plain_cities:
        return "plain"
    elif city in arid_cities:
        return "arid"
    else:
        return "other"