from pathlib import Path
from dotenv import load_dotenv
import logging
import time

load_dotenv(dotenv_path=Path(__file__).resolve().parents[0] / '.env')
load_dotenv()
logging.basicConfig(level=logging.DEBUG)

try:
    import google.generativeai as genai
except Exception as e:
    genai = None

from app.services.gemini_key_manager import load_gemini_keys, classify_error

keys = load_gemini_keys()
print('Loaded keys:', keys)
if not keys:
    print('No keys; aborting quick check')
    exit(0)

if genai is None:
    print('google.generativeai SDK missing')
    exit(0)

api_key = keys[0]
print('Using key (masked):', '****'+api_key[-4:])
try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('models/gemini-2.5-flash')
    start = time.time()
    response = model.generate_content('Say hi', request_options={'timeout': 2.0})
    print('response text:', getattr(response, 'text', None))
    print('success')
except Exception as e:
    print('Exception type:', type(e).__name__)
    print('Exception str:', str(e))
    print('Classification:', classify_error(e))
