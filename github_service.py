import os
import shutil
from pathlib import Path
from git import Repo
from config import settings
import logging

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self):
        self.temp_path = Path(settings.TEMP_REPO_PATH)
        self.temp_path.mkdir(parents=True, exist_ok=True)
    
    async def clone_repo(self, github_url: str, project_id: str) -> str:
        """Clone GitHub repository"""
        try:
            repo_path = self.temp_path / project_id
            
            # Remove if exists
            if repo_path.exists():
                shutil.rmtree(repo_path)
            
            logger.info(f"Cloning repository: {github_url}")
            Repo.clone_from(github_url, repo_path)
            
            return str(repo_path)
        except Exception as e:
            logger.error(f"Error cloning repository: {str(e)}")
            raise
    
    def cleanup_repo(self, project_id: str):
        """Clean up cloned repository"""
        repo_path = self.temp_path / project_id
        if repo_path.exists():
            shutil.rmtree(repo_path)
