// 프로젝트 및 AI 업무 분해 관련 API 함수 모음
import client from './client';

// 새 프로젝트 생성
export const createProject = (data: { title: string }) => client.post('/projects', data);
// 내 프로젝트 목록 조회
export const getMyProjects = () => client.get('/projects');

// 특정 프로젝트에 태스크 추가
export const createTask = (projectId: string, data: object) =>
  client.post(`/projects/${projectId}/tasks`, data);

// AI 업무 분해 요청: 프롬프트 전달 → AI가 태스크 목록 생성
export const requestAiTaskDecomposition = (projectId: string, prompt: string) =>
  client.post(`/projects/${projectId}/ai/tasks`, { prompt });