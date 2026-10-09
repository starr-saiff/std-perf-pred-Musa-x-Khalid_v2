"""
Phase 1 & 2 — Data Preparation and Feature Engineering
=======================================================
Builds a single early-prediction feature table from the 7 raw OULAD files.

KEY DESIGN DECISION: "Early prediction" window
------------------------------------------------
OULAD's `date` columns are measured in days relative to each course's start
date (day 0). We define the early-prediction cutoff as day 28 (~end of
week 4 of a typical 30+ week module). Only information available by that
point is used as a feature — this is what makes the framework genuinely
"early", unlike papers that use end-of-course engagement totals.

Change EARLY_CUTOFF_DAYS below to re-run the whole pipeline with a
different window (e.g. 14 for a 2-week early-warning system).
"""
import pandas as pd
import numpy as np

DATA_DIR = "G:\Musa"
OUT_DIR = "G:\Musa"
EARLY_CUTOFF_DAYS = 28

# ---------------------------------------------------------------
# 1. Load the small tables
# ---------------------------------------------------------------
student_info = pd.read_csv(f"{DATA_DIR}/studentInfo.csv")
courses = pd.read_csv(f"{DATA_DIR}/courses.csv")
assessments = pd.read_csv(f"{DATA_DIR}/assessments.csv")
registration = pd.read_csv(f"{DATA_DIR}/studentRegistration.csv")
vle_meta = pd.read_csv(f"{DATA_DIR}/vle.csv")

print(f"studentInfo:      {student_info.shape}")
print(f"courses:           {courses.shape}")
print(f"assessments:       {assessments.shape}")
print(f"studentRegistration: {registration.shape}")
print(f"vle metadata:      {vle_meta.shape}")

# ---------------------------------------------------------------
# 2. Drop students who unregistered before day 0 (never really started)
#    and drop the outcome-leaking "Withdrawn after cutoff" ambiguity by
#    keeping Withdrawn as its own class (a valid, importantly different
#    early-warning target: these students need intervention too).
# ---------------------------------------------------------------
registration["date_unregistration"] = pd.to_numeric(
    registration["date_unregistration"], errors="coerce"
)
# Students who withdrew before our early cutoff can't be predicted from
# early data that mostly doesn't exist for them (no signal) -> exclude.
early_dropouts = registration[
    registration["date_unregistration"] <= EARLY_CUTOFF_DAYS
][["code_module", "code_presentation", "id_student"]]

print(f"\nStudents who withdrew before day {EARLY_CUTOFF_DAYS} "
      f"(excluded, no early signal possible): {len(early_dropouts)}")

# ---------------------------------------------------------------
# 3. Registration-based feature: date_registration (often negative =
#    registered before course start; positive = registered late)
# ---------------------------------------------------------------
registration["date_registration"] = pd.to_numeric(
    registration["date_registration"], errors="coerce"
)
reg_features = registration[
    ["code_module", "code_presentation", "id_student", "date_registration"]
].copy()

# ---------------------------------------------------------------
# 4. Early VLE engagement features (the big file — stream in chunks)
# ---------------------------------------------------------------
print("\nAggregating studentVle.csv in chunks (this file is 433MB)...")

# Map id_site -> activity_type so we can break clicks down by type
site_to_type = vle_meta.set_index("id_site")["activity_type"].to_dict()

KEY_TYPES = ["resource", "oucontent", "forumng", "homepage",
             "quiz", "subpage", "url"]

agg = {}  # (module, pres, student) -> dict of running feature sums

chunksize = 2_000_000
usecols = ["code_module", "code_presentation", "id_student",
           "id_site", "date", "sum_click"]
dtypes = {
    "code_module": "category", "code_presentation": "category",
    "id_student": "int32", "id_site": "int32",
    "date": "int32", "sum_click": "int32",
}

n_chunks = 0
for chunk in pd.read_csv(f"{DATA_DIR}/studentVle.csv", usecols=usecols,
                          dtype=dtypes, chunksize=chunksize):
    n_chunks += 1
    early = chunk[chunk["date"] <= EARLY_CUTOFF_DAYS].copy()
    if early.empty:
        continue
    early["activity_type"] = early["id_site"].map(site_to_type)

    # total clicks per student in this chunk (additive across chunks: OK)
    grp = early.groupby(
        ["code_module", "code_presentation", "id_student"], observed=True
    )
    total_clicks = grp["sum_click"].sum()

    # distinct active days / sites must be accumulated as SETS across
    # chunks (a student's rows can span multiple chunks), not counted
    # per-chunk and summed/maxed, or we'd double count or undercount.
    days_by_key = early.groupby(
        ["code_module", "code_presentation", "id_student"], observed=True
    )["date"].apply(set)
    sites_by_key = early.groupby(
        ["code_module", "code_presentation", "id_student"], observed=True
    )["id_site"].apply(set)

    # clicks by key activity type (additive across chunks: OK)
    type_clicks = (
        early[early["activity_type"].isin(KEY_TYPES)]
        .groupby(["code_module", "code_presentation", "id_student",
                   "activity_type"], observed=True)["sum_click"]
        .sum()
        .unstack(fill_value=0)
    )

    for idx in total_clicks.index:
        key = idx
        if key not in agg:
            agg[key] = {"total_clicks_early": 0,
                        "days_set": set(), "sites_set": set(),
                        **{f"clicks_{t}_early": 0 for t in KEY_TYPES}}
        agg[key]["total_clicks_early"] += int(total_clicks.loc[idx])
        agg[key]["days_set"] |= days_by_key.loc[idx]
        agg[key]["sites_set"] |= sites_by_key.loc[idx]
        if idx in type_clicks.index:
            for t in KEY_TYPES:
                if t in type_clicks.columns:
                    agg[key][f"clicks_{t}_early"] += int(
                        type_clicks.loc[idx, t]
                    )
    print(f"  chunk {n_chunks} processed, running student-course keys: {len(agg)}")

# collapse sets to counts now that all chunks are merged
for key, d in agg.items():
    d["active_days_early"] = len(d.pop("days_set"))
    d["distinct_sites_early"] = len(d.pop("sites_set"))

vle_features = pd.DataFrame.from_dict(agg, orient="index")
vle_features.index = pd.MultiIndex.from_tuples(
    vle_features.index, names=["code_module", "code_presentation", "id_student"]
)
vle_features = vle_features.reset_index()
print(f"\nEarly VLE feature table: {vle_features.shape}")

# ---------------------------------------------------------------
# 5. Early assessment features
# ---------------------------------------------------------------
early_assessments = assessments[assessments["date"] <= EARLY_CUTOFF_DAYS].copy()
print(f"\nAssessments due by day {EARLY_CUTOFF_DAYS}: {len(early_assessments)} "
      f"out of {len(assessments)}")

student_assessment = pd.read_csv(f"{DATA_DIR}/studentAssessment.csv")
early_sub = student_assessment[
    student_assessment["id_assessment"].isin(early_assessments["id_assessment"])
].merge(
    early_assessments[["id_assessment", "code_module", "code_presentation", "weight"]],
    on="id_assessment", how="left"
)

assess_grp = early_sub.groupby(
    ["code_module", "code_presentation", "id_student"]
)
assess_features = assess_grp.agg(
    n_assessments_submitted_early=("score", "count"),
    avg_score_early=("score", "mean"),
    weighted_avg_score_early=("score", lambda s: np.average(
        s, weights=early_sub.loc[s.index, "weight"].replace(0, 1)
    )),
).reset_index()

print(f"Early assessment feature table: {assess_features.shape}")

# ---------------------------------------------------------------
# 6. Merge everything onto studentInfo
# ---------------------------------------------------------------
df = student_info.merge(courses, on=["code_module", "code_presentation"], how="left")
df = df.merge(reg_features, on=["code_module", "code_presentation", "id_student"], how="left")
df = df.merge(vle_features, on=["code_module", "code_presentation", "id_student"], how="left")
df = df.merge(assess_features, on=["code_module", "code_presentation", "id_student"], how="left")

# Remove students who dropped out before we could observe any early window
before = len(df)
df = df.merge(
    early_dropouts.assign(_early_dropout=1),
    on=["code_module", "code_presentation", "id_student"], how="left"
)
df = df[df["_early_dropout"].isna()].drop(columns="_early_dropout")
print(f"\nDropped {before - len(df)} early-withdrawal rows with no usable signal.")

# Fill engagement/assessment NaNs with 0 (no activity observed = 0, not missing)
fill_zero_cols = [c for c in vle_features.columns
                   if c not in ("code_module", "code_presentation", "id_student")]
fill_zero_cols += ["n_assessments_submitted_early"]
for c in fill_zero_cols:
    df[c] = df[c].fillna(0)

# avg_score / weighted_avg_score stay NaN if no assessment submitted early
# (that's a genuinely different situation from "scored 0") — we'll add a
# flag feature instead of imputing a fake score.
df["submitted_any_assessment_early"] = (df["n_assessments_submitted_early"] > 0).astype(int)
df["avg_score_early"] = df["avg_score_early"].fillna(-1)  # sentinel, tree models handle fine
df["weighted_avg_score_early"] = df["weighted_avg_score_early"].fillna(-1)

print(f"\nFinal merged table: {df.shape}")
print(df["final_result"].value_counts())

df.to_csv(f"{OUT_DIR}/early_features.csv", index=False)
print(f"\nSaved -> {OUT_DIR}/early_features.csv")
