/**
 * Seeded pseudo-random number generator using mulberry32 algorithm
 * Returns the same sequence for the same seed (deterministic)
 */
export function seededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/**
 * Generate a stable 3-digit random number from a string seed
 * Same string always produces same number (for stable reference IDs)
 */
export function generateStableThreeDigit(seed: string): string {
  // Convert string to numeric seed
  let numericSeed = 0
  for (let i = 0; i < seed.length; i++) {
    numericSeed = ((numericSeed << 5) - numericSeed) + seed.charCodeAt(i)
    numericSeed |= 0 // Convert to 32bit integer
  }

  const rng = seededRandom(numericSeed)
  const randomValue = rng()

  // Map to 3-digit range (100-999)
  const threeDigit = Math.floor(randomValue * 900) + 100

  return threeDigit.toString().padStart(3, '0')
}

/**
 * Generate API reference ID in format: API-{domain-letter}{3-digit}
 * Examples: API-H729, API-B381, API-S472
 */
export function generateApiId(domainLetter: string, endpoint: string): string {
  const seed = `${domainLetter}-${endpoint}`
  const digits = generateStableThreeDigit(seed)
  return `API-${domainLetter}${digits}`
}
