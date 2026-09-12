import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Later classes win over conflicting earlier ones, so callers can override a component's defaults.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
