import { Button } from '@/components/ui/button.tsx'

interface NotEnoughWordsMessageProps {
  wordCount: number
  maxWordLength: number
  resetGame: () => void
}

const NotEnoughWordsMessage = ({ wordCount, maxWordLength, resetGame }: NotEnoughWordsMessageProps) => {
  return (
    <div className='flex flex-col mt-20 justify-center items-center p-4 gap-4'>
      <div className='p-6 bg-muted rounded-md text-center max-w-md'>
        <h2 className='text-2xl font-bold text-primary mb-2'>Not Enough Words</h2>
        <p className='text-base mb-4'>
          You need at least {wordCount} suitable words to play the Word Game. Please collect more words by browsing the web or adding words to your collection.
        </p>
        <p className='text-sm text-muted-foreground'>
          Suitable words are 3-{maxWordLength} letters long and contain only alphabetic characters.
        </p>
      </div>
      <Button onClick={resetGame} className='cursor-pointer'>
        Try Again
      </Button>
    </div>
  )
}

export default NotEnoughWordsMessage
