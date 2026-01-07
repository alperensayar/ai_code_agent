import logging
from typing import Dict, List, Any
from openai import OpenAI
from config import settings

logger = logging.getLogger(__name__)

class AIAnalyzer:
    """AI-powered code analysis using OpenRouter"""
    
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY
        )
        self.model = settings.OPENROUTER_MODEL
    
    async def analyze_code(self, file_path: str) -> Dict[str, Any]:
        """Analyze code file with AI"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()[:3000]  # Limit content
            
            prompt = f"""Analyze this code file and provide:
1. Purpose and functionality
2. Key components and their roles
3. Dependencies and relationships
4. Potential issues or improvements

Code:
{content}

Provide analysis in JSON format."""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a code analysis expert. Provide concise, structured analysis."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            analysis_text = response.choices[0].message.content
            
            return {
                'purpose': analysis_text,
                'ai_powered': True,
                'model': self.model
            }
        
        except Exception as e:
            logger.error(f"Error in AI analysis: {str(e)}")
            return {
                'purpose': 'AI analysis unavailable',
                'ai_powered': False,
                'error': str(e)
            }
    
    async def analyze_requirement(self, prompt: str, code_maps: List[Dict]) -> Dict[str, Any]:
        """Analyze user requirement against code base"""
        try:
            # Prepare code context
            code_context = []
            for cm in code_maps[:20]:  # Limit context
                code_context.append({
                    'file': cm['file_path'],
                    'type': cm['file_type'],
                    'functions': [f['name'] for f in cm.get('functions', [])],
                    'classes': [c['name'] for c in cm.get('classes', [])]
                })
            
            analysis_prompt = f"""Analyze this user requirement and identify:
1. What screens/components are affected (frontend)
2. What APIs/services need changes (backend)
3. What database models are impacted
4. Dependencies between components

User Requirement:
{prompt}

Code Base Structure:
{code_context}

Provide detailed analysis in JSON format with keys:
- analysis: overall analysis
- affected_components: {{frontend: [], backend: [], database: []}}
- dependencies: []
- recommendations: []"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a software architecture expert. Analyze requirements and map them to code components."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.3
            )
            
            analysis_text = response.choices[0].message.content
            
            # Try to parse JSON response
            import json
            try:
                result = json.loads(analysis_text)
            except:
                result = {
                    'analysis': analysis_text,
                    'affected_components': {
                        'frontend': [],
                        'backend': [],
                        'database': []
                    }
                }
            
            return result
        
        except Exception as e:
            logger.error(f"Error analyzing requirement: {str(e)}")
            return {
                'analysis': f'Error: {str(e)}',
                'affected_components': {
                    'frontend': [],
                    'backend': [],
                    'database': []
                }
            }
