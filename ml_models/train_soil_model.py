"""
train_soil_model.py
Train CalibratedClassifierCV(XGBClassifier) on crop_recommendation.csv
Outputs: models/soil_crop_model.pkl + models/soil_scaler.pkl

Usage:
    python train_soil_model.py --data crop_recommendation.csv --output models/
"""
import argparse
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (classification_report, confusion_matrix,
                            accuracy_score, balanced_accuracy_score)
from xgboost import XGBClassifier


def load_and_validate(csv_path: str) -> pd.DataFrame:
    """Load and validate crop_recommendation.csv"""
    print(f"Loading dataset: {csv_path}")
    df = pd.read_csv(csv_path)

    required = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall', 'label']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    print(f"  Shape: {df.shape}")
    print(f"  Crops: {sorted(df['label'].unique())}")
    print(f"  Class distribution:\n{df['label'].value_counts()}")

    # Validate numeric ranges
    assert df['N'].between(0, 200).all(),   "N values out of expected range"
    assert df['P'].between(0, 250).all(),   "P values out of expected range"
    assert df['K'].between(0, 300).all(),   "K values out of expected range"
    assert df['ph'].between(0, 14).all(),   "pH values out of range"
    assert df['temperature'].between(-10, 60).all(), "Temperature out of range"
    assert df['humidity'].between(0, 100).all(),     "Humidity out of range"
    assert df['rainfall'].between(0, 500).all(),     "Rainfall out of range"

    # Drop any null rows
    before = len(df)
    df = df.dropna()
    if len(df) < before:
        print(f"  Dropped {before - len(df)} rows with nulls")

    return df


def train(csv_path: str, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    df = load_and_validate(csv_path)

    FEATURES = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
    X = df[FEATURES].values
    y = df['label'].values

    # Encode labels
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    print(f"\nClasses ({len(le.classes_)}): {list(le.classes_)}")

    # Train / test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    # Scale features
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc  = scaler.transform(X_test)

    # ── XGBoost base classifier ───────────────────────────────────────────────
    xgb = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )

    # ── Wrap with CalibratedClassifierCV (isotonic regression) ───────────────
    # This gives well-calibrated probabilities for confidence scores
    model = CalibratedClassifierCV(
        estimator=xgb,
        method='isotonic',
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
    )

    print("\nTraining CalibratedClassifierCV(XGBClassifier)...")
    model.fit(X_train_sc, y_train)

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred = model.predict(X_test_sc)
    acc    = accuracy_score(y_test, y_pred)
    bal    = balanced_accuracy_score(y_test, y_pred)

    print(f"\n{'='*50}")
    print(f"  Test Accuracy:          {acc:.4f} ({acc*100:.1f}%)")
    print(f"  Balanced Accuracy:      {bal:.4f}")
    print(f"\n{classification_report(y_test, y_pred, target_names=le.classes_)}")

    # Cross-validation score
    cv_scores = cross_val_score(model, X_train_sc, y_train, cv=5, scoring='accuracy', n_jobs=-1)
    print(f"  5-Fold CV Accuracy:     {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(f"{'='*50}")

    # ── Attach label encoder to model for inference ───────────────────────────
    model.classes_ = le.classes_   # override with string labels

    # ── Save artifacts ────────────────────────────────────────────────────────
    model_path  = os.path.join(output_dir, 'soil_crop_model.pkl')
    scaler_path = os.path.join(output_dir, 'soil_scaler.pkl')

    with open(model_path, 'wb') as f:
        pickle.dump(model, f, protocol=pickle.HIGHEST_PROTOCOL)
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f, protocol=pickle.HIGHEST_PROTOCOL)

    print(f"\n✅ Model saved:  {model_path}")
    print(f"✅ Scaler saved: {scaler_path}")

    # ── Quick inference test ─────────────────────────────────────────────────
    print("\nSample prediction (N=90, P=42, K=43, T=20.9, H=82, pH=6.5, rain=203):")
    sample = scaler.transform([[90, 42, 43, 20.9, 82.0, 6.5, 203.0]])
    proba  = model.predict_proba(sample)[0]
    top3   = np.argsort(proba)[::-1][:3]
    for i in top3:
        print(f"  {le.classes_[i]:<15} {proba[i]:.4f} ({proba[i]*100:.1f}%)")

    return acc


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train AgriWise soil/crop model')
    parser.add_argument('--data',   default='crop_recommendation.csv')
    parser.add_argument('--output', default='models/')
    args = parser.parse_args()
    acc = train(args.data, args.output)
    print(f"\nFinal accuracy: {acc*100:.1f}%")
