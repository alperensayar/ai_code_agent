import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    # MongoDB
    MONGO_URL = os.environ.get('MONGO_URL')
    DB_NAME = os.environ.get('DB_NAME', 'code_intelligence')
    
    # OpenRouter API
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
    OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4-turbo')
    
    # Repository Analysis
    TEMP_REPO_PATH = '/tmp/code_repos'
    MAX_FILE_SIZE = 1024 * 1024  # 1MB
    SUPPORTED_EXTENSIONS = ['.py', '.js', '.jsx', '.ts', '.tsx', '.json']
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

settings = Settings()
