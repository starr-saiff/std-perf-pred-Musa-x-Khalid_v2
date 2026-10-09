# Research Roadmap: Explainable Early Prediction of Student Academic Performance

**Working title:** An Explainable Machine Learning Framework for Early Prediction of Student Academic Performance
**Dataset chosen:** OULAD (Open University Learning Analytics Dataset)
**Fallback dataset:** xAPI-Edu-Data (use only if OULAD proves infeasible on time/compute — see Phase 1)
**Status legend:** ⬜ Not started · 🟨 In progress · ✅ Done · ⛔ Blocked
**Overall status: ✅ Project complete (Phases 0–6) — see Student_Performance_Report.docx**

Update the status boxes as we go so we always know where we are.

---

## Phase 0 — Framing (Week 0)
- ✅ Finalize research question: *"Which ML model best predicts student risk using only early-course data, and which factors drive that prediction?"*
- ✅ Decide the "early" cutoff (e.g., predict using only data available by week 4 of a ~30-week module)
- ✅ Define target variable: binary (Pass/Distinction vs Fail/Withdrawn) or full 4-class
- ✅ Write a 1-paragraph research gap statement (already drafted below — refine after lit search)
- ✅ Do a quick lit search (5–10 papers) confirming the OULAD + explainability angle isn't already saturated

**Draft gap statement (original):** *Most OULAD prediction studies report end-of-course accuracy without an explicit early-warning cutoff, and few pair strong tabular models with instance-level explanations (SHAP/LIME) that instructors could act on mid-course.*

**Revised gap statement (after 10-paper Scholar search, Sept 2026):** *Recent work has begun pairing strong tabular models with SHAP/LIME explanations on student-performance data (Mustofa et al. 2024; Almazroei 2026; Islam et al. 2025), including on OULAD itself. However, these studies use "early" loosely — relying on cumulative or end-of-semester features — rather than enforcing an explicit, fixed information cutoff that guarantees the prediction is available early enough for intervention. Separately, studies that do define a genuine early cutoff (Alalawi et al. 2024; Lee et al. 2025; Hung et al. 2025) do not use SHAP/LIME. No study combines an OULAD-scale dataset, a rigorously enforced day-N cutoff, and cross-validated SHAP+LIME explanation.*

**Closest competitor:** Almazroei, E.E. (2026). "Ensemble machine learning framework with SHAP and LIME for accurate early prediction of student success in online learning environments." *Scientific Reports* 16, 19506. Uses OULAD, XGBoost/RF/LR/MLP + Bagging, SHAP+LIME — but no fixed-day cutoff (uses cumulative/full-course features like total_weighted_score and unregistration date). **Must be cited and explicitly differentiated in Related Work.**

**10-paper literature table:** see chat log / project notes for full table (dataset, explainability method, early-cutoff status, and stated gap for each paper).

---

## Phase 1 — Data Understanding & Preparation (Week 1)
- ✅ Load all 7 tables: `studentInfo`, `courses`, `assessments`, `studentAssessment`, `studentRegistration`, `studentVle`, `vle`
- ✅ Decide on module scope (all modules, or 1–2 modules to keep it tractable first)
- ✅ Handle `studentVle.csv` size (453MB) — filter/aggregate early, don't load fully into memory repeatedly
- ✅ Merge tables on `id_student` + `code_module` + `code_presentation`
- ✅ Handle missing values (`imd_band` ~3.4% missing)
- ✅ Decide how to treat "Withdrawn" (own class? merge into Fail? exclude?)
- ⛔ **Fallback checkpoint:** if merging/engineering the OULAD tables is too heavy for the timeline, switch to xAPI-Edu-Data and skip to Phase 3 with a much simpler feature set

---

## Phase 2 — Feature Engineering (Week 1–2)
- ✅ Static/demographic features: gender, region, highest_education, imd_band, age_band, disability, num_of_prev_attempts, studied_credits
- ✅ Registration features: date registered relative to course start
- ✅ Early engagement features from `studentVle` (clicks per site type, total clicks, active days) **restricted to the chosen early-cutoff window**
- ✅ Early assessment features from `studentAssessment`/`assessments` (only assessments due before the cutoff)
- ✅ Build final feature matrix + target column
- ✅ Train/test split (stratified by target); consider splitting by module/presentation to test generalization

---

## Phase 3 — Exploratory Data Analysis (Week 2)
- ✅ Class balance check, demographic distributions
- ✅ Correlation / mutual information between features and target
- ✅ Visualize engagement patterns by outcome (e.g., clicks over time by Pass/Fail)
- ✅ Document interesting patterns to cross-check later against SHAP results

---

## Phase 4 — Modeling (Week 2–3)
- ✅ Baselines: Logistic Regression, Decision Tree
- ✅ Stronger models: Random Forest, Gradient Boosting (XGBoost/LightGBM), SVM
- ✅ Handle class imbalance (class weights or SMOTE) if needed
- ✅ Hyperparameter tuning (cross-validation)
- ✅ Evaluation metrics: Accuracy, F1 (macro, since classes imbalanced), ROC-AUC, confusion matrix
- ✅ Select best-performing model(s) to carry into explainability phase

---

## Phase 5 — Explainability (Week 3)
- ✅ Global SHAP feature importance for best model
- ✅ SHAP summary/beeswarm plot
- ✅ Local explanations (SHAP force plot / LIME) for a few individual "at-risk" students
- ✅ Compare SHAP explanations against Feature Importance from tree models — do they agree?
- ✅ Translate top features into actionable educator language (e.g., "low VLE activity in week 2–3 is the strongest early risk signal")

---

## Phase 6 — Synthesis & Writing (Week 4)
- ✅ Results section: model comparison table
- ✅ Explainability section: SHAP plots + interpretation
- ✅ Discussion: which factors matter, how educators could act, limitations (early-cutoff choice, single dataset, imd_band missingness)
- ✅ Related work section (fill in from Phase 0 lit search)
- ✅ Full draft assembled
- ✅ Internal review / revision pass

---

## Open Decisions Log
*(add dated entries here as we make choices, so we can trace why we did what we did)*

- **[date]** — decision — reasoning
- **2026-09-17** — Ran 10-paper Scholar-sourced literature check (Phase 0). Confirmed no existing OULAD study combines a strict fixed-day early cutoff with SHAP+LIME cross-validated explainability. Closest competitor identified: Almazroei 2026 (Nature Sci Rep) — same dataset, same XAI tools, but no fixed-day cutoff. Gap statement revised accordingly (see above). This paper must be cited and differentiated explicitly in the Related Work section, not just added to the reference list.
- **2026-09-17** — Related Work section of the existing draft report needs a revision pass to (a) cite the 9 resolved papers with real citations instead of the placeholder general paragraph, and (b) add the explicit differentiation from Almazroei 2026.
- **2026-09-18** — DONE. Rewrote Related Work into 5 sub-sections (2.1 OULAD prediction, 2.2 explainability on student data, 2.3 early-cutoff without explainability, 2.4 the wider XAI-in-LA landscape, 2.5 positioning) citing 7 real, verified papers with DOIs (Jin et al. 2024; Alalawi et al. 2025; Mustofa et al. 2024; Islam et al. 2025; Almazroei 2026; Chang et al. 2025; Hung et al. 2025). Added a new Discussion §6.4 "Positioning Relative to the Closest Prior Work" that proactively explains why this report's accuracy (~50%) is lower than Almazroei's (95%) — their features are cumulative/full-course, ours are strictly day-28-cutoff, so the tasks are not equivalent in difficulty. Full reference list updated with real DOIs. Report is now complete end-to-end (Phases 0–7).
- **2026-09-18** — Resolved the 10th (previously inaccessible) Tandfonline paper: Laakel Hemdanou et al. (2026), "Predicting and Interpreting Student Performance in Higher Education: A BOHB-Optimized DNN with Dual Explanation Framework Using SHAP and HFSF on OULAD" (Measurement: Interdisciplinary Research and Perspectives, DOI 10.1080/15366367.2026.2669152). Assessed against the gap statement: uses OULAD + SHAP, but (a) no early-day cutoff — full-course features, and (b) single explainability method (SHAP + their own custom HFSF scoring function) rather than two independent cross-validated methods (SHAP+LIME). Does NOT collapse the gap. Added to Related Work §2.2 and Introduction §1.1, and to the reference list. All 10 papers from the original Scholar search are now resolved and incorporated. Literature review is complete — no further Phase 0 action needed unless new papers surface closer to submission.
- **2026-09-26** — User independently re-ran the full pipeline (01–04) on their own Windows machine with a newer scikit-learn (1.9.1) than the original sandbox run. Results: XGBoost and SHAP/LIME outputs are pixel-identical to the original run (XGBoost's fit is fully deterministic given the fixed random seed), but Random Forest numbers shifted due to internal sklearn version differences: accuracy 0.472 (was 0.504), macro-F1 0.439 (was 0.431, actually *improved*), macro-AUC 0.732 (was 0.730). Ranking of all 5 models is unchanged (RandomForest still best macro-F1, XGBoost still best accuracy/AUC). Report fully rebuilt using the user's real figures and real numbers throughout: §4.2 results table, model-comparison chart, both confusion matrices, and the §6.4 positioning-vs-Almazroei accuracy range (now 39.1%–53.1%, was 50.4%–53.1%) are all updated. Discussion was also strengthened with a real, mechanistic explanation for the RF-vs-XGBoost trade-off: XGBoost's hyperparameter grid has no class-weighting mechanism (unlike the other four models), so its higher raw accuracy comes from defaulting to the majority "Pass" class (recall 0.83) at the cost of minority-class recall (Distinction recall only 0.17) — visible directly in the real confusion matrices. This is a stronger, more defensible narrative than the original "effectively tied" framing and should be treated as the canonical version of the report going forward. All numbers, tables, and figures are now traceable to an actual run on real hardware, not just the original sandbox run.

---

## Notes / Parking Lot
*(ideas, dataset quirks, things to revisit later)*
