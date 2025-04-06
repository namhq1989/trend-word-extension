// No need to import React when not using JSX transform or React hooks directly
import { Hash, AlignJustify, Timer, Eye, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'

interface GameSettingsDisplayProps {
  wordCount: number
  maxWordLength: number
  timeLimit: number
  autoRevealCount: number
}

const GameSettingsDisplay = ({
  wordCount,
  maxWordLength,
  timeLimit,
  autoRevealCount,
}: GameSettingsDisplayProps) => {
  // No helper functions needed anymore

  return (
    <div className='flex items-center gap-2'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className='flex items-center gap-1 w-[40px] justify-start'>
              <Info size={16} className='cursor-pointer' />
            </div>
          </TooltipTrigger>
          <TooltipContent side='bottom' className='p-4 w-[280px] ml-4'>
            <div className='flex flex-col gap-4'>
              <h4 className='text-base font-semibold mb-2'>Game Settings</h4>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Hash size={14} />
                  <span className='text-sm'>Words</span>
                </div>
                <span className='font-medium text-sm'>{wordCount} words</span>
              </div>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <AlignJustify size={14} />
                  <span className='text-sm'>Max Length</span>
                </div>
                <span className='font-medium text-sm'>
                  {maxWordLength === -1 ? 'No limit' : `${maxWordLength} chars`}
                </span>
              </div>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Timer size={14} />
                  <span className='text-sm'>Time Limit</span>
                </div>
                <span className='font-medium text-sm'>{timeLimit} min</span>
              </div>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Eye size={14} />
                  <span className='text-sm'>Revealed</span>
                </div>
                <span className='font-medium text-sm'>
                  {autoRevealCount === 0
                    ? 'None'
                    : `${autoRevealCount} ${autoRevealCount === 1 ? 'char' : 'chars'}`}
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export default GameSettingsDisplay
