
# Django project initialization
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if it exists
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    # Set default sudo password if .env doesn't exist
    os.environ.setdefault("SUDO_PASSWORD", "john")
