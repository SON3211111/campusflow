import client from './client';

export const createProject = (data: { title: string }) => client.post('/projects', data);
export const getMyProjects = () => client.get('/projects');

export const createTask = (projectId: string, data: object) =>
  client.post(`/projects/${projectId}/tasks`, data);

export const requestAiTaskDecomposition = (projectId: string, prompt: string) =>
  client.post(`/projects/${projectId}/ai/tasks`, { prompt });