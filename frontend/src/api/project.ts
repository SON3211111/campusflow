import client from './client';

export const createProject = (data: { title: string }) => client.post('/api/projects', data);
export const getMyProjects = () => client.get('/api/projects');

// data: any 대신 object라고 써주거나 구체적으로 적으면 해결!
export const createTask = (projectId: string, data: object) => 
  client.post(`/api/projects/${projectId}/tasks`, data);

export const requestAiTaskDecomposition = (projectId: string, prompt: string) =>
  client.post(`/api/projects/${projectId}/ai/tasks`, { prompt });