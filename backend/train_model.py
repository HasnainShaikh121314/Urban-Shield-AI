import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, f1_score
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import os
import warnings
warnings.filterwarnings('ignore')

def train_model(csv_path="datasets/latest_flood_dataset.csv", model_dir="models"):
    """
    Train flood prediction model using the created dataset
    Enhanced for Pakistan's diverse geography
    """
    print("\n" + "="*70)
    print("🌊 FLOODGUARD AI - PAKISTAN FLOOD PREDICTION MODEL TRAINING")
    print("="*70)
    
    # Create model directory if it doesn't exist
    os.makedirs(model_dir, exist_ok=True)
    
    # Load dataset
    print("\n📂 Loading dataset...")
    if not os.path.exists(csv_path):
        print(f"❌ Dataset not found at {csv_path}")
        print("   Please run create_validated_data.py first")
        return None, None, None
    
    df = pd.read_csv(csv_path, parse_dates=['date'] if 'date' in pd.read_csv(csv_path, nrows=1).columns else None)
    print(f"✅ Dataset loaded: {len(df):,} records")
    print(f"📊 Shape: {df.shape}")
    
    # Display dataset info
    print(f"\n📊 Dataset Overview:")
    print(f"   Cities: {df['city'].nunique()}")
    print(f"   Date range: {df['date'].min()} to {df['date'].max()}" if 'date' in df.columns else "")
    print(f"   Flood events: {df['flood_label'].sum():,} ({df['flood_label'].mean()*100:.2f}%)")
    
    # ============================================
    # FEATURE SELECTION (Enhanced for Pakistan)
    # ============================================
    
    # Base features (always include)
    base_features = [
        'rain', 'rain_3day', 'rain_7day', 'rain_15day', 'rain_30day',
        'pressure', 'pressure_change', 'pressure_3day_trend',
        'temp', 'temp_change',
        'humidity', 'humidity_change',
        'wind_speed',
        'month', 'day_of_year'
    ]
    
    # Advanced features from feature_engineering.py
    advanced_features = [
        'rain_intensity', 'consecutive_rain_days', 'heavy_rain_day',
        'rapid_pressure_drop', 'pressure_anomaly',
        'temp_3day_trend', 'extreme_heat', 'extreme_cold',
        'high_humidity',
        'is_monsoon_season', 'is_winter_rain_season',
        'monsoon_rain_7day'
    ]
    
    # Define feature sets
    feature_sets = {
        'base': base_features,
        'advanced': base_features + [f for f in advanced_features if f in df.columns],
        'all': [col for col in df.columns if col not in 
                ['date', 'city', 'region', 'country', 'flood_label', 'flood_severity', 
                 'flood_type', 'data_source', 'year', 'season', 'geographic_region']]
    }
    
    # Choose which feature set to use (can be modified)
    use_feature_set = 'advanced'  # Change to 'base' or 'all' if needed
    
    # Get available features
    available_features = [col for col in feature_sets[use_feature_set] if col in df.columns]
    
    print(f"\n🔧 Using {len(available_features)} features for training ({use_feature_set} set)")
    if len(available_features) < 10:
        print("⚠️  Warning: Very few features available. Check feature engineering.")
    
    # Prepare features and target
    X = df[available_features]
    y = df['flood_label']
    
    # Check for class imbalance
    class_ratio = y.mean()
    print(f"\n⚖️  Class balance: {class_ratio*100:.2f}% positive (flood) samples")
    
    # Handle any missing values
    if X.isnull().sum().sum() > 0:
        print("\n⚠️  Missing values detected. Filling with column means...")
        X = X.fillna(X.mean())
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=available_features)
    
    # Split data with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\n📊 Data Split:")
    print(f"   Training set: {len(X_train):,} samples ({len(X_train)/len(X)*100:.1f}%)")
    print(f"   Test set: {len(X_test):,} samples ({len(X_test)/len(X)*100:.1f}%)")
    print(f"   Training flood events: {y_train.sum():,} ({y_train.mean()*100:.2f}%)")
    print(f"   Test flood events: {y_test.sum():,} ({y_test.mean()*100:.2f}%)")
    
    # Compute class weights for imbalanced data
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(y_train),
        y=y_train
    )
    class_weight_dict = dict(zip(np.unique(y_train), class_weights))
    print(f"\n⚖️  Class weights: {class_weight_dict}")
    
    # ============================================
    # MODEL TRAINING WITH HYPERPARAMETER TUNING
    # ============================================
    
    models = {}
    results = {}
    
    # 1. Random Forest with class weights
    print("\n" + "="*70)
    print("🌲 Training Random Forest Model...")
    print("="*70)
    
    # Define parameter grid for Random Forest
    rf_params = {
        'n_estimators': [100, 200, 300],
        'max_depth': [10, 15, 20, None],
        'min_samples_split': [5, 10, 20],
        'min_samples_leaf': [2, 5, 10],
        'class_weight': ['balanced', 'balanced_subsample', class_weight_dict]
    }
    
    # Use a smaller grid for faster training
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    rf_model.fit(X_train, y_train)
    models['RandomForest'] = rf_model
    
    # Evaluate Random Forest
    rf_train_score = rf_model.score(X_train, y_train)
    rf_test_score = rf_model.score(X_test, y_test)
    rf_pred = rf_model.predict(X_test)
    rf_proba = rf_model.predict_proba(X_test)[:, 1]
    rf_auc = roc_auc_score(y_test, rf_proba)
    rf_f1 = f1_score(y_test, rf_pred)
    
    results['RandomForest'] = {
        'train_acc': rf_train_score,
        'test_acc': rf_test_score,
        'auc': rf_auc,
        'f1': rf_f1
    }
    
    print(f"\n📊 Random Forest Results:")
    print(f"   Training accuracy: {rf_train_score:.4f}")
    print(f"   Test accuracy: {rf_test_score:.4f}")
    print(f"   ROC-AUC score: {rf_auc:.4f}")
    print(f"   F1 Score: {rf_f1:.4f}")
    
    # 2. Gradient Boosting
    print("\n" + "="*70)
    print("🚀 Training Gradient Boosting Model...")
    print("="*70)
    
    gb_model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,  # Use subsampling to prevent overfitting
        random_state=42
    )
    
    gb_model.fit(X_train, y_train)
    models['GradientBoosting'] = gb_model
    
    # Evaluate Gradient Boosting
    gb_train_score = gb_model.score(X_train, y_train)
    gb_test_score = gb_model.score(X_test, y_test)
    gb_pred = gb_model.predict(X_test)
    gb_proba = gb_model.predict_proba(X_test)[:, 1]
    gb_auc = roc_auc_score(y_test, gb_proba)
    gb_f1 = f1_score(y_test, gb_pred)
    
    results['GradientBoosting'] = {
        'train_acc': gb_train_score,
        'test_acc': gb_test_score,
        'auc': gb_auc,
        'f1': gb_f1
    }
    
    print(f"\n📊 Gradient Boosting Results:")
    print(f"   Training accuracy: {gb_train_score:.4f}")
    print(f"   Test accuracy: {gb_test_score:.4f}")
    print(f"   ROC-AUC score: {gb_auc:.4f}")
    print(f"   F1 Score: {gb_f1:.4f}")
    
    # 3. XGBoost (if available)
    try:
        import xgboost as xgb
        print("\n" + "="*70)
        print("⚡ Training XGBoost Model...")
        print("="*70)
        
        xgb_model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=class_weight_dict.get(1, 1),
            random_state=42,
            use_label_encoder=False,
            eval_metric='logloss'
        )
        
        xgb_model.fit(X_train, y_train)
        models['XGBoost'] = xgb_model
        
        # Evaluate XGBoost
        xgb_train_score = xgb_model.score(X_train, y_train)
        xgb_test_score = xgb_model.score(X_test, y_test)
        xgb_pred = xgb_model.predict(X_test)
        xgb_proba = xgb_model.predict_proba(X_test)[:, 1]
        xgb_auc = roc_auc_score(y_test, xgb_proba)
        xgb_f1 = f1_score(y_test, xgb_pred)
        
        results['XGBoost'] = {
            'train_acc': xgb_train_score,
            'test_acc': xgb_test_score,
            'auc': xgb_auc,
            'f1': xgb_f1
        }
        
        print(f"\n📊 XGBoost Results:")
        print(f"   Training accuracy: {xgb_train_score:.4f}")
        print(f"   Test accuracy: {xgb_test_score:.4f}")
        print(f"   ROC-AUC score: {xgb_auc:.4f}")
        print(f"   F1 Score: {xgb_f1:.4f}")
        
    except ImportError:
        print("\n⚠️  XGBoost not installed. Skipping...")
    
    # ============================================
    # MODEL COMPARISON AND SELECTION
    # ============================================
    
    print("\n" + "="*70)
    print("📊 MODEL COMPARISON")
    print("="*70)
    
    comparison_df = pd.DataFrame(results).T
    print("\n", comparison_df.round(4))
    
    # Select best model based on ROC-AUC
    best_model_name = comparison_df['auc'].idxmax()
    best_model = models[best_model_name]
    
    print(f"\n✅ Best model: {best_model_name} (ROC-AUC: {results[best_model_name]['auc']:.4f})")
    
    # ============================================
    # DETAILED EVALUATION
    # ============================================
    
    print("\n" + "="*70)
    print("📋 DETAILED CLASSIFICATION REPORT")
    print("="*70)
    
    y_pred = best_model.predict(X_test)
    y_proba = best_model.predict_proba(X_test)[:, 1]
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['No Flood', 'Flood']))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)
    
    # Plot confusion matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['No Flood', 'Flood'],
                yticklabels=['No Flood', 'Flood'])
    plt.title(f'Confusion Matrix - {best_model_name}')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig(os.path.join(model_dir, 'confusion_matrix.png'))
    plt.show()
    
    # ============================================
    # FEATURE IMPORTANCE
    # ============================================
    
    print("\n" + "="*70)
    print("🔝 FEATURE IMPORTANCE ANALYSIS")
    print("="*70)
    
    feature_importance = pd.DataFrame({
        'feature': available_features,
        'importance': best_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 15 Most Important Features:")
    for i, row in feature_importance.head(15).iterrows():
        bar = "█" * int(row['importance'] * 50)
        print(f"   {row['feature']:25s}: {row['importance']:.4f} {bar}")
    
    # Plot feature importance
    plt.figure(figsize=(12, 8))
    top_features = feature_importance.head(15)
    sns.barplot(data=top_features, x='importance', y='feature', palette='viridis')
    plt.title(f'Top 15 Feature Importances - {best_model_name}')
    plt.tight_layout()
    plt.savefig(os.path.join(model_dir, 'feature_importance.png'))
    plt.show()
    
    # ============================================
    # CROSS-VALIDATION
    # ============================================
    
    print("\n" + "="*70)
    print("🔄 CROSS-VALIDATION")
    print("="*70)
    
    cv_scores = cross_val_score(best_model, X_scaled, y, cv=5, scoring='roc_auc')
    print(f"\n5-Fold Cross-Validation ROC-AUC Scores: {cv_scores}")
    print(f"Mean ROC-AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
    
    # ============================================
    # SAVE MODEL AND ARTIFACTS
    # ============================================
    
    print("\n" + "="*70)
    print("💾 SAVING MODEL AND ARTIFACTS")
    print("="*70)
    
    # Save model
    model_path = os.path.join(model_dir, f"flood_model_{best_model_name.lower()}.pkl")
    joblib.dump(best_model, model_path)
    print(f"✅ Model saved as: {model_path}")
    
    # Save scaler
    scaler_path = os.path.join(model_dir, "scaler.pkl")
    joblib.dump(scaler, scaler_path)
    print(f"✅ Scaler saved as: {scaler_path}")
    
    # Save feature names
    features_path = os.path.join(model_dir, "feature_names.pkl")
    joblib.dump(available_features, features_path)
    print(f"✅ Feature names saved as: {features_path}")
    
    # Save model metadata
    metadata = {
        'model_name': best_model_name,
        'train_date': pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        'features_used': available_features,
        'n_features': len(available_features),
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'flood_ratio_train': y_train.mean(),
        'flood_ratio_test': y_test.mean(),
        'roc_auc': results[best_model_name]['auc'],
        'f1_score': results[best_model_name]['f1'],
        'cv_mean': cv_scores.mean(),
        'cv_std': cv_scores.std(),
        'dataset_path': csv_path
    }
    
    metadata_path = os.path.join(model_dir, "model_metadata.json")
    import json
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✅ Model metadata saved as: {metadata_path}")
    
    # Save a copy as default names for the API
    joblib.dump(best_model, "models/flood_model.pkl")
    joblib.dump(scaler, "models/scaler.pkl")
    joblib.dump(available_features, "models/feature_names.pkl")
    print("\n✅ Also saved as default names for API: models/flood_model.pkl")
    
    # ============================================
    # TRAINING SUMMARY
    # ============================================
    
    print("\n" + "="*70)
    print("📈 TRAINING SUMMARY")
    print("="*70)
    print(f"   Best Model: {best_model_name}")
    print(f"   ROC-AUC Score: {results[best_model_name]['auc']:.4f}")
    print(f"   F1 Score: {results[best_model_name]['f1']:.4f}")
    print(f"   Test Accuracy: {results[best_model_name]['test_acc']:.4f}")
    print(f"   Cross-Validation Mean: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
    print(f"\n   Features Used: {len(available_features)}")
    print(f"   Training Samples: {len(X_train)}")
    print(f"   Test Samples: {len(X_test)}")
    
    print("\n" + "="*70)
    print("✅✅✅ MODEL TRAINING COMPLETED SUCCESSFULLY! ✅✅✅")
    print("="*70)
    
    return best_model, scaler, available_features


def test_model_on_city(model, scaler, features, city_data):
    """
    Test the model on a specific city's data
    """
    # Prepare features
    X_city = city_data[features].fillna(city_data[features].mean())
    X_scaled = scaler.transform(X_city)
    
    # Predict
    predictions = model.predict(X_scaled)
    probabilities = model.predict_proba(X_scaled)[:, 1]
    
    return predictions, probabilities


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train flood prediction model')
    parser.add_argument('--dataset', type=str, default="datasets/latest_flood_dataset.csv",
                       help='Path to dataset CSV')
    parser.add_argument('--model-dir', type=str, default="models",
                       help='Directory to save models')
    
    args = parser.parse_args()
    
    model, scaler, features = train_model(
        csv_path=args.dataset,
        model_dir=args.model_dir
    )