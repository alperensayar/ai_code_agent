import logging
from typing import Dict, Any
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """Orchestrates multi-agent workflow"""
    
    def __init__(self, db):
        self.db = db
    
    async def create_tasks(self, requirement_id: str, analysis_result: Dict[str, Any]):
        """Create agent tasks based on analysis"""
        affected = analysis_result.get('affected_components', {})
        
        tasks = []
        
        # Frontend agent tasks
        if affected.get('frontend'):
            tasks.append({
                'id': str(uuid.uuid4()),
                'requirement_id': requirement_id,
                'agent_type': 'frontend',
                'status': 'pending',
                'input_data': {
                    'components': affected['frontend'],
                    'analysis': analysis_result
                },
                'output_data': None,
                'created_at': datetime.now(timezone.utc).isoformat()
            })
        
        # Backend agent tasks
        if affected.get('backend'):
            tasks.append({
                'id': str(uuid.uuid4()),
                'requirement_id': requirement_id,
                'agent_type': 'backend',
                'status': 'pending',
                'input_data': {
                    'services': affected['backend'],
                    'analysis': analysis_result
                },
                'output_data': None,
                'created_at': datetime.now(timezone.utc).isoformat()
            })
        
        # Database agent tasks
        if affected.get('database'):
            tasks.append({
                'id': str(uuid.uuid4()),
                'requirement_id': requirement_id,
                'agent_type': 'database',
                'status': 'pending',
                'input_data': {
                    'models': affected['database'],
                    'analysis': analysis_result
                },
                'output_data': None,
                'created_at': datetime.now(timezone.utc).isoformat()
            })
        
        # Insert all tasks
        if tasks:
            await self.db.agent_tasks.insert_many(tasks)
        
        logger.info(f"Created {len(tasks)} agent tasks for requirement {requirement_id}")
    
    async def process_tasks(self, requirement_id: str):
        """Process all agent tasks"""
        tasks = await self.db.agent_tasks.find(
            {'requirement_id': requirement_id, 'status': 'pending'}
        ).to_list(100)
        
        for task in tasks:
            try:
                await self._process_single_task(task)
            except Exception as e:
                logger.error(f"Error processing task {task['id']}: {str(e)}")
    
    async def _process_single_task(self, task: Dict[str, Any]):
        """Process single agent task"""
        task_id = task['id']
        agent_type = task['agent_type']
        
        # Update status
        await self.db.agent_tasks.update_one(
            {'id': task_id},
            {'$set': {'status': 'processing'}}
        )
        
        # Simulate agent processing
        output_data = {
            'agent': agent_type,
            'processed': True,
            'recommendations': [
                {
                    'file': f'example_{agent_type}.py',
                    'change': 'Add new function',
                    'reason': 'Based on requirement analysis'
                }
            ]
        }
        
        # Create recommendations
        for rec in output_data['recommendations']:
            recommendation = {
                'id': str(uuid.uuid4()),
                'requirement_id': task['requirement_id'],
                'component_type': agent_type,
                'file_path': rec['file'],
                'change_type': 'modify',
                'original_code': None,
                'recommended_code': '# New code here',
                'explanation': rec['reason'],
                'confidence_score': 0.85,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await self.db.recommendations.insert_one(recommendation)
        
        # Update task
        await self.db.agent_tasks.update_one(
            {'id': task_id},
            {'$set': {
                'status': 'completed',
                'output_data': output_data,
                'completed_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Task {task_id} completed by {agent_type} agent")
