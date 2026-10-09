# How to Reproduce This Project

## 1. Requirements
```
pip install pandas numpy scikit-learn xgboost shap lime matplotlib seaborn joblib --break-system-packages
```

## 2. Folder you need
Put the raw OULAD CSVs (from the Kaggle/anonymisedData zip) in a `data/` folder next to these scripts:
`studentInfo.csv, courses.csv, assessments.csv, studentRegistration.csv, studentVle.csv, vle.csv, studentAssessment.csv`

## 3. Run in order
```bash
python3 01_prepare_data.py        # merges tables, builds early_features.csv (~2-3 min, streams the 433MB studentVle.csv)
python3 02_eda.py                 # figures 1-6 + eda_summary.txt
python3 03_modeling.py            # trains/tunes 5 models, figures 7-9, saves best_pipeline.joblib (~5-8 min)
python3 04_explainability.py      # SHAP + LIME, figures 10-11 (~1-2 min)
node    build_report.js           # assembles everything into the Word report (needs `docx` npm package)
```

## 4. What each script does
| Script | Output |
|---|---|
| `01_prepare_data.py` | `data/early_features.csv` — one row per student-module, 26 features, using only day ≤ 28 information |
| `02_eda.py` | `figures/01-06_*.png`, `outputs/eda_summary.txt` |
| `03_modeling.py` | `figures/07_model_comparison.png`, `figures/cm_*.png`, `outputs/model_comparison.csv`, `outputs/models/best_pipeline.joblib` |
| `04_explainability.py` | `figures/08-11_*.png`, `outputs/shap_feature_importance.csv`, `outputs/shap_local_explanations.json`, `outputs/lime_local_explanation.json` |
| `build_report.js` | `outputs/Student_Performance_Report.docx` |

## 5. Key tunable parameter
`EARLY_CUTOFF_DAYS = 28` at the top of `01_prepare_data.py` — change this and re-run everything
to test a different early-warning lead time (e.g. 14 days for a faster but noisier signal).

## 6. Known limitations baked into the code (documented in the report, §6.3)
- SVM is trained/tuned on a 4,000-row stratified subsample of the training data (RBF-kernel SVM
  does not scale to the full ~22k rows in reasonable time), but evaluated on the full test set.
- SHAP explanations use XGBoost, not the (marginally better by macro-F1) Random Forest, because
  sklearn's Random Forest TreeExplainer is too slow to compute exactly for a 4-class problem here.
