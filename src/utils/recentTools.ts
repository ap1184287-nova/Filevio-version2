const RECENT_STORAGE_KEY = 'filevio_recent_tools_v1';
const MAX_RECENT = 6;

export function getRecentToolIds(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function recordRecentTool(toolId: string): string[] {
  try {
    const current = getRecentToolIds().filter((id) => id !== toolId);
    const next = [toolId, ...current].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [toolId];
  }
}

export function clearRecentTools(): void {
  try {
    window.localStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {
    // Ignore storage errors in restricted environments
  }
}
