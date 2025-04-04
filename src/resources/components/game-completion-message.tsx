import { useState, useEffect } from 'react'

interface GameCompletionMessageProps {
  title?: string
  message?: string
}

const GameCompletionMessage = ({ title, message }: GameCompletionMessageProps) => {
  const [congratulation, setCongratulation] = useState({
    title: title || "Congratulations",
    message: message || "You've completed the Word Drop challenge"
  })

  useEffect(() => {
    if (!title || !message) {
      // Generate random congratulation content if not provided
      const titles = [
        "Congratulations",
        "Well Done",
        "Excellent",
        "Amazing",
        "Fantastic",
        "Brilliant",
        "Superb",
        "Outstanding"
      ]
      
      const messages = [
        "You've completed the Word Drop challenge",
        "You've mastered all the words",
        "Your word skills are impressive",
        "You found all the hidden words",
        "Your vocabulary prowess is remarkable",
        "You've conquered the word puzzle",
        "Word challenge completed successfully",
        "You're a word-finding champion",
      ]
      
      setCongratulation({
        title: titles[Math.floor(Math.random() * titles.length)],
        message: messages[Math.floor(Math.random() * messages.length)]
      })
    }
  }, [title, message])

  return (
    <div className='p-4'>
      <div className='p-6 bg-muted rounded-md text-center'>
        <h2 className='text-2xl font-bold text-primary mb-2'>
          {congratulation.title}
        </h2>
        <p className='text-base'>
          {congratulation.message}
        </p>
      </div>
    </div>
  )
}

export default GameCompletionMessage
