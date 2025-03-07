import { Library, Settings, Volume2 } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import SectionTitle from '@/resources/components/section-title.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import MenuItem from '@/resources/components/menu-item.tsx'
import { goTo } from 'react-chrome-extension-router'
import WordListScreen from '@/resources/screens/word-list-screen.tsx'

const HomeScreen = () => {
  // Example word data
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

  // Example news data
  const newsData = {
    category: 'Politics & Government',
    headline: 'Senate Democrats Consider Changing Filibuster Rules',
    source: 'The Washington Post',
    url: '#',
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
          <MenuItem title='Settings' icon={Settings} onClick={() => {}} />
        </div>
        <div className='flex flex-row gap-4 justify-center'>
          <HeaderTitle title='Trend Word' />
        </div>
      </div>
      <div className='flex flex-col gap-8 p-4 mt-4'>
        <div className='flex flex-col gap-6'>
          <div className='flex flex-col gap-2'>
            <h2 className='text-primary text-4xl font-bold'>{wordData.word}</h2>
            <div className='flex flex-row gap-1'>
              <Badge>advanced</Badge>
              {wordData.partOfSpeeches.map((partOfSpeech) => {
                return (
                  <Badge variant='destructive' key={partOfSpeech}>
                    {partOfSpeech}
                  </Badge>
                )
              })}
            </div>
            <div className='flex items-center gap-2 mt-1'>
              <Volume2 size={20} className='cursor-pointer' />
              <div className='text-sm'>{wordData.pronunciation}</div>
            </div>
          </div>

          {/*<Separator />*/}

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
                    {parts[0]}{' '}
                    <span className='text-primary'>{wordData.word}</span>{' '}
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

        <Separator />

        <div className='flex flex-col gap-2'>
          <SectionTitle title='In The News' />
          <div className='flex flex-col gap-2 bg-container p-4'>
            <Badge className='mb-2'>{newsData.category}</Badge>

            <h4 className='text-lg font-bold'>{newsData.headline}</h4>

            <a
              href='https://google.com.vn'
              target='_blank'
              className='underline underline-offset-2 text-sm text-muted-foreground'
            >
              {newsData.source}
            </a>

            <p className='text-sm text-muted-foreground mt-2'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Penatibus
              primis tempus porta conubia ultricies luctus eleifend justo.
              Auctor dolor conubia lacus turpis nostra duis lobortis egestas.
              Justo felis morbi pretium euismod laoreet sit eleifend pharetra
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
