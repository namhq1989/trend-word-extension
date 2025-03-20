import { Library, Settings, Clock } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import MenuItem from '@/resources/components/menu-item.tsx'
import { goTo } from 'react-chrome-extension-router'
import SettingsScreen from '@/resources/screens/settings-screen.tsx'
import WordReference from '@/resources/components/word-reference.tsx'
import Word from '@/resources/components/word.tsx'
import WordListScreen from '@/resources/screens/word-list-screen.tsx'
import { useEffect, useState } from 'react'
import useWordControllerStore from '@/app/controllers/word-controller'
import Spinner from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
        // Always show minutes with 2 digits
        if (hours > 0 || minutes > 0) {
          countdownStr += `${minutes.toString().padStart(2, '0')}m `
        }
        // Always show seconds with 2 digits
        countdownStr += `${seconds.toString().padStart(2, '0')}s`

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

  useEffect(() => {
    const fetch = async () => {
      await fetchNewWord()
    }

    fetch().then()
  }, [fetchNewWord])

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
        </div>
      </div>
      <div className='flex flex-col gap-4 mt-2'>
        {isFetchingNewWord ? (
          <div className='flex mt-20 justify-center items-center'>
            <Spinner />
          </div>
        ) : (
          <>
            <Word word={newWord} />
            <div className='px-4'>
              <Separator />
            </div>
            <WordReference news={newWord?.news[0] || null} />
          </>
        )}
      </div>
    </div>
  )
}

export default HomeScreen
