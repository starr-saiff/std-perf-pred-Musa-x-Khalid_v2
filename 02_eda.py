"""
Phase 3 — Exploratory Data Analysis
=====================================
Generates and saves figures + a text summary describing the early-feature
dataset before modeling.
"""

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_theme(style="whitegrid", font_scale=1.0)
FIG_DIR = "G:\Musa"

df = pd.read_csv("early_features.csv")

# ---------------------------------------------------------------
# 1. Class balance
# ---------------------------------------------------------------
plt.figure(figsize=(6, 4))
order = df["final_result"].value_counts().index
sns.countplot(data=df, x="final_result", order=order, palette="viridis")
plt.title("Class Distribution: Final Result")
plt.xlabel("")
plt.ylabel("Number of Students")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/01_class_balance.png", dpi=150)
plt.close()

# ---------------------------------------------------------------
# 2. Early engagement (total clicks) by outcome
# ---------------------------------------------------------------
plt.figure(figsize=(7, 4))
sns.boxplot(data=df, x="final_result", y="total_clicks_early",
            order=order, palette="viridis", showfliers=False)
plt.title("Early (Day 0-28) VLE Clicks by Final Result")
plt.xlabel("")
plt.ylabel("Total early clicks")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/02_clicks_by_outcome.png", dpi=150)
plt.close()

# ---------------------------------------------------------------
# 3. Early average assessment score by outcome (only students who submitted)
# ---------------------------------------------------------------
sub = df[df["submitted_any_assessment_early"] == 1]
plt.figure(figsize=(7, 4))
sns.boxplot(data=sub, x="final_result", y="avg_score_early",
            order=order, palette="viridis", showfliers=False)
plt.title("Early Assessment Score by Final Result\n(students with an early submission)")
plt.xlabel("")
plt.ylabel("Avg early score")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/03_score_by_outcome.png", dpi=150)
plt.close()

# ---------------------------------------------------------------
# 4. Active days by outcome
# ---------------------------------------------------------------
plt.figure(figsize=(7, 4))
sns.boxplot(data=df, x="final_result", y="active_days_early",
            order=order, palette="viridis", showfliers=False)
plt.title("Early Active Days (out of first 28) by Final Result")
plt.xlabel("")
plt.ylabel("Distinct active days")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/04_active_days_by_outcome.png", dpi=150)
plt.close()

# ---------------------------------------------------------------
# 5. Highest education vs outcome (stacked proportion)
# ---------------------------------------------------------------
ct = pd.crosstab(df["highest_education"], df["final_result"], normalize="index")
ct = ct[order]
ct.plot(kind="barh", stacked=True, figsize=(8, 4), colormap="viridis")
plt.title("Final Result Proportion by Highest Education (prior)")
plt.xlabel("Proportion of students")
plt.ylabel("")
plt.legend(title="", bbox_to_anchor=(1.02, 1), loc="upper left")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/05_education_vs_outcome.png", dpi=150)
plt.close()

# ---------------------------------------------------------------
# 6. Correlation heatmap of numeric early features
# ---------------------------------------------------------------
num_cols = [
    "num_of_prev_attempts", "studied_credits", "date_registration",
    "total_clicks_early", "clicks_resource_early", "clicks_oucontent_early",
    "clicks_forumng_early", "clicks_homepage_early", "clicks_quiz_early",
    "clicks_subpage_early", "clicks_url_early", "active_days_early",
    "distinct_sites_early", "n_assessments_submitted_early", "avg_score_early",
]
plt.figure(figsize=(11, 9))
sns.heatmap(df[num_cols].corr(), cmap="coolwarm", center=0, annot=False)
plt.title("Correlation Matrix — Early Numeric Features")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/06_correlation_heatmap.png", dpi=150)
plt.close()

# ---------------------------------------------------------------
# Text summary
# ---------------------------------------------------------------
summary_lines = []
summary_lines.append(f"Total students (after excluding early-withdrawals): {len(df)}")
summary_lines.append("\nClass distribution:")
summary_lines.append(df["final_result"].value_counts().to_string())
summary_lines.append("\nMissingness (top):")
summary_lines.append(df.isna().sum()[df.isna().sum() > 0].to_string())
summary_lines.append("\nMean early clicks by outcome:")
summary_lines.append(df.groupby("final_result")["total_clicks_early"].mean().round(1).to_string())
summary_lines.append("\nMean early active days by outcome:")
summary_lines.append(df.groupby("final_result")["active_days_early"].mean().round(1).to_string())
summary_lines.append("\n% who submitted an early assessment, by outcome:")
summary_lines.append((df.groupby("final_result")["submitted_any_assessment_early"].mean() * 100).round(1).to_string())

with open("G:\Musa/eda_summary.txt", "w") as f:
    f.write("\n".join(summary_lines))

print("\n".join(summary_lines))
print("\nFigures saved to", FIG_DIR)
