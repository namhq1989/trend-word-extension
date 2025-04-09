import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Hash, AlignJustify, Timer, Eye } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GameSettings } from '@/app/models/game-types'

interface GameSettingsPhaseProps {
  onStartGame: (settings: GameSettings) => void
  wordCount: number
  setWordCount: React.Dispatch<React.SetStateAction<number>>
  maxWordLength: number
  setMaxWordLength: React.Dispatch<React.SetStateAction<number>>
  timeLimit: number
  setTimeLimit: React.Dispatch<React.SetStateAction<number>>
  autoRevealCount: number
  setAutoRevealCount: React.Dispatch<React.SetStateAction<number>>
}

const GameSettingsPhase = ({
  onStartGame,
  wordCount,
  setWordCount,
  maxWordLength,
  setMaxWordLength,
  timeLimit,
  setTimeLimit,
  autoRevealCount,
  setAutoRevealCount,
}: GameSettingsPhaseProps) => {
  // State to track if there's a paused game
  const [hasPausedGame, setHasPausedGame] = React.useState(false)

  // Check for paused game on component mount
  useEffect(() => {
    chrome.storage.local.get(['gameState'], (result) => {
      if (result.gameState && result.gameState.gameStatus === 'paused') {
        setHasPausedGame(true)
      }
    })
  }, [])

  // Handle start game button click
  const handleStartGame = (forceNew = false) => {
    // Create settings object
    const settings = {
      wordCount,
      maxWordLength,
      timeLimit,
      autoRevealCount,
      forceNewGame: forceNew,
    }

    // Save settings to Chrome storage
    chrome.storage.local.set({ wordDropGameSettings: settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving game settings:', chrome.runtime.lastError)
      }
    })

    // Pass settings to parent component
    onStartGame(settings)
  }

  // Load settings from Chrome storage on component mount
  useEffect(() => {
    chrome.storage.local.get('wordDropGameSettings', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading game settings:', chrome.runtime.lastError)
        return
      }

      const settings = result.wordDropGameSettings
      if (settings) {
        // Update state with saved settings
        if (settings.wordCount) setWordCount(settings.wordCount)
        if (settings.maxWordLength) setMaxWordLength(settings.maxWordLength)
        if (settings.timeLimit) setTimeLimit(settings.timeLimit)
        if (settings.autoRevealCount)
          setAutoRevealCount(settings.autoRevealCount)
      }
    })
  }, [])

  // Setting option component for consistent styling
  const SettingOption = ({
    icon: Icon,
    title,
    children,
  }: {
    icon: React.ElementType
    title: string
    children: React.ReactNode
  }) => (
    <div className='flex bg-container p-4 justify-between items-center'>
      <div className='flex flex-row gap-2 items-center justify-center'>
        <Icon size={20} className='text-muted-foreground' />
        <p className='text-sm text-foreground'>{title}</p>
      </div>
      <div className='flex items-center gap-2'>{children}</div>
    </div>
  )

  return (
    <div className='flex flex-col gap-6 p-4'>
      <div className='flex flex-col gap-2'>
        <h2 className='text-xl font-bold'>Game Settings</h2>
        <p className='text-sm text-muted-foreground'>
          Customize your word game experience before starting
        </p>
      </div>

      <div className='flex flex-col gap-2'>
        <SettingOption icon={Hash} title='Number of Words'>
          <Select
            value={wordCount.toString()}
            onValueChange={(value) => {
              const count = parseInt(value)
              setWordCount(count)

              // Automatically set the appropriate maxWordLength based on word count
              // if (count === 5) {
              //   setMaxWordLength(7) // 7x7 grid for 5 words
              // } else if (count === 7) {
              //   setMaxWordLength(8) // 8x8 grid for 7 words
              // } else if (count === 10) {
              //   setMaxWordLength(11) // 11x11 grid for 10 words
              // }
            }}
          >
            <SelectTrigger className='w-[140px]'>
              <SelectValue placeholder='Select count' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Number of words</SelectLabel>
                <SelectItem value='5'>5 words</SelectItem>
                <SelectItem value='7'>7 words</SelectItem>
                <SelectItem value='10'>10 words</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingOption>

        <SettingOption icon={AlignJustify} title='Max Word Length'>
          <Select
            value={maxWordLength.toString()}
            onValueChange={(value) => setMaxWordLength(parseInt(value))}
          >
            <SelectTrigger className='w-[140px]'>
              <SelectValue placeholder='Select length' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Maximum word length</SelectLabel>
                <SelectItem value='7'>7 characters</SelectItem>
                <SelectItem value='8'>8 characters</SelectItem>
                <SelectItem value='-1'>No limit</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingOption>

        <SettingOption icon={Timer} title='Time Limit'>
          <Select
            value={timeLimit.toString()}
            onValueChange={(value) => setTimeLimit(parseInt(value))}
          >
            <SelectTrigger className='w-[140px]'>
              <SelectValue placeholder='Select time' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Time limit (minutes)</SelectLabel>
                <SelectItem value='3'>3 minutes</SelectItem>
                <SelectItem value='5'>5 minutes</SelectItem>
                <SelectItem value='10'>10 minutes</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingOption>

        <SettingOption icon={Eye} title='Auto-Reveal Letters'>
          <Select
            value={autoRevealCount.toString()}
            onValueChange={(value) => setAutoRevealCount(parseInt(value))}
          >
            <SelectTrigger className='w-[140px]'>
              <SelectValue placeholder='Select count' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Auto-reveal letters</SelectLabel>
                <SelectItem value='0'>None</SelectItem>
                <SelectItem value='1'>1 letter</SelectItem>
                <SelectItem value='2'>2 letters</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingOption>
      </div>

      <div className='flex flex-col gap-4'>
        {hasPausedGame ? (
          <>
            <Button
              onClick={() => handleStartGame(false)}
              className='w-full'
              size='lg'
            >
              Resume Paused Game
            </Button>
            <Button
              onClick={() => handleStartGame(true)}
              className='w-full'
              variant='outline'
              size='lg'
            >
              Start New Game
            </Button>
          </>
        ) : (
          <Button
            onClick={() => handleStartGame(false)}
            className='w-full'
            size='lg'
          >
            Start Game
          </Button>
        )}
      </div>
    </div>
  )
}

export default GameSettingsPhase
