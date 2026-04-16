from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.services.analysis_store import get_analysis_result
from app.services.report_service import ReportService


router = APIRouter()


@router.get("/generate-report")
async def generate_report(dataset_id: str, analysis_type: str) -> Response:
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
