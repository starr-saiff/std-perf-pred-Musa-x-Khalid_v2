"""
Phase 4 — Modeling
=====================
Trains Logistic Regression, Decision Tree, Random Forest, XGBoost, and
SVM on the early-feature table, tunes each with cross-validated grid
search, and reports Accuracy / Macro-F1 / ROC-AUC (OvR) on a held-out
test set. Saves the best model + preprocessing pipeline for the
explainability phase.
"""

import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import (accuracy_score, f1_score, roc_auc_score,
                              classification_report, confusion_matrix)
from xgboost import XGBClassifier

RANDOM_STATE = 42
DATA_PATH = "G:\Musa/early_features.csv"
MODEL_DIR = "G:\Musa/outputs/models"
FIG_DIR = "G:\Musa/outputs/figures"

df = pd.read_csv(DATA_PATH)

# ---------------------------------------------------------------
# 1. Feature / target split
# ---------------------------------------------------------------
DROP_COLS = ["id_student", "final_result"]  # ids and target
TARGET = "final_result"

y_raw = df[TARGET]
X = df.drop(columns=DROP_COLS)

CATEGORICAL = ["code_module", "code_presentation", "gender", "region",
               "highest_education", "imd_band", "age_band", "disability"]
NUMERIC = [c for c in X.columns if c not in CATEGORICAL]

le = LabelEncoder()
y = le.fit_transform(y_raw)
print("Classes:", dict(zip(le.classes_, range(len(le.classes_)))))

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)
print(f"Train: {X_train.shape}, Test: {X_test.shape}")

# ---------------------------------------------------------------
# 2. Preprocessing pipeline (shared by all models)
# ---------------------------------------------------------------
numeric_pipe = Pipeline([
    ("impute", SimpleImputer(strategy="median")),
    ("scale", StandardScaler()),
])
categorical_pipe = Pipeline([
    ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
    ("onehot", OneHotEncoder(handle_unknown="ignore")),
])
preprocess = ColumnTransformer([
    ("num", numeric_pipe, NUMERIC),
    ("cat", categorical_pipe, CATEGORICAL),
])

cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_STATE)

# NOTE ON SPEED: SVM (RBF kernel) has roughly O(n^2)-O(n^3) training cost,
# which makes a grid search over the full ~22k-row training set impractical
# in this environment. We therefore tune/fit SVM on a stratified 4,000-row
# subsample of the training data (still evaluated on the FULL test set).
# This is documented as a limitation in the final report.
SVM_SUBSAMPLE_N = 4000
svm_idx, _ = train_test_split(
    np.arange(len(X_train)), train_size=SVM_SUBSAMPLE_N,
    stratify=y_train, random_state=RANDOM_STATE
)
X_train_svm = X_train.iloc[svm_idx]
y_train_svm = y_train[svm_idx]

models_and_grids = {
    "LogisticRegression": (
        LogisticRegression(max_iter=2000, class_weight="balanced",
                            random_state=RANDOM_STATE),
        {"clf__C": [0.1, 1, 10]},
        X_train, y_train,
    ),
    "DecisionTree": (
        DecisionTreeClassifier(class_weight="balanced",
                                random_state=RANDOM_STATE),
        {"clf__max_depth": [5, 10, 15], "clf__min_samples_leaf": [5, 20]},
        X_train, y_train,
    ),
    "RandomForest": (
        RandomForestClassifier(class_weight="balanced",
                                random_state=RANDOM_STATE, n_jobs=-1),
        {"clf__n_estimators": [200], "clf__max_depth": [None, 15]},
        X_train, y_train,
    ),
    "XGBoost": (
        XGBClassifier(random_state=RANDOM_STATE, eval_metric="mlogloss",
                       n_jobs=-1),
        {"clf__n_estimators": [200], "clf__max_depth": [4, 6],
         "clf__learning_rate": [0.1]},
        X_train, y_train,
    ),
    "SVM": (
        SVC(probability=True, class_weight="balanced",
            random_state=RANDOM_STATE),
        {"clf__C": [1, 10], "clf__kernel": ["rbf"]},
        X_train_svm, y_train_svm,
    ),
}

results = []
fitted_pipelines = {}

for name, (estimator, grid, X_tr, y_tr) in models_and_grids.items():
    print(f"\n=== Tuning {name} (train rows: {len(X_tr)}) ===", flush=True)
    pipe = Pipeline([("prep", preprocess), ("clf", estimator)])
    search = GridSearchCV(pipe, grid, cv=cv, scoring="f1_macro",
                           n_jobs=-1, verbose=1)
    search.fit(X_tr, y_tr)
    best = search.best_estimator_
    fitted_pipelines[name] = best

    y_pred = best.predict(X_test)
    y_proba = best.predict_proba(X_test)

    acc = accuracy_score(y_test, y_pred)
    f1_macro = f1_score(y_test, y_pred, average="macro")
    try:
        auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")
    except ValueError:
        auc = np.nan

    print(f"Best params: {search.best_params_}")
    print(f"Test Accuracy: {acc:.4f} | Macro-F1: {f1_macro:.4f} | Macro-AUC: {auc:.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    results.append({
        "model": name, "best_params": search.best_params_,
        "accuracy": acc, "macro_f1": f1_macro, "macro_auc": auc,
    })

    # confusion matrix figure
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=le.classes_, yticklabels=le.classes_)
    plt.title(f"Confusion Matrix — {name}")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.savefig(f"{FIG_DIR}/cm_{name}.png", dpi=150)
    plt.close()

results_df = pd.DataFrame(results).sort_values("macro_f1", ascending=False)
print("\n=== Model comparison (sorted by Macro-F1) ===")
print(results_df[["model", "accuracy", "macro_f1", "macro_auc"]].to_string(index=False))

results_df.to_csv("G:\Musa/outputs/model_comparison.csv", index=False)

# ---------------------------------------------------------------
# 3. Model comparison bar chart
# ---------------------------------------------------------------
plot_df = results_df.melt(id_vars="model",
                           value_vars=["accuracy", "macro_f1", "macro_auc"],
                           var_name="metric", value_name="score")
plt.figure(figsize=(9, 5))
sns.barplot(data=plot_df, x="model", y="score", hue="metric", palette="viridis")
plt.title("Model Comparison — Test Set Performance")
plt.ylim(0, 1)
plt.ylabel("Score")
plt.xlabel("")
plt.legend(title="")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/07_model_comparison.png", dpi=150)
plt.close()

# ---------------------------------------------------------------
# 4. Save best model + supporting objects for explainability phase
# ---------------------------------------------------------------
best_model_name = results_df.iloc[0]["model"]
best_pipeline = fitted_pipelines[best_model_name]
print(f"\nBest model: {best_model_name}")

joblib.dump(best_pipeline, f"{MODEL_DIR}/best_pipeline.joblib")
joblib.dump(le, f"{MODEL_DIR}/label_encoder.joblib")
X_train.to_csv(f"{MODEL_DIR}/X_train.csv", index=False)
X_test.to_csv(f"{MODEL_DIR}/X_test.csv", index=False)
np.save(f"{MODEL_DIR}/y_train.npy", y_train)
np.save(f"{MODEL_DIR}/y_test.npy", y_test)

with open(f"{MODEL_DIR}/best_model_name.json", "w") as f:
    json.dump({"best_model_name": best_model_name,
               "categorical": CATEGORICAL, "numeric": NUMERIC}, f)

print("Saved best pipeline, encoders, and train/test splits for SHAP/LIME phase.")
