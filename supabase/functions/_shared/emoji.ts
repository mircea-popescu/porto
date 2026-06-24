// Caracterele emoji pentru reacții — oglindește EMOJI_LIST din src/lib/social.ts.
// Ținut aici (duplicat mic) fiindcă Edge Functions nu pot importa din src/.
const EMOJI_CHAR: Record<string, string> = {
  thumbs_up: '👍',
  heart: '❤️',
  muscle: '💪',
  cheers: '🥂',
  tada: '🎉',
}

export function emojiChar(type: string): string {
  return EMOJI_CHAR[type] ?? ''
}
