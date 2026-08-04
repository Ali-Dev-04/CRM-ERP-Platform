/** Builds workspace-scoped API paths from the active org + workspace ids. */
export function wsPath(activeOrgId: string | null, activeWorkspaceId: string | null, suffix: string): string | null {
  if (!activeOrgId || !activeWorkspaceId) return null;
  return `/organizations/${activeOrgId}/workspaces/${activeWorkspaceId}${suffix}`;
}
