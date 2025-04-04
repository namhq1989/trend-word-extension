import GameSettingsDisplay from '@/resources/components/game-settings-display.tsx'

interface GameHeaderProps {
  score: number
  timeRemaining: number | null
  wordCount?: number
  maxWordLength?: number
  timeLimit?: number
  autoRevealCount?: number
}

const GameHeader = ({ 
  score, 
  timeRemaining, 
  wordCount = 7,
  maxWordLength = 8,
  timeLimit = 5,
  autoRevealCount = 2
}: GameHeaderProps) => {
  return (
    <div className='flex justify-between items-center'>
      <div className='flex items-center gap-8'>
        <GameSettingsDisplay
          wordCount={wordCount}
          maxWordLength={maxWordLength}
          timeLimit={timeLimit}
          autoRevealCount={autoRevealCount}
        />
        <p className='text-base'>
          Score: {score}
        </p>
        {timeRemaining !== null && (
          <p 
            className={`text-base ${timeRemaining < 60 ? 'text-[#dc2626]' : ''}`}
          >
            Time: {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>
    </div>
  )
}

export default GameHeader
