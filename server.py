from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import logging
import os
from pathlib import Path
from config import settings

# Import analysis modules
from services.github_service import GitHubService
from services.ast_parser import ASTParser
from services.ai_analyzer import AIAnalyzer
from services.agent_orchestrator import AgentOrchestrator

# MongoDB connection
client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]

# Create the main app
app = FastAPI(title="Code Intelligence Platform")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    github_url: str
    status: str = "pending"  # pending, analyzing, completed, failed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    analysis_completed_at: Optional[datetime] = None

class ProjectCreate(BaseModel):
    name: str
    github_url: str

class CodeMap(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    file_path: str
    file_type: str
    ast_analysis: Dict[str, Any]
    ai_analysis: Optional[Dict[str, Any]] = None
    functions: List[Dict[str, Any]] = []
    classes: List[Dict[str, Any]] = []
    imports: List[str] = []
    dependencies: List[str] = []
    line_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Requirement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    prompt: str
    analysis: Optional[Dict[str, Any]] = None
    affected_components: Optional[Dict[str, Any]] = None
    status: str = "pending"  # pending, analyzing, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RequirementCreate(BaseModel):
    project_id: str
    prompt: str

class AgentTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requirement_id: str
    agent_type: str  # frontend, backend, database, orchestrator
    status: str = "pending"  # pending, processing, completed, failed
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class Recommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requirement_id: str
    component_type: str  # frontend, backend, database
    file_path: str
    change_type: str  # add, modify, delete
    original_code: Optional[str] = None
    recommended_code: str
    explanation: str
    confidence_score: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Code Intelligence Platform API", "version": "1.0.0"}

# ===== PROJECT ROUTES =====

@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, background_tasks: BackgroundTasks):
    """Create new project and start analysis"""
    project = Project(**project_data.model_dump())
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('analysis_completed_at'):
        doc['analysis_completed_at'] = doc['analysis_completed_at'].isoformat()
    
    await db.projects.insert_one(doc)
    
    # Start analysis in background
    background_tasks.add_task(analyze_project, project.id)
    
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    """Get all projects"""
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    for p in projects:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if p.get('analysis_completed_at') and isinstance(p['analysis_completed_at'], str):
            p['analysis_completed_at'] = datetime.fromisoformat(p['analysis_completed_at'])
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get project by ID"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if project.get('analysis_completed_at') and isinstance(project['analysis_completed_at'], str):
        project['analysis_completed_at'] = datetime.fromisoformat(project['analysis_completed_at'])
    return project

# ===== CODE MAP ROUTES =====

@api_router.get("/code-maps/{project_id}", response_model=List[CodeMap])
async def get_code_maps(project_id: str):
    """Get code maps for a project"""
    code_maps = await db.code_maps.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    for cm in code_maps:
        if isinstance(cm.get('created_at'), str):
            cm['created_at'] = datetime.fromisoformat(cm['created_at'])
    return code_maps

@api_router.get("/code-maps/{project_id}/summary")
async def get_code_map_summary(project_id: str):
    """Get summary of code maps"""
    code_maps = await db.code_maps.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    summary = {
        "total_files": len(code_maps),
        "file_types": {},
        "total_functions": 0,
        "total_classes": 0,
        "total_lines": 0,
        "files": []
    }
    
    for cm in code_maps:
        file_type = cm.get('file_type', 'unknown')
        summary['file_types'][file_type] = summary['file_types'].get(file_type, 0) + 1
        summary['total_functions'] += len(cm.get('functions', []))
        summary['total_classes'] += len(cm.get('classes', []))
        summary['total_lines'] += cm.get('line_count', 0)
        
        summary['files'].append({
            "path": cm['file_path'],
            "type": cm['file_type'],
            "functions": len(cm.get('functions', [])),
            "classes": len(cm.get('classes', [])),
            "lines": cm.get('line_count', 0)
        })
    
    return summary

# ===== REQUIREMENT ROUTES =====

@api_router.post("/requirements", response_model=Requirement)
async def create_requirement(req_data: RequirementCreate, background_tasks: BackgroundTasks):
    """Create requirement and analyze"""
    requirement = Requirement(**req_data.model_dump())
    doc = requirement.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.requirements.insert_one(doc)
    
    # Start requirement analysis
    background_tasks.add_task(analyze_requirement, requirement.id)
    
    return requirement

@api_router.get("/requirements/{project_id}", response_model=List[Requirement])
async def get_requirements(project_id: str):
    """Get requirements for a project"""
    requirements = await db.requirements.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    for req in requirements:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
    return requirements

@api_router.get("/requirements/detail/{requirement_id}", response_model=Requirement)
async def get_requirement(requirement_id: str):
    """Get requirement by ID"""
    requirement = await db.requirements.find_one({"id": requirement_id}, {"_id": 0})
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    if isinstance(requirement.get('created_at'), str):
        requirement['created_at'] = datetime.fromisoformat(requirement['created_at'])
    return requirement

# ===== AGENT TASK ROUTES =====

@api_router.get("/agents/tasks/{requirement_id}", response_model=List[AgentTask])
async def get_agent_tasks(requirement_id: str):
    """Get agent tasks for a requirement"""
    tasks = await db.agent_tasks.find({"requirement_id": requirement_id}, {"_id": 0}).to_list(1000)
    for task in tasks:
        if isinstance(task.get('created_at'), str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        if task.get('completed_at') and isinstance(task['completed_at'], str):
            task['completed_at'] = datetime.fromisoformat(task['completed_at'])
    return tasks

# ===== RECOMMENDATION ROUTES =====

@api_router.get("/recommendations/{requirement_id}", response_model=List[Recommendation])
async def get_recommendations(requirement_id: str):
    """Get recommendations for a requirement"""
    recommendations = await db.recommendations.find({"requirement_id": requirement_id}, {"_id": 0}).to_list(1000)
    for rec in recommendations:
        if isinstance(rec.get('created_at'), str):
            rec['created_at'] = datetime.fromisoformat(rec['created_at'])
    return recommendations

# ==================== BACKGROUND TASKS ====================

async def analyze_project(project_id: str):
    """Background task to analyze project"""
    try:
        logger.info(f"Starting analysis for project {project_id}")
        
        # Update status
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"status": "analyzing"}}
        )
        
        # Get project
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise Exception("Project not found")
        
        # Clone repository
        github_service = GitHubService()
        repo_path = await github_service.clone_repo(project['github_url'], project_id)
        
        # Parse files
        ast_parser = ASTParser()
        ai_analyzer = AIAnalyzer()
        
        files = list(Path(repo_path).rglob('*'))
        for file_path in files:
            if file_path.is_file() and file_path.suffix in settings.SUPPORTED_EXTENSIONS:
                try:
                    # AST parsing
                    ast_result = await ast_parser.parse_file(str(file_path))
                    
                    # AI analysis
                    ai_result = await ai_analyzer.analyze_code(str(file_path))
                    
                    # Create code map
                    code_map = CodeMap(
                        project_id=project_id,
                        file_path=str(file_path.relative_to(repo_path)),
                        file_type=file_path.suffix,
                        ast_analysis=ast_result['ast_data'],
                        ai_analysis=ai_result,
                        functions=ast_result['functions'],
                        classes=ast_result['classes'],
                        imports=ast_result['imports'],
                        dependencies=ast_result['dependencies'],
                        line_count=ast_result['line_count']
                    )
                    
                    doc = code_map.model_dump()
                    doc['created_at'] = doc['created_at'].isoformat()
                    await db.code_maps.insert_one(doc)
                    
                except Exception as e:
                    logger.error(f"Error parsing {file_path}: {str(e)}")
        
        # Update project status
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "status": "completed",
                "analysis_completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Analysis completed for project {project_id}")
        
    except Exception as e:
        logger.error(f"Error analyzing project {project_id}: {str(e)}")
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"status": "failed"}}
        )

async def analyze_requirement(requirement_id: str):
    """Background task to analyze requirement"""
    try:
        logger.info(f"Starting requirement analysis {requirement_id}")
        
        # Update status
        await db.requirements.update_one(
            {"id": requirement_id},
            {"$set": {"status": "analyzing"}}
        )
        
        # Get requirement
        requirement = await db.requirements.find_one({"id": requirement_id})
        if not requirement:
            raise Exception("Requirement not found")
        
        # Get code maps for project
        code_maps = await db.code_maps.find(
            {"project_id": requirement['project_id']},
            {"_id": 0}
        ).to_list(1000)
        
        # Analyze with AI
        ai_analyzer = AIAnalyzer()
        analysis_result = await ai_analyzer.analyze_requirement(
            requirement['prompt'],
            code_maps
        )
        
        # Update requirement with analysis
        await db.requirements.update_one(
            {"id": requirement_id},
            {"$set": {
                "analysis": analysis_result['analysis'],
                "affected_components": analysis_result['affected_components'],
                "status": "completed"
            }}
        )
        
        # Create agent tasks
        orchestrator = AgentOrchestrator(db)
        await orchestrator.create_tasks(requirement_id, analysis_result)
        
        # Process agent tasks
        await orchestrator.process_tasks(requirement_id)
        
        logger.info(f"Requirement analysis completed {requirement_id}")
        
    except Exception as e:
        logger.error(f"Error analyzing requirement {requirement_id}: {str(e)}")
        await db.requirements.update_one(
            {"id": requirement_id},
            {"$set": {"status": "failed"}}
        )

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
