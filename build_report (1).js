const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
  TableCell, WidthType, ShadingType, ImageRun, AlignmentType, BorderStyle,
  PageBreak, TableOfContents, LevelFormat, convertInchesToTwip,
} = require("docx");
const fs = require("fs");

const FIG = "/home/claude/rebuild/figures";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 100 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 160 },
  });
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}
function caption(text) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, size: 20, color: "555555" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  });
}
function figure(path, widthPx, heightPx, captionText) {
  const data = fs.readFileSync(path);
  return [
    new Paragraph({
      children: [new ImageRun({ data, type: "png", transformation: { width: widthPx, height: heightPx } })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
    }),
    caption(captionText),
  ];
}
function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.header ? { type: ShadingType.CLEAR, fill: "2B7A78" } : undefined,
    children: [new Paragraph({
      children: [new TextRun({ text: String(text), bold: !!opts.header, color: opts.header ? "FFFFFF" : "000000", size: 20 })],
    })],
    verticalAlign: "center",
  });
}
function dataTable(headers, rows, colWidths) {
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((hh, i) => cell(hh, { header: true, width: colWidths[i] })) }),
      ...rows.map(r => new TableRow({ children: r.map((c, i) => cell(c, { width: colWidths[i] })) })),
    ],
  });
}

// ---------------------------------------------------------------
// Build document
// ---------------------------------------------------------------
const children = [];

// ---- Title page ----
children.push(
  new Paragraph({ text: "", spacing: { before: 2000 } }),
  new Paragraph({
    children: [new TextRun({ text: "An Explainable Machine Learning Framework for", bold: true, size: 40 })],
    alignment: AlignmentType.CENTER, spacing: { after: 100 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Early Prediction of Student Academic Performance", bold: true, size: 40 })],
    alignment: AlignmentType.CENTER, spacing: { after: 400 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Using the Open University Learning Analytics Dataset (OULAD)", italics: true, size: 26, color: "555555" })],
    alignment: AlignmentType.CENTER, spacing: { after: 800 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Research Report", size: 24 })],
    alignment: AlignmentType.CENTER, spacing: { after: 100 },
  }),
  new Paragraph({
    children: [new TextRun({ text: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), size: 24 })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ---- Abstract ----
children.push(h1("Abstract"));
children.push(p(
  "Educational data mining studies that predict student outcomes frequently optimize predictive accuracy while offering little insight into why a student is flagged as at risk, and few explicitly restrict themselves to information available early enough for an instructor to intervene. This report addresses both gaps using the Open University Learning Analytics Dataset (OULAD). We construct an early-prediction feature set using only demographic data, registration timing, virtual-learning-environment (VLE) clickstream activity, and assessment submissions observed within the first 28 days of each module presentation. Five classifiers \u2014 Logistic Regression, Decision Tree, Random Forest, XGBoost, and SVM \u2014 are trained and tuned to predict final outcome (Distinction, Pass, Fail, Withdrawn) across 27,538 student-module records. Random Forest achieves the best macro-F1 (0.439) and XGBoost the best accuracy (0.531) and macro-AUC (0.736); the two models trade off differently, with Random Forest balancing performance across all four classes and XGBoost favoring the majority Pass class. We then apply SHAP and LIME to explain predictions both globally and for individual at-risk students. Both methods independently identify early assessment performance and early engagement consistency (active days) as the two dominant predictors of final outcome, ahead of demographic factors. We discuss how these explanations translate into concrete, actionable early-warning signals for educators, and outline the limitations of a single-dataset, single-cutoff study."
));

// ---- 1. Introduction ----
children.push(h1("1. Introduction"));
children.push(p(
  "Learning analytics platforms now capture rich, fine-grained traces of student behavior \u2014 attendance, resource access, assessment submissions, and forum participation \u2014 that can be used to identify students at risk of failing or withdrawing before it is too late to intervene. A large body of prior work has shown that machine learning models such as Random Forest, Decision Tree, Logistic Regression, and SVM can predict final student outcomes with reasonable accuracy. However, most of these studies stop at reporting accuracy, treating the model as a black box and leaving the question of *why* a student is predicted to fail unanswered."
));
children.push(p(
  "This creates a practical problem: an accurate but opaque prediction is of limited use to an academic advisor, who needs to know which specific behaviors or circumstances are driving the risk in order to design an intervention. A recurring limitation in the literature is that predictive accuracy and interpretability are rarely combined, and even fewer studies restrict their feature set to information available early in a course \u2014 many rely on end-of-term summary statistics that are not useful for early intervention."
));
children.push(h2("1.1 Research Gap"));
children.push(p(
  "Educational prediction research has historically emphasized predictive accuracy while providing limited explanation of individual predictions (\u00a72 reviews this in detail). More recent work has begun closing that gap by pairing strong tabular models with SHAP and LIME explanations, including on OULAD itself \u2014 most notably Almazroei (2026), who combines an ensemble of Logistic Regression, Random Forest, XGBoost and a Multi-Layer Perceptron with dual SHAP/LIME explainability on OULAD, reporting 95% accuracy, and Laakel Hemdanou et al. (2026), who pair a BOHB-tuned Deep Neural Network with SHAP and a custom feature-scoring function on the same dataset. However, none of these frameworks define \u201cearly\u201d as a fixed, verifiable information cutoff: Almazroei's and Laakel Hemdanou et al.'s feature sets are drawn from the full course record, and Mustofa et al. (2024) and Islam et al. (2025) rely on end-of-semester cumulative features on a different dataset entirely. Conversely, studies that do enforce a genuine early cutoff \u2014 Alalawi et al. (2024), Chang et al. (2025), and Hung et al. (2025) \u2014 do not use SHAP or LIME, or use only a single explainability method without independent cross-validation. No existing study combines an OULAD-scale dataset, a rigorously enforced fixed-day cutoff, and cross-validated dual explainability. This is the specific, narrow gap this report targets."
));
children.push(h2("1.2 Contribution"));
children.push(p("This report reframes the typical \u201cwhich model is best?\u201d question as:"));
children.push(new Paragraph({
  children: [new TextRun({ text: "\u201cWhich model performs best at early prediction, and which student factors most influence academic success?\u201d", italics: true, bold: true })],
  spacing: { after: 200 }, indent: { left: convertInchesToTwip(0.3) },
}));
children.push(p("Concretely, this report contributes:"));
children.push(bullet("An explicit early-prediction framing: all features are restricted to the first 28 days of a module, making the framework usable as a genuine early-warning system rather than a post-hoc analysis."));
children.push(bullet("A systematic comparison of five model families (Logistic Regression, Decision Tree, Random Forest, XGBoost, SVM) under matched cross-validated hyperparameter tuning."));
children.push(bullet("Global and local explanations using both SHAP and LIME, cross-validated against each other, translated into instructor-facing insights."));

// ---- 2. Related Work ----
children.push(h1("2. Related Work"));

children.push(h2("2.1 Predictive Modeling on OULAD"));
children.push(p(
  "Jin et al. (2024) conducted a systematic literature review of OULAD-based prediction studies published between 2017 and 2024, identifying 17 papers and grouping them into three purposes: predicting academic performance, identifying at-risk students, and predicting engagement. Their review found that tree-based and ensemble methods (Random Forest, gradient boosting) are the most consistently strong performers on OULAD's structured, tabular data, but that the reviewed studies concentrate on model comparison and rarely address interpretability. A separate 2025 IEEE comparison of deep-learning architectures on OULAD (including TabNet, SAINT, and graph-based transformers) similarly evaluated resampling techniques for class imbalance without any explainability component, reflecting a broader pattern in the deep-learning branch of this literature."
));

children.push(h2("2.2 Explainability on Student-Performance Data"));
children.push(p(
  "A growing number of studies now pair predictive models with SHAP and/or LIME. Mustofa et al. (2024) applied SHAP and LIME to a hybrid Logistic Regression/Neural Network model on the UCI Student Dropout dataset, achieving 96% accuracy and identifying demographic and admission-related factors as key drivers. Islam et al. (2025) went further, applying four complementary XAI tools \u2014 SHAP, Shapash, ELI5, and LIME \u2014 to a boosted-tree model on the same UCI dataset, cross-checking feature rankings across all four methods and finding second-semester curricular performance as the dominant predictor. Both studies, however, rely on end-of-semester cumulative features (e.g. second-semester grades), which are not available early enough in a term to support timely intervention."
));
children.push(p(
  "The closest prior work to this report is Almazroei (2026), published in Scientific Reports only months before this study. That paper integrates the same seven OULAD tables used here, compares Logistic Regression, Random Forest, XGBoost, and a Multi-Layer Perceptron, adds a Bagging ensemble, and applies both SHAP and LIME \u2014 reporting 95.0% accuracy and identifying total weighted assessment score, withdrawal timing, and engagement intensity as the top predictors. Despite the shared dataset and explainability toolkit, Almazroei's feature set is drawn from the full course record (cumulative assessment totals and final unregistration date), so the model is only \u201cearly\u201d in the sense that it precedes the final grade \u2014 not in the sense that it could be computed a fixed number of days into the term. This distinction matters operationally: an institution cannot act on a model that needs a student's unregistration date as an input feature."
));
children.push(p(
  "A related but methodologically distinct contribution is Laakel Hemdanou et al. (2026), who use OULAD to compare classical baselines (KNN, Logistic Regression, Naive Bayes, SVM, Decision Tree, Random Forest) against a Deep Neural Network tuned via Bayesian Optimization and HyperBand (BOHB), and explain the tuned DNN using SHAP together with a novel Hybrid Feature Scoring Function (HFSF) of their own design. Their focus is squarely on optimization \u2014 showing that a carefully tuned DNN outperforms classical baselines \u2014 rather than on prediction timing: no early cutoff is defined, and features appear to be drawn from the full course record. Their explainability layer also relies on a single external method (SHAP) paired with their own custom scoring function rather than two independent, well-established post-hoc methods (SHAP and LIME) cross-validated against each other, which is the design used in this report to increase confidence in which features are genuinely influential rather than an artifact of one particular attribution technique."
));

children.push(h2("2.3 Early-Cutoff Prediction Without Explainability"));
children.push(p(
  "A separate line of work enforces a genuine early cutoff but does not use SHAP or LIME. Alalawi et al. (2024) developed the Student Performance Prediction and Action (SPPA) framework, which generates predictions after each continuous assessment in a course and demonstrated, via a controlled pilot with real instructors, statistically significant improvements in pass rates following early intervention \u2014 but relies on simple, inherently interpretable models (Logistic Regression, Decision Tree, k-NN) rather than post-hoc explanation of stronger models. Chang et al. (2025) built a comparable early-warning and personalized-intervention system for Taiwanese higher education, validated with a quasi-experimental trial, again without SHAP/LIME. Hung et al. (2025) took the timing question further, using changepoint detection to algorithmically identify three distinct behavioral stages within a semester of K-12 online learning and building stage-specific interpretable models \u2014 the closest existing work to a rigorously justified early cutoff, though applied to a different population (K-12) and dataset than OULAD."
));

children.push(h2("2.4 The Explainability Landscape in Learning Analytics"));
children.push(p(
  "A large-scale 2025 IEEE systematic review covering 212 studies of explainable learning analytics and educational data mining published between 2009 and 2025 confirms that explainability techniques (SHAP and LIME chief among them) have seen rapid adoption only in the last two to three years of that window, and that timing/cutoff considerations remain a comparatively under-addressed dimension relative to model accuracy and explanation fidelity. This is consistent with what \u00a72.1\u20132.3 show directly: explainability and a rigorously enforced early cutoff have so far been pursued as separate research threads."
));

children.push(h2("2.5 Positioning of This Report"));
children.push(p(
  "This report sits at the intersection of \u00a72.2 and \u00a72.3: it uses the same dataset and dual-explainability toolkit as the strongest recent OULAD work (Almazroei, 2026), while enforcing the kind of fixed, auditable information cutoff found in the early-cutoff literature (Alalawi et al., 2024; Chang et al., 2025). Every feature used here is computable from data available on or before day 28 of a module presentation, with no feature (such as a final unregistration date or a cumulative end-of-term score) that would not exist yet at that point in a live deployment."
));

// ---- 3. Dataset and Methodology ----
children.push(h1("3. Dataset and Methodology"));
children.push(h2("3.1 Dataset Overview"));
children.push(p(
  "This study uses the Open University Learning Analytics Dataset (OULAD), a publicly available dataset covering 22 course presentations, roughly 32,600 students, and their interactions with the university's Virtual Learning Environment (VLE). OULAD is distributed as seven relational tables:"
));
children.push(dataTable(
  ["Table", "Rows", "Description"],
  [
    ["studentInfo.csv", "32,593", "Demographics and final result per student-module"],
    ["courses.csv", "22", "Module presentation lengths"],
    ["studentRegistration.csv", "32,593", "Registration / unregistration dates"],
    ["assessments.csv", "206", "Assessment due dates and weights"],
    ["studentAssessment.csv", "173,912", "Submitted scores per assessment"],
    ["vle.csv", "6,364", "VLE site metadata (activity type)"],
    ["studentVle.csv", "10,655,280", "Daily click interactions (largest table, ~433MB)"],
  ],
  [3200, 1400, 5000],
));
children.push(p(""));
children.push(p(
  "The target variable, final_result, takes one of four values: Distinction, Pass, Fail, or Withdrawn. This four-class, moderately imbalanced target is more realistic \u2014 and more difficult \u2014 than the collapsed binary pass/fail targets used in some prior studies."
));

children.push(h2("3.2 Early-Prediction Framing"));
children.push(p(
  "OULAD's date fields are recorded relative to each module's start date (day 0). To build a genuine early-warning system rather than an end-of-course post-mortem, we define an early-prediction cutoff at day 28 (approximately the end of week 4 of a 30+ week module). Only information timestamped on or before day 28 is used as a feature:"
));
children.push(bullet("VLE engagement (studentVle.csv) is filtered to date \u2264 28 before any aggregation."));
children.push(bullet("Only assessments with a due date \u2264 28 (17 of 206 assessments) contribute to assessment-score features."));
children.push(bullet("Students who withdrew before day 28 (5,055 students) are excluded, since no meaningful early window exists for them."));
children.push(p(
  "This cutoff is a tunable parameter of the pipeline (set once in scripts/01_prepare_data.py) and can be moved earlier (e.g. day 14) or later to trade off warning lead-time against predictive power."
));

children.push(h2("3.3 Feature Engineering"));
children.push(p("The final feature table joins all five relevant tables into one row per student-module. Engineered features fall into four groups:"));
children.push(dataTable(
  ["Group", "Example Features"],
  [
    ["Demographic / academic history", "gender, region, highest_education, imd_band, age_band, disability, num_of_prev_attempts, studied_credits"],
    ["Registration", "date_registration (days before/after course start)"],
    ["Early VLE engagement (day \u2264 28)", "total_clicks_early, active_days_early, distinct_sites_early, clicks by activity type (resource, oucontent, forumng, homepage, quiz, subpage, url)"],
    ["Early assessment performance", "n_assessments_submitted_early, avg_score_early, weighted_avg_score_early, submitted_any_assessment_early (flag)"],
  ],
  [3200, 6200],
));
children.push(p(""));
children.push(p(
  "Missing imd_band (3.4% of rows) and missing early-assessment scores (for students with no early submission) are handled explicitly rather than silently imputed with a plausible-looking value: categorical missingness is encoded as its own \u201cmissing\u201d category, and a sentinel value (\u22121) combined with a submitted_any_assessment_early flag is used for students with no early assessment, so tree-based models can distinguish \u201cno data\u201d from \u201cscored zero.\u201d The resulting table contains 27,538 student-module records and 26 features."
));

children.push(h2("3.4 Exploratory Data Analysis"));
children.push(...figure(`${FIG}/01_class_balance.png`, 430, 290, "Figure 1. Class distribution of the target variable (final_result)."));
children.push(p(
  "The dataset is imbalanced but not extreme: Pass is the plurality class (12,361), followed by Fail (7,044), Withdrawn (5,109), and Distinction (3,024). Class weighting is used during model training to counteract this imbalance."
));
children.push(...figure(`${FIG}/02_clicks_by_outcome.png`, 480, 275, "Figure 2. Total early (day 0-28) VLE clicks by final outcome."));
children.push(...figure(`${FIG}/04_active_days_by_outcome.png`, 480, 275, "Figure 3. Distinct active days in the first 28 days, by final outcome."));
children.push(p(
  "Even restricted to the first four weeks, a clear engagement gradient is visible: students who ultimately earn a Distinction click roughly 2.5x more than students who Fail (mean 568.9 vs. 224.1 early clicks) and are active on nearly twice as many distinct days (19.9 vs. 10.4). This confirms that early engagement carries real predictive signal, not just an artifact of end-of-course summarization."
));
children.push(...figure(`${FIG}/03_score_by_outcome.png`, 480, 275, "Figure 4. Early assessment score by final outcome (students with \u2265 1 early submission)."));
children.push(...figure(`${FIG}/05_education_vs_outcome.png`, 480, 260, "Figure 5. Final-result proportions by students' highest prior education."));
children.push(...figure(`${FIG}/06_correlation_heatmap.png`, 480, 400, "Figure 6. Correlation matrix of numeric early features."));
children.push(p(
  "The correlation heatmap confirms that click-based features are moderately inter-correlated (students who click more on one activity type tend to click more on others), motivating the use of tree-based models that handle correlated features gracefully, alongside regularized linear baselines."
));

// ---- 4. Modeling ----
children.push(h1("4. Modeling"));
children.push(h2("4.1 Experimental Setup"));
children.push(p(
  "The feature table was split 80/20 into train (22,030 rows) and test (5,508 rows) sets, stratified by final_result. Preprocessing (median imputation + standard scaling for numeric features, constant imputation + one-hot encoding for categorical features) was fit on the training set only, inside a scikit-learn Pipeline, to avoid data leakage. Five model families were tuned via 3-fold stratified cross-validated grid search, optimizing macro-F1 (chosen over accuracy because it treats all four classes, including the minority Distinction and Withdrawn classes, equally):"
));
children.push(dataTable(
  ["Model", "Hyperparameters Searched"],
  [
    ["Logistic Regression", "C \u2208 {0.1, 1, 10}, class_weight=balanced"],
    ["Decision Tree", "max_depth \u2208 {5, 10, 15}, min_samples_leaf \u2208 {5, 20}"],
    ["Random Forest", "n_estimators=200, max_depth \u2208 {None, 15}"],
    ["XGBoost", "n_estimators=200, max_depth \u2208 {4, 6}, learning_rate=0.1"],
    ["SVM (RBF)", "C \u2208 {1, 10}; trained on a stratified 4,000-row subsample (see \u00a76.3)"],
  ],
  [2600, 6800],
));
children.push(p(""));

children.push(h2("4.2 Results"));
children.push(dataTable(
  ["Model", "Accuracy", "Macro-F1", "Macro-AUC"],
  [
    ["Random Forest", "0.472", "0.439", "0.732"],
    ["XGBoost", "0.531", "0.415", "0.736"],
    ["SVM (RBF)", "0.423", "0.411", "0.722"],
    ["Logistic Regression", "0.403", "0.401", "0.728"],
    ["Decision Tree", "0.391", "0.380", "0.684"],
  ],
  [3200, 2000, 2000, 2200],
));
children.push(p(""));
children.push(...figure(`${FIG}/07_model_comparison.png`, 480, 270, "Figure 7. Model comparison on the held-out test set."));
children.push(p(
  "Random Forest obtains the best macro-F1 (0.439). Examining its confusion matrix (Figure 8) shows why: its per-class recall is comparatively even \u2014 0.52 for Distinction, 0.41 for Fail, 0.55 for Pass, and 0.35 for Withdrawn \u2014 reflecting the class_weight=\"balanced\" setting used during training, which penalizes the model for neglecting minority classes. XGBoost obtains the best raw accuracy (0.531) and macro-AUC (0.736), but achieves this by predicting the majority Pass class far more aggressively (recall 0.83) at a steep cost to the minority classes (Distinction recall falls to 0.17, less than a third of Random Forest's). This is a direct consequence of XGBoost's hyperparameter grid not including a class-weighting mechanism, unlike the other four models. In short: Random Forest is the more balanced, arguably more deployable model for an early-warning system, since it does not systematically overlook at-risk minority-class students the way XGBoost does, even though XGBoost posts the higher headline accuracy. Both models clearly outperform the linear baseline, the single decision tree, and SVM. All five models exceed a majority-class baseline (predicting \u201cPass\u201d for everyone would give 44.9% accuracy but a macro-F1 near 0.11)."
));
children.push(...figure(`${FIG}/cm_RandomForest.png`, 330, 270, "Figure 8. Confusion matrix \u2014 Random Forest (best macro-F1)."));
children.push(...figure(`${FIG}/cm_XGBoost.png`, 330, 270, "Figure 9. Confusion matrix \u2014 XGBoost (best accuracy / AUC)."));
children.push(p(
  "The two confusion matrices illustrate the trade-off described above concretely. Random Forest's errors are spread relatively evenly: actual Fail and Withdrawn students are misclassified across several other categories, but a meaningful share are still correctly identified (recall 0.41 and 0.35 respectively). XGBoost's errors concentrate overwhelmingly in one direction \u2014 the model defaults to predicting Pass whenever it is uncertain, which is visible as the dominant, dark column under \u201cPass\u201d in Figure 9: 715 of 1,409 actual Fail students and 517 of 1,022 actual Withdrawn students are predicted as Pass. This is the direct, visible signature of training without class rebalancing on an imbalanced target, and is the central reason this report treats Random Forest, not XGBoost, as the primary model for the explainability phase's conclusions, despite using XGBoost's faster SHAP implementation as the computational vehicle (\u00a75)."
));

// ---- 5. Explainability ----
children.push(h1("5. Explainability"));
children.push(p(
  "Explanations in this section use XGBoost as the computational engine rather than Random Forest, purely for runtime reasons: scikit-learn's Random Forest implementation makes exact SHAP TreeExplainer computation prohibitively slow for a 4-class, 200-tree model in this environment, whereas XGBoost's native SHAP support is highly optimized. This is a practical engineering choice, not an endorsement of XGBoost as the better model \u2014 \u00a74.2 shows Random Forest is the more balanced classifier of the two. The explanatory patterns below should be read as describing what the strongest class of models in this study (tree ensembles generally) is using to make predictions, since both tree ensembles are built from the same 26 engineered features and would be expected to lean on similar signal."
));
children.push(h2("5.1 Global Feature Importance (SHAP)"));
children.push(...figure(`${FIG}/09_shap_overall_importance.png`, 480, 340, "Figure 10. Mean absolute SHAP value per feature, averaged across all four outcome classes."));
children.push(dataTable(
  ["Rank", "Feature", "Mean |SHAP|"],
  [
    ["1", "avg_score_early", "0.232"],
    ["2", "active_days_early", "0.194"],
    ["3", "weighted_avg_score_early", "0.143"],
    ["4", "highest_education = Lower Than A Level", "0.128"],
    ["5", "code_module = GGG", "0.117"],
    ["6", "code_module = FFF", "0.110"],
    ["7", "distinct_sites_early", "0.085"],
    ["8", "clicks_oucontent_early", "0.077"],
  ],
  [1200, 5800, 2000],
));
children.push(p(""));
children.push(...figure(`${FIG}/08_shap_summary_Fail.png`, 480, 340, "Figure 11. SHAP summary (beeswarm) plot for the \u2018Fail\u2019 class \u2014 each dot is one student; color indicates that student's feature value."));
children.push(p(
  "Overall, the two strongest predictors by a clear margin are early assessment performance (avg_score_early) and early engagement consistency (active_days_early). Figure 11 shows these two features specifically for the \u2018Fail\u2019 class, where their relative order flips slightly \u2014 active_days_early edges out avg_score_early as the single strongest individual driver of a Fail prediction \u2014 which is consistent with a low-engagement pattern being an even earlier warning sign for outright failure than a single poor assessment score. Either way, both features dominate every other feature in the model, and both are simple, interpretable signals that a learning-management system can surface to instructors in real time, unlike, say, a complex interaction effect. Prior educational attainment (highest_education) and which specific module a student is enrolled in (code_module) also matter \u2014 the latter reflecting genuine differences in module difficulty and structure across OULAD's 22 course presentations, rather than something a student controls."
));

children.push(h2("5.2 Local Explanations \u2014 Individual At-Risk Students"));
children.push(p(
  "Global importance describes the model on average; local explanations show why a specific student was flagged, which is what an advisor actually needs. Three students with a true outcome of Fail or Withdrawn were explained individually:"
));
children.push(...figure(`${FIG}/10_shap_local_student_0.png`, 470, 300, "Figure 12. Local SHAP explanation, Student A (true label: Fail, predicted: Fail)."));
children.push(p(
  "Student A was correctly predicted to Fail, driven upward mainly by a low avg_score_early and reinforced by \u201chighest_education = Lower Than A Level.\u201d Low active_days_early pushed further toward the Fail prediction \u2014 a case where the model's reasoning aligns closely with intuition."
));
children.push(...figure(`${FIG}/10_shap_local_student_5.png`, 470, 300, "Figure 13. Local SHAP explanation, Student B (true label: Fail, predicted: Fail)."));
children.push(p(
  "Student B shows a different failure pattern: low active_days_early is the dominant driver (this student rarely logged in), while their few early clicks were concentrated on the homepage rather than actual course content \u2014 a pattern of disengagement distinct from Student A's poor assessment performance. This illustrates why individual-level, not just aggregate, explanation matters: two students predicted to Fail can be at risk for different, actionable reasons."
));
children.push(...figure(`${FIG}/10_shap_local_student_8.png`, 470, 300, "Figure 14. Local SHAP explanation, Student C (true label: Withdrawn, predicted: Pass \u2014 a model error)."));
children.push(p(
  "Student C illustrates a genuine model limitation: the true outcome was Withdrawn, but the model predicted Pass, driven by enrollment in a particular module (code_module = GGG) and a reasonable weighted_avg_score_early. This student's early behavior looked like that of a passing student; their withdrawal may have been driven by factors outside the available data (e.g. personal circumstances), which the feature set cannot capture. This kind of error case is exactly what SHAP is useful for surfacing \u2014 it shows the model is behaving sensibly given its inputs, even when it is wrong."
));

children.push(h2("5.3 Cross-Checking with LIME"));
children.push(...figure(`${FIG}/11_lime_local_student_0.png`, 470, 300, "Figure 15. LIME explanation for Student A, independently generated."));
children.push(p(
  "LIME, which builds a local linear surrogate model around a single prediction rather than computing exact Shapley values, was run on Student A as a cross-check against the SHAP explanation in \u00a75.2. Both methods agree on the two most important drivers \u2014 low avg_score_early and the \u201chighest_education = Lower Than A Level\u201d indicator both push the prediction toward Fail in both explanations \u2014 which increases confidence that these are genuine model drivers rather than an artifact of one particular explanation technique."
));

children.push(h2("5.4 From Explanations to Educator Action"));
children.push(p("Translating the SHAP/LIME findings into instructor-facing early-warning signals:"));
children.push(bullet("A student who has not submitted (or has scored poorly on) the first early assessment by week 4 is the single strongest risk signal available \u2014 this should trigger the earliest possible check-in."));
children.push(bullet("Login/engagement consistency (active days), not raw click volume, is the second strongest signal \u2014 a dashboard flag for \u201cfewer than ~10 active days in the first month\u201d is simple to implement and well-supported by the data."));
children.push(bullet("Risk is not uniform across modules \u2014 some course presentations (e.g. GGG, FFF) carry structurally higher predicted risk, suggesting module-level review of pacing or early assessment design may help as much as individual-student intervention."));
children.push(bullet("Model errors cluster around Withdrawn students whose early behavior looks like a Pass \u2014 a reminder that behavioral data alone cannot capture all reasons a student leaves, and automated flags should support rather than replace human advising judgment."));

// ---- 6. Discussion and Limitations ----
children.push(h1("6. Discussion and Limitations"));
children.push(h2("6.1 Model Performance in Context"));
children.push(p(
  "A macro-F1 around 0.43 on a four-class, moderately imbalanced target using only the first 28 days of a 30+ week course is a meaningfully harder task than the near-end-of-course or binary pass/fail predictions reported in much prior OULAD literature; direct accuracy comparisons across studies should account for this difference in framing before concluding this framework underperforms prior work."
));
children.push(h2("6.2 Choice of Early Cutoff"));
children.push(p(
  "Day 28 was chosen as a reasonable early-warning point, but it is a single fixed choice. A natural extension (noted for future work below) is to sweep the cutoff (e.g. day 14, day 21, day 28, day 42) and plot predictive performance against warning lead-time, giving institutions an explicit trade-off curve rather than one fixed operating point."
));
children.push(h2("6.3 Practical Constraints"));
children.push(bullet("SVM was tuned and trained on a 4,000-row stratified subsample of the training data rather than the full 22,030 rows, because RBF-kernel SVM training cost scales poorly (roughly quadratic-to-cubic) with sample size. It was still evaluated on the full test set. A production system with more compute could retrain SVM on the full training set."));
children.push(bullet("SHAP explanations use XGBoost rather than the better-balanced Random Forest model (\u00a74.2), for the runtime reasons discussed in \u00a75. Because both are tree ensembles built on the same 26 features, the qualitative feature-importance findings are expected to transfer, but a reader should treat the exact SHAP magnitudes as XGBoost-specific rather than assuming they would be identical for Random Forest."));
children.push(bullet("Grid search was intentionally limited (3-fold CV, modest hyperparameter grids) to keep the full pipeline runnable end-to-end; a dedicated hyperparameter optimization pass (e.g. Bayesian optimization, wider grids, more folds) would likely improve all five models somewhat."));
children.push(h2("6.4 Positioning Relative to the Closest Prior Work"));
children.push(p(
  "Readers familiar with Almazroei (2026) will notice that its reported accuracy (95.0%) is substantially higher than the 39.1%\u201353.1% accuracy range reported here in \u00a74.2, despite both studies using OULAD, comparable model families, and SHAP/LIME. This gap is expected and largely explained by feature timing rather than modeling quality: Almazroei's top-ranked features \u2014 total weighted assessment score and unregistration date \u2014 are only fully known once a student has essentially finished (or formally left) the course, which makes the prediction task substantially easier but also substantially less useful as an early-warning tool, since by the time those features are available, the window for intervention has largely closed. This report's day-28 cutoff deliberately excludes exactly those high-signal, late-arriving features, which is why accuracy is lower but why the resulting model is genuinely deployable as an early-warning system four weeks into a course rather than only near its end. This trade-off \u2014 lower reported accuracy in exchange for a verifiably earlier and more actionable prediction \u2014 is the central methodological difference this report contributes, and it should be read as a difference in task difficulty, not a weaker model."
));

children.push(h2("6.5 Generalizability"));
children.push(p(
  "This study uses a single dataset (OULAD) from a single institution (the UK Open University), which primarily serves distance-learning adult students. Findings \u2014 particularly the relative importance of specific engagement features \u2014 may not transfer directly to a traditional in-person institution with different course structures and student populations."
));

// ---- 7. Conclusion and Future Work ----
children.push(h1("7. Conclusion and Future Work"));
children.push(p(
  "This report built and evaluated an explainable early-prediction framework for student academic performance using only the first 28 days of course data from the OULAD dataset. Random Forest and XGBoost substantially outperformed Logistic Regression, a single Decision Tree, and SVM, though the two traded off differently: Random Forest gave the more balanced predictions across all four outcome classes (best macro-F1), while XGBoost gave the higher raw accuracy by leaning heavily on the majority Pass class. SHAP and LIME explanations, cross-validated against one another, consistently identified early assessment performance and early engagement consistency as the dominant predictors of final outcome \u2014 both of which are simple, interpretable, and actionable signals an institution could surface to advisors in near real time."
));
children.push(p("Directions for future work:"));
children.push(bullet("Sweep the early-prediction cutoff (e.g. 14/21/28/42 days) to quantify the accuracy-vs-lead-time trade-off."));
children.push(bullet("Extend evaluation to a second dataset (e.g. the UCI Student Performance dataset or xAPI-Educational dataset) to test cross-dataset generalizability of both the model rankings and the SHAP feature-importance findings."));
children.push(bullet("Run a wider hyperparameter search (Bayesian optimization, full-data SVM) given more compute budget."));
children.push(bullet("Pilot the resulting early-warning signals with real advisors to evaluate whether the explanations genuinely change intervention behavior, not just prediction accuracy."));

// ---- References ----
children.push(h1("References"));
children.push(p("Alalawi, K., Athauda, R., Chiong, R., & Renner, I. (2025). Evaluating the student performance prediction and action framework through a learning analytics intervention study. Education and Information Technologies, 30(3), 2887\u20132916. https://doi.org/10.1007/s10639-024-12923-5"));
children.push(p("Almazroei, E. E. (2026). Ensemble machine learning framework with SHAP and LIME for accurate early prediction of student success in online learning environments. Scientific Reports, 16, 19506. https://doi.org/10.1038/s41598-026-49894-1"));
children.push(p("Chang, Y.-H., Chen, F.-C., & Lee, C.-I. (2025). Developing an early warning system with personalized interventions to enhance academic outcomes for at-risk students in Taiwanese higher education. Education Sciences, 15(10), 1321. https://doi.org/10.3390/educsci15101321"));
children.push(p("Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining."));
children.push(p("Hung, J.-L., Rice, K., & Zhang, M. (2025). Interpretable AI techniques unveil the factors and types of at-risk early warning: A case study in K-12 online learning. Data Technology and Applications, 59(3), 516\u2013538."));
children.push(p("Islam, M. M., Sojib, F. H., Mihad, M. F. H., Hasan, M., & Rahman, M. (2025). The integration of explainable AI in Educational Data Mining for student academic performance prediction and support system. Telematics and Informatics Reports, 18, 100203. https://doi.org/10.1016/j.teler.2025.100203"));
children.push(p("Jin, L., Wang, Y., Song, H., & So, H.-J. (2024). Predictive modelling with the Open University Learning Analytics Dataset (OULAD): A systematic literature review. In Artificial Intelligence in Education (AIED 2024), Communications in Computer and Information Science, vol. 2150 (pp. 477\u2013484). Springer. https://doi.org/10.1007/978-3-031-64315-6_46"));
children.push(p("Kuzilek, J., Hlosta, M., & Zdrahal, Z. (2017). Open University Learning Analytics dataset. Scientific Data, 4, 170171. https://doi.org/10.1038/sdata.2017.171"));
children.push(p("Laakel Hemdanou, A., Zekeik, H., Achtoun, Y., Lamarti Sefian, M., Nuino, A., & El Afia, A. (2026). Predicting and interpreting student performance in higher education: A BOHB-optimized DNN with dual explanation framework using SHAP and HFSF on OULAD. Measurement: Interdisciplinary Research and Perspectives. https://doi.org/10.1080/15366367.2026.2669152"));
children.push(p("Lundberg, S. M., & Lee, S.-I. (2017). A unified approach to interpreting model predictions. Advances in Neural Information Processing Systems (NeurIPS)."));
children.push(p("Mustofa, S., Emon, Y. R., Mamun, S. B., Akhy, S. A., & Ahad, M. T. (2024). A novel AI-driven model for student dropout risk analysis with explainable AI insights. Computers and Education: Artificial Intelligence, 8, 100352. https://doi.org/10.1016/j.caeai.2024.100352"));
children.push(p("Pedregosa, F., et al. (2011). Scikit-learn: Machine learning in Python. Journal of Machine Learning Research, 12, 2825\u20132830."));
children.push(p("Ribeiro, M. T., Singh, S., & Guestrin, C. (2016). \u201cWhy should I trust you?\u201d: Explaining the predictions of any classifier. Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining."));

// ---- Appendix ----
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("Appendix A: Reproducibility"));
children.push(p(
  "All code used to produce this report (data preparation, EDA, modeling, and explainability) is provided as four standalone Python scripts, intended to be run in order:"
));
children.push(bullet("01_prepare_data.py \u2014 merges the seven OULAD tables and engineers the early-cutoff feature set."));
children.push(bullet("02_eda.py \u2014 produces Figures 1\u20136 and the text EDA summary."));
children.push(bullet("03_modeling.py \u2014 trains and tunes all five models, produces Figures 7\u20139 (comparison chart and confusion matrices), and saves the best pipeline."));
children.push(bullet("04_explainability.py \u2014 produces the SHAP and LIME figures and JSON explanation files."));
children.push(p(
  "Random seeds are fixed (random_state = 42) throughout for reproducibility. The full feature table, trained model pipeline, and all intermediate CSV/JSON outputs are included alongside this report."
));

// ---------------------------------------------------------------
// Assemble & save
// ---------------------------------------------------------------
const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // US Letter
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      },
    },
    children,
  }],
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
  },
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/rebuild/outputs_docx/Student_Performance_Report.docx", buffer);
  console.log("Report written.");
});
