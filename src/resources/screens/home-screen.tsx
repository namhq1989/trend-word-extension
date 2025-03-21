import { Library, Settings, RefreshCw } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import MenuItem from '@/resources/components/menu-item.tsx'
import { goTo } from 'react-chrome-extension-router'
import SettingsScreen from '@/resources/screens/settings-screen.tsx'
import WordReference from '@/resources/components/word-reference.tsx'
import Word from '@/resources/components/word.tsx'
import WordListScreen from '@/resources/screens/word-list-screen.tsx'
import { useEffect, useState, useRef } from 'react'
import useWordControllerStore, { useWordMessageListener } from '@/app/controllers/word-controller'
import Spinner from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { IWord } from '@/app/models/word.ts'

// Component to display the countdown to next word notification
const NextWordCountdown = () => {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    console.log('[COUNTDOWN] Fetching next notification time')
    const fetchNextNotificationTime = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getNextNotificationTime',
        })

        if (response.success && response.alarmInfo) {
          console.log('[COUNTDOWN] Received alarm info:', response.alarmInfo)
          
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
          setCountdown('No scheduled updates')
        }
      } catch (error) {
        console.error('Error fetching next notification time:', error)
        setCountdown('Error')
      }
    }

    const updateCountdown = (remainingMs: number) => {
      if (remainingMs <= 0) {
        setCountdown('Any moment now')
      } else {
        // Convert to hours, minutes, seconds
        const hours = Math.floor(remainingMs / (1000 * 60 * 60))
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000)

        // Format the countdown string with padded zeros for minutes and seconds
        let countdownStr = ''
        if (hours > 0) {
          countdownStr += `${hours.toString().padStart(2, '0')}h `
        }
        // Always show seconds with 2 digits
        countdownStr += `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`

        setCountdown(countdownStr)
      }
    }

    fetchNextNotificationTime()
  }, [])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center underline underline-offset-2 text-xs text-base-content/70 cursor-pointer">
            <span className='text-sm font-bold'>{countdown}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Time until next word notification</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const HomeScreen = () => {
  const { newWord, fetchNewWord, isFetchingNewWord } = useWordControllerStore()
  const [displayedWord, setDisplayedWord] = useState<IWord | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [fadeState, setFadeState] = useState('in') // 'in' or 'out'
  const [shouldRefresh, setShouldRefresh] = useState(false)
  const lastWordIdRef = useRef<string | null>(null)
  // No longer needed as we're using a simpler approach for the countdown

  // Set up the message listener to receive word updates from background
  useWordMessageListener()
  
  console.log('[HOME-SCREEN] Component rendered, isTransitioning:', isTransitioning, 'fadeState:', fadeState)

  // Initial fetch
  useEffect(() => {
    const fetch = async () => {
      console.log('[HOME-SCREEN] Initial fetch of word')
      await fetchNewWord()
    }

    fetch().then()
  }, [fetchNewWord])

  // Handle new word updates
  useEffect(() => {
    if (newWord && !isFetchingNewWord) {
      console.log('[HOME-SCREEN] New word available:', newWord.word, 'Current displayed word:', displayedWord?.word || 'none')
      
      if (!displayedWord) {
        // Initial load - no animation needed
        console.log('[HOME-SCREEN] Initial load - setting displayed word without animation')
        setDisplayedWord(newWord)
        lastWordIdRef.current = newWord.id
      } else if (newWord.id !== lastWordIdRef.current) {
        // New word detected - start transition
        console.log('[HOME-SCREEN] New word differs from current - starting transition')
        setIsTransitioning(true)
        setFadeState('out')
      }
    }
  }, [newWord, isFetchingNewWord, displayedWord])

  // Handle manual refresh
  useEffect(() => {
    if (shouldRefresh) {
      const refresh = async () => {
        console.log('[HOME-SCREEN] Manual refresh triggered')
        setIsTransitioning(true)
        setFadeState('out')
        await fetchNewWord()
        setShouldRefresh(false)
      }
      refresh()
    }
  }, [shouldRefresh, fetchNewWord])

  // Handle animation transitions
  const handleTransitionEnd = () => {
    console.log('[HOME-SCREEN] Transition ended with fadeState:', fadeState)
    
    if (fadeState === 'out') {
      // Update displayed word after fade out
      console.log('[HOME-SCREEN] Fade out complete, updating displayed word to:', newWord?.word)
      setDisplayedWord(newWord)
      lastWordIdRef.current = newWord?.id || null
      // Word has changed, the countdown will be updated via the background script
      setFadeState('in')
    } else {
      // Animation complete
      console.log('[HOME-SCREEN] Fade in complete, animation finished')
      setIsTransitioning(false)
    }
  }

  // Manual refresh handler
  const handleRefresh = () => {
    console.log('[HOME-SCREEN] Refresh button clicked')
    setShouldRefresh(true)
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
            title='Settings'
            icon={Settings}
            onClick={() => goTo(SettingsScreen)}
          />
        </div>
        <NextWordCountdown />
        <div className='flex flex-row gap-4 justify-center items-center'>
          <HeaderTitle title='WordDrop' />
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={handleRefresh} 
                disabled={isFetchingNewWord || isTransitioning}
                className="p-1 rounded-full hover:bg-base-content/10 transition-colors"
              >
                <RefreshCw 
                  size={18} 
                  className={`text-base-content/70 ${isFetchingNewWord || isTransitioning ? 'animate-spin' : ''}`} 
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh word</p>
            </TooltipContent>
          </Tooltip>
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
