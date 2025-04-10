import { Gamepad2, Library, Settings } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import MenuItem from '@/resources/components/menu-item.tsx'
import { goTo } from 'react-chrome-extension-router'
import SettingsScreen from '@/resources/screens/settings-screen.tsx'
import WordReference from '@/resources/components/word-reference.tsx'
import Word from '@/resources/components/word.tsx'
import WordListScreen from '@/resources/screens/word-list-screen.tsx'
import { useEffect, useState, useRef } from 'react'
import useWordControllerStore, {
  useWordMessageListener,
} from '@/app/controllers/word-controller'
import Spinner from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { IWord } from '@/app/models/word.ts'
import { GameStatus } from '@/app/models/game-types'
import GameScreen from './game-screen'

// Component to display the countdown to next word notification
const NextWordCountdown = () => {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    const fetchNextNotificationTime = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getNextNotificationTime',
        })

        if (response.success && response.alarmInfo) {
          const startTime = Date.now()
          const scheduledTime = response.alarmInfo.scheduledTime

          // Initial update
          updateCountdown(scheduledTime - startTime)

          // Set interval to update countdown every second
          const intervalId = setInterval(() => {
            const currentTime = Date.now()
            const remaining = scheduledTime - currentTime
            updateCountdown(remaining)
          }, 1000)

          // Clean up interval on unmount
          return () => clearInterval(intervalId)
        } else {
          setCountdown('')
        }
      } catch (error) {
        console.error('Error fetching next notification time:', error)
        setCountdown('Error')
      }
    }

    const updateCountdown = (remainingMs: number) => {
      if (remainingMs <= 0) {
        setCountdown('00m')
      } else {
        // Convert to hours, minutes, seconds
        const hours = Math.floor(remainingMs / (1000 * 60 * 60))
        const minutes = Math.floor(
          (remainingMs % (1000 * 60 * 60)) / (1000 * 60),
        )

        // If less than 60 seconds but greater than 0, still show as 01m
        if (hours === 0 && minutes === 0 && remainingMs > 0) {
          setCountdown('01m')
          return
        }

        // Format the countdown string with padded zeros for minutes only
        let countdownStr = ''
        if (hours > 0) {
          countdownStr += `${hours.toString().padStart(2, '0')}h `
        }
        // Always show minutes with 2 digits, no seconds
        countdownStr += `${minutes.toString().padStart(2, '0')}m`

        setCountdown(countdownStr)
      }
    }

    fetchNextNotificationTime()
  }, [])

  return (
    countdown && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className='flex items-center text-xs text-base-content/70 cursor-pointer'>
              <span className='text-xs font-bold text-muted-foreground'>
                in {countdown}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent className='mr-4'>
            <p>Time until next word notification</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  )
}

const HomeScreen = () => {
  const { newWord, fetchNewWord, isFetchingNewWord } = useWordControllerStore()
  const [displayedWord, setDisplayedWord] = useState<IWord | null>(null)
  const [fadeState, setFadeState] = useState('in') // 'in' or 'out'
  const lastWordIdRef = useRef<string | null>(null)
  const [savedGameState, setSavedGameState] = useState<any>(null)

  // Set up the message listener to receive word updates from background
  useWordMessageListener()

  // Initial fetch and check for saved game state
  useEffect(() => {
    const fetch = async () => {
      await fetchNewWord()
    }

    // Check for saved game state
    const checkSavedGameState = async () => {
      try {
        const result = await chrome.storage.local.get(['gameState'])
        if (result.gameState) {
          // console.log('Found saved game state:', result.gameState)

          // If game is in progress, mark it as paused when the popup is opened
          if (result.gameState.gameStatus === GameStatus.IN_PROGRESS) {
            const updatedGameState = {
              ...result.gameState,
              gameStatus: GameStatus.PAUSED,
              lastSaved: new Date().toISOString(),
            }

            // Save the updated game state
            await chrome.storage.local.set({ gameState: updatedGameState })
            setSavedGameState(updatedGameState)
          } else {
            setSavedGameState(result.gameState)
          }
        }
      } catch (error) {
        console.error('Error retrieving saved game state:', error)
      }
    }

    fetch().then()
    checkSavedGameState()
  }, [fetchNewWord])

  // Handle new word updates
  useEffect(() => {
    if (newWord && !isFetchingNewWord) {
      if (!displayedWord) {
        // Initial load - no animation needed
        setDisplayedWord(newWord)
        lastWordIdRef.current = newWord.id
      } else if (newWord.id !== lastWordIdRef.current) {
        // New word detected - start transition
        setFadeState('out')
      }
    }
  }, [newWord, isFetchingNewWord, displayedWord])

  // Handle animation transitions
  const handleTransitionEnd = () => {
    if (fadeState === 'out') {
      // Update displayed word after fade out
      setDisplayedWord(newWord)
      lastWordIdRef.current = newWord?.id || null
      // Word has changed, the countdown will be updated via the background script
      setFadeState('in')
    } else {
      // Animation complete
    }
  }

  return (
    <div className='w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px] border-base-content/20'>
        <div className='flex flex-row gap-4 items-center'>
          <MenuItem
            title='Words'
            icon={Library}
            onClick={() => goTo(WordListScreen)}
          />
          <MenuItem
            title='Game'
            icon={Gamepad2}
            onClick={() => goTo(GameScreen)}
            indicator={
              savedGameState &&
              (savedGameState.gameStatus === GameStatus.PAUSED ||
                savedGameState.gameStatus === 'paused')
                ? 'red'
                : undefined
            }
          />
          <MenuItem
            title='Settings'
            icon={Settings}
            onClick={() => goTo(SettingsScreen)}
          />
        </div>

        <div className='flex flex-row gap-2 justify-center items-center'>
          <HeaderTitle title='WordDrop' />
          <NextWordCountdown />
        </div>
      </div>
      <div className='flex flex-col gap-4 mt-2'>
        {isFetchingNewWord && !displayedWord ? (
          <div className='flex mt-20 justify-center items-center'>
            <Spinner />
          </div>
        ) : (
          <div
            className={`transition-opacity duration-500 ease-in-out ${fadeState === 'out' ? 'opacity-0' : 'opacity-100'}`}
            onTransitionEnd={handleTransitionEnd}
          >
            {/* Game state banner removed */}
            <Word word={displayedWord} />
            <div className='px-4'>
              <Separator />
            </div>
            <WordReference news={displayedWord?.news[0] || null} />
          </div>
        )}
      </div>
    </div>
  )
}

export default HomeScreen
