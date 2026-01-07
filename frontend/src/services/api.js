import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const projectService = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
};

export const codeMapService = {
  getByProject: (projectId) => api.get(`/code-maps/${projectId}`),
  getSummary: (projectId) => api.get(`/code-maps/${projectId}/summary`),
};

export const requirementService = {
  getByProject: (projectId) => api.get(`/requirements/${projectId}`),
  getById: (id) => api.get(`/requirements/detail/${id}`),
  create: (data) => api.post('/requirements', data),
};

export const agentService = {
  getTasks: (requirementId) => api.get(`/agents/tasks/${requirementId}`),
};

export const recommendationService = {
  getByRequirement: (requirementId) => api.get(`/recommendations/${requirementId}`),
};

export default api;
