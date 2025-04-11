import { useState, useEffect } from 'react'
import { ChevronLeft, Volume2 } from 'lucide-react'
import { goBack } from 'react-chrome-extension-router'
import HeaderTitle from '@/resources/components/header-title.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import Spinner from '@/components/ui/spinner'
import { formatReadableNumber } from '@/lib/number'
import { useAudioPlayer } from '@/resources/components/hooks/use-audio-player'

// Define the game data interface
interface GameWord {
  word: string
  points: number
  id?: string // Optional ID for pronunciation
}

interface GameData {
  words: GameWord[]
  points: number
  timeSpent: number
  winningAt: string
}

interface RecentGamesData {
  recentGames: GameData[]
  totalGamePoints: number
}

// Helper function to format time spent in minutes and seconds with 2 digits
const formatTimeSpent = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}m${remainingSeconds.toString().padStart(2, '0')}s`
}

// Helper function to format date as DD/MM/YYYY, HH:MM (24 hours)
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${day}/${month}/${year}, ${hours}:${minutes}`
}

const RecentGamesScreen = () => {
  const [loading, setLoading] = useState(true)
  const [gamesData, setGamesData] = useState<RecentGamesData>({
    recentGames: [],
    totalGamePoints: 0,
  })
  const [words, setWords] = useState<any[]>([])
  const { playAudio } = useAudioPlayer()

  useEffect(() => {
    // Fetch the recent games data from Chrome storage
    const fetchRecentGames = async () => {
      setLoading(true)
      try {
        const data = await new Promise<RecentGamesData>((resolve) => {
          chrome.storage.local.get(
            ['recentGames', 'totalGamePoints'],
            (result) => {
              resolve({
                recentGames: result.recentGames || [],
                totalGamePoints: result.totalGamePoints || 0,
              })
            },
          )
        })

        setGamesData(data)

        // Also fetch all words to get pronunciation data
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'getWords',
            start: 0,
            limit: 500, // Fetch a reasonable number of words
          })

          if (response.success && response.words) {
            setWords(response.words)
          }
        } catch (error) {
          console.error('Error fetching words:', error)
        }
      } catch (error) {
        console.error('Error fetching recent games:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentGames()
  }, [])

  return (
    <div className='flex flex-col w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <ChevronLeft className='cursor-pointer' onClick={() => goBack()} />
        <HeaderTitle title='Recent Games' />
        <div className='w-6'></div> {/* Empty div to balance the header */}
      </div>

      {loading ? (
        <div className='flex-1 flex justify-center items-center'>
          <Spinner />
        </div>
      ) : (
        <div className='flex-1 flex flex-col p-4 gap-4'>
          <div className='flex items-center gap-1'>
            <h2 className='text-base font-semibold'>Total Points:</h2>
            <span className='font-bold text-lg text-primary'>
              {formatReadableNumber(gamesData.totalGamePoints)} pts
            </span>
          </div>

          {gamesData.recentGames.length === 0 ? (
            <div className='flex-1 flex justify-center items-center flex-col gap-4 opacity-70 mt-8'>
              <p>No games played yet. Start playing to see your history!</p>
            </div>
          ) : (
            <div className='flex flex-col gap-4'>
              {gamesData.recentGames.map((game, index) => (
                <GameHistoryItem
                  key={index}
                  game={game}
                  words={words}
                  playAudio={playAudio}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface GameHistoryItemProps {
  game: GameData
  words: any[]
  playAudio: (id: string) => void
}

const GameHistoryItem = ({ game, words, playAudio }: GameHistoryItemProps) => {
  return (
    <div className='flex flex-col bg-container p-4 gap-2 rounded-md'>
      <div className='flex flex-col gap-1'>
        <div className='flex items-center gap-2 text-sm'>
          <span className='font-semibold'>{game.points} points</span>
          <span>•</span>
          <span>{formatTimeSpent(game.timeSpent)}</span>
          <span>•</span>
          <span>{game.words.length} words</span>
        </div>

        <div className='text-sm text-muted-foreground'>
          {formatDate(game.winningAt)}
        </div>
      </div>

      <div className='mt-2'>
        <table className='w-full text-sm'>
          <tbody>
            {game.words.map((gameWord, idx) => {
              // Find the original word from all words to get pronunciation
              const originalWord = words.find(
                (w) => w.word.toLowerCase() === gameWord.word.toLowerCase(),
              )

              return (
                <tr key={idx}>
                  <td className='py-2'>
                    <div className='flex items-center gap-2'>
                      {gameWord.word}
                      {originalWord && originalWord.id && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Volume2
                                size={16}
                                className='cursor-pointer'
                                onClick={() => playAudio(originalWord.id)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Pronounce</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                  <td className='py-1 text-right'>{gameWord.points} pts</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RecentGamesScreen
