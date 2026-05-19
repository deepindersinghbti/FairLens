#!/usr/bin/env python3
"""Quick validation of Phase 1 backend changes."""

from app.services.analysis_store import save_analysis_with_id, get_analysis_by_id

# Test saving and retrieving
test_analysis = {'fairness_score': 75, 'test': 'data'}
aid = save_analysis_with_id(test_analysis)
print(f'[OK] Analysis saved with ID: {aid}')

retrieved = get_analysis_by_id(aid)
if retrieved and retrieved.get('fairness_score') == 75:
    print('[OK] Successfully retrieved analysis')
else:
    print('ERROR: Failed to retrieve')
    exit(1)

print('[OK] All Phase 1 backend tests passed')
