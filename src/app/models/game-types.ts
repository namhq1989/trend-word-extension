export enum GameOutcome {
  WIN = 'win',
  LOSS = 'loss',
  IN_PROGRESS = 'in-progress'
}

export enum GameStatus {
  IN_PROGRESS = 'in-progress',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

export interface WordSubmission {
  word: string
  found: boolean
  points: number
  timestamp: number
  attemptNumber: number
  duration: number // Time taken to find the word in milliseconds
  attempts?: number // Remaining attempts after this submission
}

export interface GameSettings {
  wordCount: number
  maxWordLength: number
  timeLimit: number
  autoRevealCount: number
  forceNewGame?: boolean // Optional flag to force starting a new game instead of resuming a paused one
}

export interface GameStatistics {
  totalWords: number
  wordsFound: number
  totalPoints: number
  averagePoints: number
  averageWordDuration: number
  fastestWord: WordSubmission
  slowestWord: WordSubmission
  attemptsUsed: number
  timeLimit: number
  timeTaken: number
  completionRate: number
}
