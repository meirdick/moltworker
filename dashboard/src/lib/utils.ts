export function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const AVATAR_COLORS = [
  '#E8D5B7', '#D4E8D1', '#D1D8E8', '#E8D1D8',
  '#D8E8D1', '#E8E1D1', '#D1E8E5', '#E5D1E8',
  '#D1D4E8', '#E8D1D1', '#D6E8D1', '#E8D8D1',
];

export function agentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function priorityIndicator(priority: string): { symbol: string; color: string } {
  switch (priority) {
    case 'critical': return { symbol: '↑↑', color: '#DC2626' };
    case 'high': return { symbol: '↑', color: '#E67E22' };
    case 'medium': return { symbol: '—', color: '#9E9A90' };
    case 'low': return { symbol: '·', color: '#9E9A90' };
    default: return { symbol: '—', color: '#9E9A90' };
  }
}

export function levelBadge(level?: string): { label: string; bg: string; text: string } {
  switch (level) {
    case 'lead': return { label: 'LEAD', bg: '#C4943D', text: '#FFFFFF' };
    case 'specialist': return { label: 'SPC', bg: '#2D6B4A', text: '#FFFFFF' };
    case 'intern': return { label: 'INT', bg: '#9E9A90', text: '#FFFFFF' };
    default: return { label: '', bg: 'transparent', text: 'transparent' };
  }
}
