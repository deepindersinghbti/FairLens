from pathlib import Path
from dotenv import load_dotenv
import logging
from app.services.ai_service import generate_ai_insights_with_status

# Load .env explicitly
load_dotenv(dotenv_path=Path(__file__).resolve().parents[0] / '.env')
load_dotenv()
logging.basicConfig(level=logging.DEBUG)

metrics = {
    'analysis_type': 'dataset',
    'fairness_risk_level': 'Medium Risk',
    'impact_gap_percentage': 15,
    'selection_rates': {'group_a': 0.7, 'group_b': 0.55},
    'demographic_parity_difference': 0.15,
    'disparate_impact': 0.79,
    'fairness_score': 75,
    'most_affected_group': 'group_b'
}

insights, source, warning = generate_ai_insights_with_status(metrics)
print('source=', source)
print('warning=', warning)
print('insights=', insights)
