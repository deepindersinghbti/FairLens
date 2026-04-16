# FairLens Phase 2 - Quick Start Guide

## Current System Status: ✓ Live & Ready

Both servers are running:
- **Backend**: http://localhost:8000/api
- **Frontend**: http://localhost:3000

## Quick Test (5 minutes)

### Step 1: Open Browser
Navigate to: http://localhost:3000

### Step 2: Upload Dataset
- Click the blue upload box
- Select `sample_data.csv` from the project root
- Wait for preview to appear

### Step 3: Configure Analysis
- Target Column: select **"approved"**
- Sensitive Attribute: select **"gender"**
- Click **"Run Bias Analysis"**

### Step 4: View Results
You should see (top to bottom):

#### 1. Metric Cards
```
Demographic Parity Difference: 0.6000
Disparate Impact Ratio: 0.3333 ⚠ Below 0.8 threshold
Selection Rate: F: 30.0%, M: 90.0%
```

#### 2. Bias Alert Banner (Red)
```
⚠ Potential bias detected in automated decisions.
```

#### 3. Selection Rate Chart
- Bar chart showing M: ~90%, F: ~30%

#### 4. Selection Count Table
```
| Group | Selected | Total | Rate  |
|-------|----------|-------|-------|
| F     | 3        | 10    | 30.0% |
| M     | 9        | 10    | 90.0% |
```

#### 5. Bias Insights Panel
```
• Approval rates differ significantly between sensitive groups.
• Disparate Impact is below the fairness threshold of 0.8.
• This dataset may contain historical bias affecting automated decisions.
```

---

## Advanced: Test Balanced Dataset

### Alternative Test with No Bias
1. Upload `sample_data_no_bias.csv` instead
2. Same configuration (approved + gender)
3. Expected results:
   - Disparate Impact: 1.0000 ✓ Above 0.8 threshold
   - NO red alert banner
   - Insights: "No major bias detected..." message

---

## File Structure for Reference

```
FairLens/
├── backend/
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   └── schemas/         # Data models
│   ├── uploads/             # Dataset storage
│   └── main.py              # Entrypoint
├── frontend/
│   ├── app/
│   │   └── page.tsx         # Dashboard
│   ├── components/          # React components
│   ├── lib/
│   │   └── api.ts           # API client
│   └── package.json         # Dependencies (includes recharts)
├── sample_data.csv          # Test data (with bias)
├── sample_data_no_bias.csv  # Test data (balanced)
└── test_*.py                # Verification scripts
```

---

## Key Changes in Phase 2

### Backend (`app/services/bias_service.py`)
- Added `generate_insights()` method for rule-based explanations
- Returns insights based on disparate_impact threshold (0.8)

### Frontend (`components/AnalysisResults.tsx`)
- Added Recharts BarChart for selection rate visualization
- Added Bias Insights panel with bullet-point explanations
- Reorganized layout: Cards → Alert → Chart → Table → Insights

### API Response
New field in `/api/analyze-bias`:
```json
{
  "selection_rates": {...},
  "selection_counts": {...},
  "demographic_parity_difference": 0.6,
  "disparate_impact": 0.3333,
  "bias_detected": true,
  "insights": [
    "Approval rates differ significantly between sensitive groups.",
    "Disparate Impact is below the fairness threshold of 0.8.",
    "This dataset may contain historical bias affecting automated decisions."
  ]
}
```

---

## Commands Reference

```bash
# Terminal 1: Run backend (from project root)
cd backend
. venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Run frontend (from project root)
cd frontend
npm run dev

# Terminal 3: Verify with tests (from project root)
python test_api.py           # Full API test
python test_insights.py      # Insights validation
python analyze_sample.py     # Dataset analysis
```

---

## What's Working ✓

- [x] CSV upload with preview (5 rows)
- [x] Metric calculations (DPD, DI, selection rates)
- [x] Binary target validation (0 or 1)
- [x] Multi-group analysis (2+ groups)
- [x] Selection counts per group (selected/total)
- [x] Bar chart visualization
- [x] Rule-based insights generation
- [x] Bias detection rule (DI < 0.8)
- [x] Red alert banner conditional display
- [x] CORS for localhost development
- [x] Type-safe TypeScript frontend
- [x] Responsive Tailwind design

---

## Not Included (Phase 2 Scope)

- ❌ Authentication/accounts
- ❌ Database persistence
- ❌ Multi-language support
- ❌ Model fairness analysis
- ❌ Bias mitigation recommendations
- ❌ PDF export

These are planned for Phase 3+.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend can't connect to backend | Ensure backend is running on port 8000 |
| Chart not rendering | Check that recharts is installed: `npm list recharts` |
| Upload fails | Ensure CSV has headers and at least 2 rows |
| No insights showing | Verify backend is reloading (look for "Reloader" in terminal) |
| "Module not found" error | Run `pip install -r requirements.txt` in backend |

---

## Next Phase Ideas

- **Persistent Results**: Save analysis history to database
- **Batch Analysis**: Upload and analyze multiple files
- **Advanced Insights**: Context-aware recommendations
- **Model Fairness**: Analyze ML model predictions vs dataset
- **Bias Mitigation**: Suggest resampling or re-weighting strategies
- **Comparative Analysis**: Compare bias across datasets

---

**Version**: Phase 2 MVP  
**Last Updated**: April 2026  
**Status**: ✓ Production Ready for Local Development
