# FairLens Phase 1 MVP - Implementation Complete

## Project Status: ✓ Working

### What's Running

- **Backend**: FastAPI on http://localhost:8000
  - `POST /api/upload-dataset` — accepts CSV files, returns dataset_id + columns + preview
  - `POST /api/analyze-bias` — computes fairness metrics given dataset_id, target column, sensitive attribute
  - Response includes: selection_rates, selection_counts, demographic_parity_difference, disparate_impact, bias_detected

- **Frontend**: Next.js on http://localhost:3000
  - Step 1: Upload CSV
  - Step 2: Preview dataset (first 5 rows)
  - Step 3: Configure analysis (select target & sensitive columns)
  - Step 4: Display results with red bias alert when disparate_impact < 0.8

### Verification Complete

✓ Backend API endpoints respond with correct JSON schema
✓ Selection counts calculated per sensitive group (selected/total)
✓ Bias detection rule works (flags when disparate_impact < 0.8)
✓ CORS configured to allow frontend on localhost:3000
✓ Frontend environment configured to call backend at localhost:8000/api

### Sample Dataset

- **sample_data.csv**: 20 records with clear gender bias
  - Male approval rate: 90% (9/10)
  - Female approval rate: 30% (3/10)
  - Disparate Impact: 0.33 (well below 0.80 threshold)
  - Result: Red alert banner triggers correctly

### Next Steps to Test

1. Open http://localhost:3000 in browser
2. Click upload, select sample_data.csv
3. Observe preview table with first 5 rows
4. Select "approved" as target column, "gender" as sensitive attribute
5. Click "Run Bias Analysis"
6. Confirm results card shows:
   - Selection Rate: F=0.3, M=0.9
   - Selection Counts: F (3/10), M (9/10)
   - DPD: 0.6, DI: 0.3333
   - Red alert: "⚠ Potential bias detected in automated decisions."

### Code Structure

```
backend/
├── requirements.txt              # fastapi, uvicorn, pandas (no fairlearn)
├── app/
│   ├── main.py                  # FastAPI app, CORS, route mounting
│   ├── routes/
│   │   ├── upload.py            # POST /upload-dataset
│   │   └── analysis.py          # POST /analyze-bias
│   ├── services/
│   │   ├── dataset_service.py   # CSV file handling, dataset_id mapping
│   │   └── bias_service.py      # Pandas-only metric calculations
│   └── schemas/
│       ├── request.py           # AnalyzeBiasRequest model
│       └── response.py          # UploadDatasetResponse, AnalyzeBiasResponse

frontend/
├── app/page.tsx                 # Main dashboard orchestration
├── components/
│   ├── CSVUpload.tsx            # File input with drag-drop UI
│   ├── DatasetPreview.tsx       # Preview table component
│   ├── AnalysisControls.tsx     # Column selector dropdowns
│   └── AnalysisResults.tsx      # Metrics cards + bias alert banner
├── lib/api.ts                   # Fetch wrapper for backend endpoints
└── .env.local                   # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

### Decision Log

- Used `dataset_id` (opaque UUID) instead of file paths for API contracts
- Metrics implemented with pandas formulas (no fairlearn in Phase 1)
- Bias threshold: disparate_impact < 0.8 per EEOC guidance
- Included selection_counts (selected/total) per group for transparency
- Single-page dashboard with 4-step linear workflow
- CORS allows localhost:3000 only (can expand in Phase 2)

### Known Limitations (Phase 1 Scope)

- No authentication or user tracking
- Uploaded files stored on disk indefinitely (add TTL cleanup later)
- No batch processing or async job tracking
- No model-level fairness analysis (dataset metrics only)
- No persistent results database

### To Resume Development

```bash
# Terminal 1: Backend
cd backend
. venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev

# Browser
Open http://localhost:3000
```
