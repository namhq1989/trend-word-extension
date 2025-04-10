import { useState, useEffect, useRef } from 'react'
import { GameOutcome } from '@/app/models/game-types'

interface GameCompletionMessageProps {
  title?: string
  message?: string
  gameOutcome: GameOutcome
}

const messageOptions = {
  win: {
    titles: [
      'Spectacular!',
      'Victory!',
      'Brilliant Success!',
      'Word Master!',
      'Challenge Conquered!',
      'Perfect Score!',
      'Exceptional Work!',
      'Vocabulary Virtuoso!',
    ],
    messages: [
      "You've successfully solved all word puzzles with impressive skill!",
      'Your command of vocabulary has led you to victory!',
      'Every word found - your linguistic prowess is remarkable!',
      'Challenge complete! Your word-finding abilities are top-tier!',
      'Puzzle mastered with excellence - well played!',
      'A flawless performance finding every hidden word!',
      'Your word skills shine brightly in this perfect completion!',
      "You've demonstrated exceptional word mastery today!",
    ],
  },
  loss: {
    titles: [
      'Challenge Paused',
      'Another Chance Awaits',
      'Keep Going!',
      'Almost There',
    ],
    messages: [
      "Just a few words short of victory - you'll get them next time!",
      'Progress made! Each attempt brings you closer to mastery!',
      'Building your skills with every challenge - ready for another try?',
      "Great effort! A few more attempts and you'll master these words!",
    ],
  },
}

const GameCompletionMessage = ({
  title,
  message,
  gameOutcome,
}: GameCompletionMessageProps) => {
  const isWin = gameOutcome === GameOutcome.WIN
  const [congratulation, setCongratulation] = useState({
    title: title || (isWin ? 'Congratulations' : 'Game Over'),
    message:
      message ||
      (isWin
        ? "You've completed the Word Drop challenge"
        : "You've run out of attempts. Try again!"),
  })

  // Use a ref to track the previous isWin value
  const prevIsWinRef = useRef(isWin)

  useEffect(() => {
    // Reset the message when isWin changes
    if (prevIsWinRef.current !== isWin) {
      prevIsWinRef.current = isWin
    }

    // Always use the current isWin value to get the correct options
    const options = messageOptions[isWin ? 'win' : 'loss']

    // If title or message is provided, use those instead of random options
    const newCongratulation = {
      title:
        title ||
        options.titles[Math.floor(Math.random() * options.titles.length)],
      message:
        message ||
        options.messages[Math.floor(Math.random() * options.messages.length)],
    }

    setCongratulation(newCongratulation)
  }, [isWin, title, message])

  return (
    <div
      className={`p-4 rounded-md text-center relative ${isWin ? 'bg-muted' : 'bg-destructive/10'}`}
    >
      <h2
        className={`text-2xl font-bold mb-2 ${isWin ? 'text-primary' : 'text-destructive'}`}
      >
        {congratulation.title}
      </h2>
      <p className='text-base'>{congratulation.message}</p>
    </div>
  )
}

export default GameCompletionMessage
