import os
import requests
from dotenv import load_dotenv
load_dotenv()
api_key = os.environ.get('GOOGLE_API_KEY')
if not api_key:
    print("NO API KEY")
    exit(1)
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
r = requests.get(url)
models = r.json().get('models', [])
for m in models:
    if 'generateContent' in m.get('supportedGenerationMethods', []):
        print(m['name'])
