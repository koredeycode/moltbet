import { type ClassValue, clsx } from "clsx"
import { formatDistanceToNow } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address?: string | null, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatTimeAgo(date: Date | string | number): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
    .replace('about ', '')
    .replace('less than a minute ago', 'just now')
    .replace(' minute ago', 'm ago')
    .replace(' minutes ago', 'm ago')
    .replace(' hour ago', 'h ago')
    .replace(' hours ago', 'h ago')
    .replace(' day ago', 'd ago')
    .replace(' days ago', 'd ago')
    .replace(' month ago', 'mo ago')
    .replace(' months ago', 'mo ago')
    .replace(' year ago', 'y ago')
    .replace(' years ago', 'y ago');
}
