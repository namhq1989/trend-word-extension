import { Menu, Volume2 } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'

const HomeScreen = () => {
  // Example word data
  const wordData = {
    word: 'Filibuster',
    pronunciation: '/ˈfɪlɪbʌstə/',
    partOfSpeech: 'noun',
    definition:
      'An action such as a prolonged speech that obstructs progress in a legislative assembly.',
    example: 'The senator used a filibuster to block the legislation.',
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
        <div className='flex flex-row gap-6 items-center'>
          <Menu className='cursor-pointer' />
        </div>
        <div className='flex flex-row gap-4 justify-center'>
          <HeaderTitle title='Trend Word' />
        </div>
      </div>
      <div className='flex flex-col gap-4'>
        <div className='card'>
          <div className='card-body gap-4'>
            <h2 className='text-primary text-3xl font-bold'>{wordData.word}</h2>

            <div className='flex flex-col gap-1 mb-4'>
              <div className='flex items-center gap-4'>
                <div className='text-base opacity-70'>
                  {wordData.pronunciation}
                </div>
                <Volume2 size={24} className='cursor-pointer opacity-70' />
              </div>

              <div className='mt-1 badge badge-soft badge-secondary'>
                {wordData.partOfSpeech}
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <h3 className='font-semibold italic'>Definition</h3>
              <p>{wordData.definition}</p>
            </div>

            <div className='flex flex-col gap-2'>
              <h3 className='font-semibold italic'>Example</h3>
              <p>{wordData.example}</p>
            </div>
          </div>
        </div>

        <div className='card p-4'>
          <div className='card-body bg-container rounded-xl'>
            <div className='badge badge-soft badge-info mb-2'>
              {newsData.category}
            </div>

            <h4 className='text-lg font-bold'>{newsData.headline}</h4>

            <p className='text-sm opacity-70 mb-2'>
              Source:{' '}
              <a
                href='https://google.com.vn'
                target='_blank'
                className='underline underline-offset-4'
              >
                {newsData.source}
              </a>
            </p>

            <p>
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
