// Identity display helpers. The user's display name is an explicit,
// user-provided field (`full_name`) — completely separate from their email.
// Never derive a name from the email address; if `full_name` is missing
// (e.g. an account created before this field existed), every function here
// returns null/a neutral fallback rather than falling back to the email.

export function firstNameOf(fullName: string | null | undefined): string | null {
  if (!fullName) return null
  const first = fullName.trim().split(/\s+/)[0]
  return first || null
}

export function initialsFrom(fullName: string | null | undefined): string {
  if (!fullName) return '?'
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function greetingWord(hour: number): 'Good morning' | 'Good afternoon' | 'Good evening' {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
