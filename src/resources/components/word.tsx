import { Bookmark, Volume2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'

const Word = () => {
  const wordData = {
    word: 'filibuster',
    pronunciation: '/ˈfɪlɪbʌstə/',
    partOfSpeeches: ['verb', 'noun'],
    definitions: [
      'a long speech that someone makes in order to delay or prevent a new law being made',
      'to make a long speech in order to delay or prevent a new law being made',
      '(in a legislature) a way of preventing a law from being passed by using the rules or making long speeches to delay voting on it',
    ],
    examples: [
      'The senator used a filibuster to block the legislation',
      'And even the filibuster itself is an unintended consequence of what she sees as more or less an historical accident in 1806, not a strategically motivated intentional act',
    ],
  }

  return (
    <div className='flex flex-col p-4 gap-6'>
      <div className='flex flex-col gap-2'>
        <div className='flex justify-between items-center'>
          <h2 className='text-primary text-4xl font-bold'>{wordData.word}</h2>
          <Bookmark className='cursor-pointer text-muted-foreground' />
        </div>
        <div className='flex items-center gap-2'>
          <Volume2
            size={20}
            className='cursor-pointer'
            fill='var(--foreground)'
          />
          <div className='text-sm'>{wordData.pronunciation}</div>
        </div>
        <div className='flex flex-row gap-1 mt-2'>
          <Badge>advanced</Badge>
          {wordData.partOfSpeeches.map((partOfSpeech) => {
            return (
              <Badge variant='accent' key={partOfSpeech}>
                {partOfSpeech}
              </Badge>
            )
          })}
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        {wordData.definitions.map((definition, index) => {
          return (
            <p key={`definition-${index}`} className='text-sm'>
              • {definition}
            </p>
          )
        })}
      </div>

      <div className='flex flex-col gap-2'>
        {wordData.examples.map((example, index) => {
          const parts = example.split(wordData.word)
          return (
            <div
              key={`example-${index}`}
              className='flex flex-row justify-between items-center bg-container p-4'
            >
              <p className='text-sm italic'>
                {parts[0]} <span className='text-primary'>{wordData.word}</span>{' '}
                {parts[1]}
              </p>
              <div className='flex flex-shrink-0 w-10 h-10 justify-center items-center cursor-pointer'>
                <Volume2 size={20} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Word
