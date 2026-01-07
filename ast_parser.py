import ast
import json
import logging
from pathlib import Path
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class ASTParser:
    """AST-based code parser for Python and JavaScript"""
    
    async def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parse file and extract AST information"""
        file_path_obj = Path(file_path)
        
        if file_path_obj.suffix == '.py':
            return await self._parse_python(file_path)
        elif file_path_obj.suffix in ['.js', '.jsx', '.ts', '.tsx']:
            return await self._parse_javascript(file_path)
        else:
            return self._empty_result()
    
    async def _parse_python(self, file_path: str) -> Dict[str, Any]:
        """Parse Python file using AST"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            functions = []
            classes = []
            imports = []
            dependencies = []
            
            for node in ast.walk(tree):
                # Extract functions
                if isinstance(node, ast.FunctionDef):
                    functions.append({
                        'name': node.name,
                        'line_start': node.lineno,
                        'line_end': node.end_lineno,
                        'args': [arg.arg for arg in node.args.args],
                        'decorators': [d.id if isinstance(d, ast.Name) else str(d) for d in node.decorator_list],
                        'docstring': ast.get_docstring(node)
                    })
                
                # Extract classes
                elif isinstance(node, ast.ClassDef):
                    methods = [m.name for m in node.body if isinstance(m, ast.FunctionDef)]
                    classes.append({
                        'name': node.name,
                        'line_start': node.lineno,
                        'line_end': node.end_lineno,
                        'methods': methods,
                        'bases': [b.id if isinstance(b, ast.Name) else str(b) for b in node.bases],
                        'docstring': ast.get_docstring(node)
                    })
                
                # Extract imports
                elif isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.append(alias.name)
                        dependencies.append(alias.name.split('.')[0])
                
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports.append(f"from {node.module}")
                        dependencies.append(node.module.split('.')[0])
            
            line_count = len(content.split('\n'))
            
            return {
                'ast_data': {
                    'type': 'python',
                    'parsed': True
                },
                'functions': functions,
                'classes': classes,
                'imports': list(set(imports)),
                'dependencies': list(set(dependencies)),
                'line_count': line_count
            }
        
        except Exception as e:
            logger.error(f"Error parsing Python file {file_path}: {str(e)}")
            return self._empty_result()
    
    async def _parse_javascript(self, file_path: str) -> Dict[str, Any]:
        """Parse JavaScript/TypeScript file (simplified)"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            functions = []
            classes = []
            imports = []
            dependencies = []
            
            for i, line in enumerate(lines, 1):
                # Extract functions (simplified regex-based)
                if 'function ' in line or '=>' in line:
                    if 'function ' in line:
                        func_name = line.split('function ')[1].split('(')[0].strip()
                    elif 'const ' in line and '=>' in line:
                        func_name = line.split('const ')[1].split('=')[0].strip()
                    else:
                        func_name = 'anonymous'
                    
                    if func_name and func_name != 'anonymous':
                        functions.append({
                            'name': func_name,
                            'line_start': i,
                            'line_end': i,  # Simplified
                            'type': 'function'
                        })
                
                # Extract classes
                if 'class ' in line:
                    class_name = line.split('class ')[1].split(' ')[0].split('{')[0].strip()
                    if class_name:
                        classes.append({
                            'name': class_name,
                            'line_start': i,
                            'line_end': i  # Simplified
                        })
                
                # Extract imports
                if 'import ' in line:
                    imports.append(line.strip())
                    # Extract package name
                    if 'from ' in line:
                        pkg = line.split('from ')[1].strip().strip(';').strip('"').strip("'")
                        dependencies.append(pkg.split('/')[0])
                    elif "require('" in line or 'require("' in line:
                        pkg = line.split('require(')[1].split(')')[0].strip('"').strip("'")
                        dependencies.append(pkg.split('/')[0])
            
            return {
                'ast_data': {
                    'type': 'javascript',
                    'parsed': True
                },
                'functions': functions,
                'classes': classes,
                'imports': list(set(imports)),
                'dependencies': list(set(dependencies)),
                'line_count': len(lines)
            }
        
        except Exception as e:
            logger.error(f"Error parsing JavaScript file {file_path}: {str(e)}")
            return self._empty_result()
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure"""
        return {
            'ast_data': {'type': 'unknown', 'parsed': False},
            'functions': [],
            'classes': [],
            'imports': [],
            'dependencies': [],
            'line_count': 0
        }
