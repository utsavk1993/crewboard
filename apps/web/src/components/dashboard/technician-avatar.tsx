import { cn } from '@/lib/utils'

// Full class names (not built from the index) so Tailwind's source scan generates them.
const tints = [
  'bg-avatar-1 text-avatar-1-foreground',
  'bg-avatar-2 text-avatar-2-foreground',
  'bg-avatar-3 text-avatar-3-foreground',
  'bg-avatar-4 text-avatar-4-foreground',
  'bg-avatar-5 text-avatar-5-foreground',
  'bg-avatar-6 text-avatar-6-foreground',
] as const

const sizeClasses = {
  sm: 'size-6 text-[0.625rem]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
} as const

// A stable string hash, so a technician keeps the same tint across renders, sessions and lists.
function hashName(name: string) {
  let hash = 0
  for (const char of name) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  }
  return hash
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''

  const first = [...words[0]][0]
  const last = words.length > 1 ? [...words[words.length - 1]][0] : ''
  return (first + last).toUpperCase()
}

interface TechnicianAvatarProps {
  name: string
  size?: keyof typeof sizeClasses
  className?: string
}

export function TechnicianAvatar({ name, size = 'md', className }: TechnicianAvatarProps) {
  const tint = hashName(name) % tints.length

  return (
    // Hidden from assistive tech: the technician's name is always rendered next to the avatar.
    <span
      aria-hidden="true"
      data-slot="technician-avatar"
      data-tint={tint + 1}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        sizeClasses[size],
        tints[tint],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  )
}
