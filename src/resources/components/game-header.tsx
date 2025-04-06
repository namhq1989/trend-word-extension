import {
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
  Tooltip,
} from '@/components/ui/tooltip'
import { formatReadableNumber } from '@/lib/number'
import GameSettingsDisplay from '@/resources/components/game-settings-display.tsx'
import { Gem, Clock, ShieldAlert } from 'lucide-react'

interface GameHeaderProps {
  score: number
  timeRemaining: number | null
  wordCount?: number
  maxWordLength?: number
  timeLimit?: number
  autoRevealCount?: number
  attempts?: number
}

const GameHeader = ({
  score,
  timeRemaining,
  wordCount = 7,
  maxWordLength = 8,
  timeLimit = 5,
  autoRevealCount = 2,
  attempts = 0,
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
        <div className='flex items-center gap-1 w-[60px] justify-start'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Gem size={16} className='cursor-pointer' />
              </TooltipTrigger>
              <TooltipContent>Your current score</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className='font-bold text-base'>
            {formatReadableNumber(score)}
          </span>
        </div>
        {timeRemaining !== null && (
          <div
            className={`flex items-center gap-1 w-[80px] justify-start ${timeRemaining < 60 ? 'text-[#dc2626]' : ''}`}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Clock size={16} className='cursor-pointer' />
                </TooltipTrigger>
                <TooltipContent>Time remaining</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className='font-bold text-base'>
              {Math.floor(timeRemaining / 60)
                .toString()
                .padStart(2, '0')}
              :{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
        <div className='flex items-center gap-1 w-[50px] justify-start'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ShieldAlert size={16} className='cursor-pointer' />
              </TooltipTrigger>
              <TooltipContent>Number of attempts remaining</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className='font-bold text-base'>{attempts}</span>
        </div>
      </div>
    </div>
  )
}

export default GameHeader
