from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.schemas.report_payload import ReportPayload
from app.services.analysis_store import get_analysis_result, get_analysis_by_id
from app.services.report_service import ReportService
from app.services.report_payload_builder import ReportPayloadBuilder


router = APIRouter()


@router.get("/generate-report")
async def generate_report(dataset_id: str, analysis_type: str) -> Response:
    """Legacy endpoint: Generate PDF from analysis results (keyed by dataset_id + analysis_type)."""
    analysis = get_analysis_result(dataset_id, analysis_type)
    if analysis is None:
        raise HTTPException(
            status_code=404,
            detail="No analysis result found for this dataset and analysis type. Run analysis first.",
        )

    pdf_bytes = ReportService.generate_pdf(dataset_id=dataset_id, analysis_type=analysis_type, analysis=analysis)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="fairlens_audit_report.pdf"'},
    )


@router.get("/report-data/{analysis_id}", response_model=ReportPayload)
async def get_report_data(analysis_id: str) -> ReportPayload:
    """
    New endpoint: Get structured report payload for professional audit report rendering.
    
    This endpoint returns complete, deterministic report data suitable for the
    dedicated report page. Data is returned in light mode for professional display.
    """
    print(f"[DEBUG] Fetching report data for analysis_id: {analysis_id}")
    
    analysis = get_analysis_by_id(analysis_id)
    if analysis is None:
        print(f"[DEBUG] Analysis not found for ID: {analysis_id}")
        raise HTTPException(
            status_code=404,
            detail=(
                "Analysis session not found or expired. "
                "Analysis sessions are available for 24 hours. "
                "Please run a new analysis to generate a fresh report."
            ),
        )

    print(f"[DEBUG] Found analysis, building report payload...")
    
    # Build the professional report payload
    dataset_name = analysis.get("dataset_name", "Unknown Dataset")
    mitigation_data = analysis.get("mitigation_data")  # Optional
    
    try:
        report_payload = ReportPayloadBuilder.build_report_payload(
            analysis_id=analysis_id,
            analysis=analysis,
            dataset_name=dataset_name,
            mitigation_data=mitigation_data,
        )
        print(f"[DEBUG] Report payload built successfully")
        return report_payload
    except Exception as e:
        print(f"[ERROR] Failed to build report payload: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build report: {str(e)}"
        )

