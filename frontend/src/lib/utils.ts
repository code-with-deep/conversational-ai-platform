import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getMemoryLabel(type: string): string {
  const labels: Record<string, string> = {
    buffer: 'Buffer',
    summary: 'Summary',
    entity: 'Entity',
    kg: 'Knowledge Graph',
    hybrid: 'Hybrid',
  };
  return labels[type] ?? type;
}

export function getMemoryColor(type: string): string {
  const colors: Record<string, string> = {
    buffer: '#64748b',
    summary: '#3b82f6',
    entity: '#10b981',
    kg: '#8b5cf6',
    hybrid: '#f59e0b',
  };
  return colors[type] ?? '#6366f1';
}

export function getDomainColor(domain: string): string {
  const colors: Record<string, string> = {
    general: '#6366f1',
    technical: '#3b82f6',
    creative: '#ec4899',
    business: '#f59e0b',
    education: '#10b981',
  };
  return colors[domain] ?? '#6366f1';
}

export function getEntityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    person: '#3b82f6',
    organization: '#8b5cf6',
    project: '#10b981',
    technology: '#f59e0b',
    date: '#ef4444',
    concept: '#ec4899',
    other: '#64748b',
  };
  return colors[type] ?? '#64748b';
}
