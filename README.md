# FairLens - Bias Detection Dashboard

**Status**: Complete & Live

FairLens is an open-source tool for analyzing and visualizing bias in datasets and automated decision systems. Upload your data, select target and sensitive attributes, and get instant fairness metrics with visual insights.

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Python 3.8+ with pip
- Node.js 18+ with npm
- Both backend and frontend servers running

### Launch

**Terminal 1: Backend (FastAPI)**
```bash
cd backend
. venv\Scripts\Activate.ps1          # Windows
# source venv/bin/activate           # macOS/Linux
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2: Frontend (Next.js)**
```bash
cd frontend
npm run dev
```

**Browser**
```
Open http://localhost:3000
```

### Test the System

1. **Upload** — Select `sample_data.csv` from the project root
2. **Configure** — Target: `approved`, Sensitive Attribute: `gender`
3. **Analyze** — Click "Run Bias Analysis"
4. **View Results** — See metrics, chart, and insights

**Expected Output**:
- Demographic Parity Difference: 0.6
- Disparate Impact: 0.3333 (⚠ Below 0.8 threshold)
- Selection Rates: M 90%, F 30%
- Red bias alert banner
- Rule-based insights explaining the findings

---

## ✨ What's Included (Phase 2)

### Core Features
- ✓ **CSV Upload** — Drag-and-drop or file browser with instant preview
- ✓ **Fairness Metrics** — Demographic Parity Difference, Disparate Impact, Selection Rates
- ✓ **Bias Detection** — Automatic flagging when Disparate Impact < 0.8 (EEOC guidance)
- ✓ **Data Visualization** — Bar charts for selection rates across groups
- ✓ **Insights Panel** — Rule-based explanations of findings
- ✓ **Multi-group Support** — Handles 2 or more sensitive groups
- ✓ **Responsive Design** — Works on desktop and tablet

### Fairness Metrics Explained

| Metric | Definition | What It Means |
|--------|-----------|---------------|
| **Demographic Parity Difference** | Max selection rate - Min selection rate | How different approval rates are (0 = perfect parity) |
| **Disparate Impact Ratio** | Min rate ÷ Max rate | If < 0.8, likely discriminatory under EEOC guidance |
| **Selection Rate** | Approved ÷ Total per group | Percentage of each group selected/approved |

### Technology Stack

**Backend**:
- FastAPI (Python web framework)
- Pandas (data processing)
- UUID (dataset tracking)

**Frontend**:
- Next.js 15 (React framework)
- TypeScript (type safety)
- Tailwind CSS (styling)
- Recharts (data visualization)

---

## 📁 Project Structure

```
FairLens/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── routes/
│   │   │   ├── upload.py        # POST /api/upload-dataset
│   │   │   └── analysis.py      # POST /api/analyze-bias
│   │   ├── services/
│   │   │   ├── dataset_service.py    # CSV handling, storage
│   │   │   └── bias_service.py       # Fairness metrics & insights
│   │   └── schemas/
│   │       ├── request.py       # Request models
│   │       └── response.py      # Response models
│   ├── uploads/                 # Dataset storage (auto-created)
│   ├── requirements.txt         # Python dependencies
│   └── venv/                    # Virtual environment
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Main dashboard
│   │   └── globals.css          # Global styles
│   ├── components/
│   │   ├── CSVUpload.tsx        # File upload component
│   │   ├── DatasetPreview.tsx   # Preview table
│   │   ├── AnalysisControls.tsx # Column selectors
│   │   └── AnalysisResults.tsx  # Results display (chart, metrics, insights)
│   ├── lib/
│   │   └── api.ts               # API client functions
│   ├── package.json             # npm dependencies
│   └── node_modules/            # Installed packages
│
├── sample_data.csv              # Test data (with bias)
├── sample_data_no_bias.csv      # Test data (balanced)
├── README.md                    # This file
├── docs/
│   ├── PHASE1_NOTES.md          # Phase 1 implementation details
│   └── PHASE2_NOTES.md          # Phase 2 implementation details
└── test_*.py                    # Verification scripts
```

---

## 🔧 API Reference

### Upload Dataset
```http
POST /api/upload-dataset
Content-Type: multipart/form-data

Response:
{
  "dataset_id": "abc-123-def",
  "columns": ["name", "gender", "approved"],
  "preview": [[row1], [row2], ...]
}
```

### Analyze Bias
```http
POST /api/analyze-bias

{
  "dataset_id": "abc-123-def",
  "target_column": "approved",
  "sensitive_attribute": "gender"
}

Response:
{
  "selection_rates": {"M": 0.9, "F": 0.3},
  "selection_counts": {"M": [9, 10], "F": [3, 10]},
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

## 📊 Dashboard Layout

The dashboard displays analysis results in this order:

1. **Metric Cards** — DPD, Disparate Impact, Selection Rates at a glance
2. **Bias Alert Banner** — Red warning when bias detected (DI < 0.8)
3. **Selection Rate Chart** — Bar chart comparing approval rates by group
4. **Selection Count Table** — Detailed breakdown (selected/total per group)
5. **Insights Panel** — Context-specific explanations of findings

---

## ⚙️ Configuration

### Backend Environment
- Default port: `8000`
- CORS allowed: `localhost:3000` (can expand for production)
- Dataset storage: `backend/uploads/` (local disk)

### Frontend Environment
Create `.env.local` in `frontend/` (auto-configured):
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

---

## 🧪 Testing

### Verify Backend
```bash
cd backend
python test_api.py              # Full API functionality
python test_insights.py         # Insights logic (bias & no-bias scenarios)
python analyze_sample.py        # Dataset analysis walkthrough
```

### Test with Sample Data

**Scenario 1: Bias Detected**
- Dataset: `sample_data.csv`
- Target: `approved` | Sensitive: `gender`
- Expected DI: 0.3333 ⚠ (below 0.8)

**Scenario 2: No Bias**
- Dataset: `sample_data_no_bias.csv`
- Target: `approved` | Sensitive: `gender`
- Expected DI: 1.0 ✓ (above 0.8)

---

## 📝 Known Limitations

- **Rule-based Insights** — Static rules, not contextually adaptive
- **No Persistence** — Results not saved between sessions
- **Binary Targets Only** — For Phase 1/2; multi-class in Phase 3+
- **No Authentication** — Single-user local development only
- **Local Storage** — Uploaded files stored on disk indefinitely
- **No Batch Processing** — One analysis at a time

For a complete feature roadmap and architectural decisions, see [docs/PHASE2_NOTES.md](docs/PHASE2_NOTES.md).

---

## 🚦 Troubleshooting

| Problem | Solution |
|---------|----------|
| Frontend won't connect to backend | Ensure backend is running on port 8000 and CORS is enabled |
| "Module not found" (Python) | Run `pip install -r requirements.txt` in backend directory |
| "Cannot find module" (npm) | Run `npm install` in frontend directory |
| Upload fails | Ensure CSV has headers and at least 2 rows |
| Chart not rendering | Verify `npm list recharts` shows installation |
| No insights in response | Check backend is reloading after code changes |

---

## 📚 For Developers

- **Phase 1 Details** — See [docs/PHASE1_NOTES.md](docs/PHASE1_NOTES.md) (MVP architecture, API design)
- **Phase 2 Details** — See [docs/PHASE2_NOTES.md](docs/PHASE2_NOTES.md) (visualization, insights, testing)
- **Code Structure** — Backend services are modular; frontend uses React hooks
- **Decision Log** — Full rationale for architecture choices in phase docs

---

## 🔮 Future Roadmap (Phase 3+)

- Persistent result storage (database)
- Bias mitigation recommendations
- Advanced data quality checks
- Model-level fairness analysis
- Multi-language insights
- PDF/CSV export
- User authentication and history
- Comparative analysis across datasets

---

## 📄 License

See [LICENSE](LICENSE) file.

---

## 🤝 Contributing

This is an open-source project. Contributions welcome!

---

**Last Updated**: May 2026  
**Current Version**: Phase 2 MVP
