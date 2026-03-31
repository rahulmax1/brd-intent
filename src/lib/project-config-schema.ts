export type ProjectConfig = {
  name: string
  shortName: string
  iconLetter: string
  description: string
  abbreviations: Record<string, string>
  brd: {
    introText: string
    scopeText: string
  }
  ai: {
    idExamples: string
    journeyIdExamples: string
    idPatternHint: string
  }
}
