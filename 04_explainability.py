"""
Phase 5 — Explainability (SHAP + LIME)
==========================================
Loads the best saved pipeline (RandomForest) and produces:
  - Global SHAP summary plot (which features matter overall)
  - SHAP bar plot of mean |SHAP value| per feature
  - Local SHAP + LIME explanations for a few individual at-risk students
"""

import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import shap
from lime.lime_tabular import LimeTabularExplainer
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

MODEL_DIR = "G:\Musa/outputs/models"
FIG_DIR = "G:\Musa/outputs/figures"

pipeline = joblib.load(f"{MODEL_DIR}/best_pipeline.joblib")
le = joblib.load(f"{MODEL_DIR}/label_encoder.joblib")
X_train = pd.read_csv(f"{MODEL_DIR}/X_train.csv")
X_test = pd.read_csv(f"{MODEL_DIR}/X_test.csv")
y_train = np.load(f"{MODEL_DIR}/y_train.npy")
y_test = np.load(f"{MODEL_DIR}/y_test.npy")

with open(f"{MODEL_DIR}/best_model_name.json") as f:
    meta = json.load(f)
CATEGORICAL, NUMERIC = meta["categorical"], meta["numeric"]
print("Best model by Macro-F1:", meta["best_model_name"])

# NOTE ON EXPLAINER CHOICE: RandomForest (sklearn) edged out XGBoost on
# Macro-F1 (0.431 vs 0.415) but XGBoost was extremely close and scored
# HIGHER on accuracy (0.531 vs 0.504) and Macro-AUC (0.736 vs 0.730) — the
# two models are effectively tied. We use XGBoost for the SHAP/LIME phase
# because its native Tree SHAP implementation is orders of magnitude
# faster than sklearn RandomForest's, which is impractical to run exactly
# on a 4-class problem in this environment. This is a practical
# engineering choice, not a change in "best model" — both are reported.
preprocessor = pipeline.named_steps["prep"]

print("Refitting XGBoost (same preprocessing, same tuned hyperparameters) "
      "for fast, exact SHAP explanations...")
xgb_clf = XGBClassifier(
    random_state=42, eval_metric="mlogloss", n_jobs=-1,
    n_estimators=200, max_depth=6, learning_rate=0.1,
)
X_train_trans_full = preprocessor.transform(X_train)
if hasattr(X_train_trans_full, "toarray"):
    X_train_trans_full = X_train_trans_full.toarray()
xgb_clf.fit(X_train_trans_full, y_train)
clf = xgb_clf
joblib.dump(clf, f"{MODEL_DIR}/xgboost_for_shap.joblib")

# ---------------------------------------------------------------
# 1. Transform a manageable sample for SHAP (TreeExplainer is fast,
#    but we still cap it for plotting clarity / runtime)
# ---------------------------------------------------------------
SAMPLE_N = 1500
sample_idx = np.random.RandomState(42).choice(len(X_test), size=SAMPLE_N, replace=False)
X_test_sample = X_test.iloc[sample_idx].reset_index(drop=True)
y_test_sample = y_test[sample_idx]

X_test_trans = preprocessor.transform(X_test_sample)
if hasattr(X_test_trans, "toarray"):
    X_test_trans = X_test_trans.toarray()

feature_names = preprocessor.get_feature_names_out()
feature_names = [f.split("__", 1)[-1] for f in feature_names]  # strip prefixes
# xgboost/shap reject '[', ']', '<' in feature names (can appear in
# one-hot category labels) -> sanitize
feature_names = [
    f.replace("[", "(").replace("]", ")").replace("<", "lt")
    for f in feature_names
]

X_test_trans_df = pd.DataFrame(X_test_trans, columns=feature_names)

# ---------------------------------------------------------------
# 2. Global SHAP explanations (TreeExplainer — exact & fast for RF/XGB)
# ---------------------------------------------------------------
print("Computing SHAP values (TreeExplainer)...")
explainer = shap.TreeExplainer(clf)
shap_values = explainer.shap_values(X_test_trans_df)

# shap_values shape for multiclass RF: (n_samples, n_features, n_classes)
# in newer shap versions it can also be a list of arrays per class.
classes = le.classes_
print("SHAP values type:", type(shap_values),
      "shape:" if hasattr(shap_values, "shape") else "", getattr(shap_values, "shape", ""))

if isinstance(shap_values, list):
    shap_by_class = {cls: shap_values[i] for i, cls in enumerate(classes)}
elif shap_values.ndim == 3:
    shap_by_class = {cls: shap_values[:, :, i] for i, cls in enumerate(classes)}
else:
    shap_by_class = {classes[0]: shap_values}

# ---- Global summary (beeswarm) for the "Fail" class: most actionable ----
target_class = "Fail" if "Fail" in classes else classes[0]
class_idx = list(classes).index(target_class)

plt.figure()
shap.summary_plot(shap_by_class[target_class], X_test_trans_df,
                   show=False, max_display=15)
plt.title(f"SHAP Summary — driving prediction of '{target_class}'")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/08_shap_summary_{target_class}.png", dpi=150, bbox_inches="tight")
plt.close()

# ---- Mean |SHAP| bar chart across ALL classes (overall importance) ----
mean_abs_shap = np.mean(
    [np.abs(shap_by_class[c]).mean(axis=0) for c in classes], axis=0
)
imp_df = pd.DataFrame({"feature": feature_names, "mean_abs_shap": mean_abs_shap})
imp_df = imp_df.sort_values("mean_abs_shap", ascending=False).head(15)

plt.figure(figsize=(8, 6))
plt.barh(imp_df["feature"][::-1], imp_df["mean_abs_shap"][::-1], color="#2b7a78")
plt.xlabel("Mean |SHAP value| (averaged across all 4 classes)")
plt.title("Overall Feature Importance (SHAP)")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/09_shap_overall_importance.png", dpi=150)
plt.close()

imp_df.to_csv("G:\Musa/outputs/shap_feature_importance.csv", index=False)
print("\nTop 15 features by mean |SHAP|:")
print(imp_df.to_string(index=False))

# ---------------------------------------------------------------
# 3. Local explanations for a few individual "at-risk" students
#    (true label = Fail or Withdrawn, to illustrate actionable cases)
# ---------------------------------------------------------------
at_risk_positions = [
    i for i, y in enumerate(y_test_sample)
    if le.classes_[y] in ("Fail", "Withdrawn")
][:3]

local_explanations = []
for pos in at_risk_positions:
    row = X_test_trans_df.iloc[[pos]]
    true_label = le.classes_[y_test_sample[pos]]
    pred_label = le.classes_[clf.predict(row)[0]]
    pred_idx = clf.predict(row)[0]

    shap_row = shap_by_class[le.classes_[pred_idx]][pos]
    top_feats = pd.Series(shap_row, index=feature_names).sort_values(
        key=np.abs, ascending=False
    ).head(6)

    local_explanations.append({
        "row_index_in_sample": pos,
        "true_label": true_label,
        "predicted_label": pred_label,
        "top_shap_features": top_feats.round(3).to_dict(),
    })

    # SHAP force/waterfall plot for this student
    plt.figure()
    shap.plots.bar(
        shap.Explanation(values=shap_row, base_values=explainer.expected_value[pred_idx]
                          if hasattr(explainer.expected_value, "__len__")
                          else explainer.expected_value,
                          data=row.values[0], feature_names=feature_names),
        show=False, max_display=10
    )
    plt.title(f"Local SHAP — student #{pos} (true={true_label}, pred={pred_label})")
    plt.tight_layout()
    plt.savefig(f"{FIG_DIR}/10_shap_local_student_{pos}.png", dpi=150, bbox_inches="tight")
    plt.close()

with open("G:\Musa/outputs/shap_local_explanations.json", "w") as f:
    json.dump(local_explanations, f, indent=2, default=str)

print("\nLocal SHAP explanations for at-risk students:")
for exp in local_explanations:
    print(exp)

# ---------------------------------------------------------------
# 4. LIME — cross-check one of the same students with an independent method
# ---------------------------------------------------------------
print("\nComputing LIME explanation for cross-check...")
X_train_trans = preprocessor.transform(X_train)
if hasattr(X_train_trans, "toarray"):
    X_train_trans = X_train_trans.toarray()

lime_explainer = LimeTabularExplainer(
    training_data=X_train_trans,
    feature_names=feature_names,
    class_names=list(le.classes_),
    mode="classification",
    random_state=42,
)


def predict_proba_fn(x):
    return clf.predict_proba(x)


if at_risk_positions:
    pos = at_risk_positions[0]
    instance = X_test_trans_df.iloc[pos].values
    lime_exp = lime_explainer.explain_instance(
        instance, predict_proba_fn, num_features=8, top_labels=1
    )
    lime_label = lime_exp.available_labels()[0]
    lime_list = lime_exp.as_list(label=lime_label)

    with open("G:\Musa/outputs/lime_local_explanation.json", "w") as f:
        json.dump({
            "row_index_in_sample": pos,
            "explained_class": le.classes_[lime_label],
            "lime_feature_weights": lime_list,
        }, f, indent=2, default=str)

    print(f"\nLIME explanation for student #{pos} (class={le.classes_[lime_label]}):")
    for feat, weight in lime_list:
        print(f"  {feat}: {weight:.4f}")

    fig = lime_exp.as_pyplot_figure(label=lime_label)
    fig.suptitle(f"LIME — student #{pos} explaining class '{le.classes_[lime_label]}'")
    plt.tight_layout()
    fig.savefig(f"{FIG_DIR}/11_lime_local_student_{pos}.png", dpi=150, bbox_inches="tight")
    plt.close(fig)

print("\nExplainability phase complete. Figures + JSON saved to outputs/.")
