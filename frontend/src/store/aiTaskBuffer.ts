// AiTaskPage ↔ AITaskModal 간 append 상태 공유 모듈
// localStorage 타이밍 이슈 없이 메모리에서 직접 공유

export interface AppendBuffer {
  categories: any[];
  tasks: any[];
  memberBaskets: Record<string, any[]>;
  sessions: any[];
  newSessionPrompt?: string;
}

let _buffer: AppendBuffer | null = null;

export const setAppendBuffer = (data: AppendBuffer) => { _buffer = data; };
export const getAppendBuffer = (): AppendBuffer | null => _buffer;
export const clearAppendBuffer = () => { _buffer = null; };
export const hasAppendBuffer = (): boolean => _buffer !== null;
