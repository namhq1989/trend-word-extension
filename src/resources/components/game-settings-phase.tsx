import { useState } from 'react'
import { Hash, AlignJustify, Timer, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'

// Game settings interface
export interface GameSettings {
  wordCount: number
  maxWordLength: number
  timeLimit: number
  autoRevealCount: number
}

interface GameSettingsPhaseProps {
  onStartGame: (settings: GameSettings) => void
}

const GameSettingsPhase = ({ onStartGame }: GameSettingsPhaseProps) => {
  // Game settings state
  const [wordCount, setWordCount] = useState<number>(7) // Default: 7 words
  const [maxWordLength, setMaxWordLength] = useState<number>(8) // Default: 8 characters
  const [timeLimit, setTimeLimit] = useState<number>(5) // Default: 5 minutes
  const [autoRevealCount, setAutoRevealCount] = useState<number>(2) // Default: 2 characters

  // Reset settings to defaults
  const resetSettings = () => {
    setWordCount(7)
    setMaxWordLength(8)
    setTimeLimit(5)
    setAutoRevealCount(2)
  }

  // Start the game with current settings
  const handleStartGame = () => {
    onStartGame({
      wordCount,
      maxWordLength,
      timeLimit,
      autoRevealCount
    })
  }

  return (
    <div className='flex flex-col p-6 gap-6'>
      <div className='text-center mb-2'>
        <h2 className='text-2xl font-bold text-primary'>Game Settings</h2>
        <p className='text-sm text-muted-foreground mt-1'>Customize your game experience</p>
      </div>
      
      {/* Number of Words Setting */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Hash size={18} />
          <span className='font-medium'>Number of Words</span>
        </div>
        <div className='flex gap-2 mt-1'>
          {[5, 7, 10].map(num => (
            <Button 
              key={num}
              variant={wordCount === num ? 'default' : 'outline'}
              className={`flex-1 ${wordCount === num ? 'bg-primary' : ''}`}
              onClick={() => setWordCount(num)}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Max Word Length Setting */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <AlignJustify size={18} />
          <span className='font-medium'>Max Word Length</span>
        </div>
        <div className='flex gap-2 mt-1'>
          {[6, 8, 10].map(num => (
            <Button 
              key={num}
              variant={maxWordLength === num ? 'default' : 'outline'}
              className={`flex-1 ${maxWordLength === num ? 'bg-primary' : ''}`}
              onClick={() => setMaxWordLength(num)}
            >
              {num} chars
            </Button>
          ))}
        </div>
      </div>
      
      {/* Time Limit Setting */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Timer size={18} />
          <span className='font-medium'>Time Limit</span>
        </div>
        <div className='flex gap-2 mt-1'>
          {[3, 5, 10].map(num => (
            <Button 
              key={num}
              variant={timeLimit === num ? 'default' : 'outline'}
              className={`flex-1 ${timeLimit === num ? 'bg-primary' : ''}`}
              onClick={() => setTimeLimit(num)}
            >
              {num} min
            </Button>
          ))}
        </div>
      </div>
      
      {/* Auto-Revealed Characters Setting */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Eye size={18} />
          <span className='font-medium'>Auto-Revealed Characters</span>
        </div>
        <div className='flex gap-2 mt-1'>
          {[0, 1, 2].map(num => (
            <Button 
              key={num}
              variant={autoRevealCount === num ? 'default' : 'outline'}
              className={`flex-1 ${autoRevealCount === num ? 'bg-primary' : ''}`}
              onClick={() => setAutoRevealCount(num)}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>
      
      <div className='flex flex-col gap-3 mt-4'>
        <Button 
          className='w-full py-6 text-lg font-medium cursor-pointer'
          onClick={handleStartGame}
        >
          Play
        </Button>
        <Button 
          variant='outline' 
          className='w-full cursor-pointer'
          onClick={resetSettings}
        >
          Reset Settings
        </Button>
      </div>
    </div>
  )
}

export default GameSettingsPhase
