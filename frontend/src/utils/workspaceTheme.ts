interface WorkspaceTheme {
  id: string;
  gradient: string;
}

export function withStoredGradient<T extends WorkspaceTheme>(workspace: T): T {
  const storedGradient = localStorage.getItem(`ws_gradient_${workspace.id}`);
  return storedGradient ? { ...workspace, gradient: storedGradient } : workspace;
}

export function withStoredGradients<T extends WorkspaceTheme>(workspaces: T[]): T[] {
  return workspaces.map(withStoredGradient);
}
