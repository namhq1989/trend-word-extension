import { useState } from 'react'

const TrendWordApp = () => {
  const [currentTab, setCurrentTab] = useState('word')

  // Sample word data
  const wordData = {
    word: 'ephemeral',
    pronunciation: '/ɪˈfɛm(ə)rəl/',
    partOfSpeech: 'adjective',
    definition: 'Lasting for a very short time; transitory; fleeting.',
    example:
      'The ephemeral nature of political alliances makes long-term planning difficult.',
    category: 'Politics',
    newsHeadline:
      'New Climate Accord Shows Ephemeral Nature of International Agreements',
    newsSource: 'The Global Times',
    newsUrl: '#',
  }

  return (
    <div
      className='w-full h-full bg-base-100 flex flex-col'
      style={{ width: '400px', height: '600px' }}
    >
      {/* Header with logo */}
      <div className='navbar bg-primary text-primary-content'>
        {/*<div className='flex-1'>*/}
        {/*  <div className='text-xl font-bold tracking-wide'>*/}
        {/*    <span>T R E N</span>*/}
        {/*    <br />*/}
        {/*    <span>D W O R</span>*/}
        {/*    <br />*/}
        {/*    <span>D</span>*/}
        {/*  </div>*/}
        {/*</div>*/}
        <div className='flex-none'>
          <button className='btn btn-square btn-ghost'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              className='inline-block w-5 h-5 stroke-current'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z'
              ></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className='flex-grow overflow-auto p-4'>
        {/* Word card */}
        <div className='card bg-base-200 mb-4'>
          <div className='card-body'>
            <div className='flex justify-between items-start'>
              <div>
                <h2 className='card-title text-3xl font-bold'>
                  {wordData.word}
                </h2>
                <div className='text-sm opacity-70 mt-1'>
                  {wordData.pronunciation} • {wordData.partOfSpeech}
                </div>
              </div>
              <button className='btn btn-circle btn-sm'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  className='inline-block w-4 h-4 stroke-current'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M8 9l4-4 4 4m0 6l-4 4-4-4'
                  ></path>
                </svg>
              </button>
            </div>

            <div className='divider my-2'></div>

            <div>
              <h3 className='font-semibold'>Definition</h3>
              <p className='mt-1'>{wordData.definition}</p>
            </div>

            <div className='mt-3'>
              <h3 className='font-semibold'>Example</h3>
              <p className='mt-1 italic'>{wordData.example}</p>
            </div>
          </div>
        </div>

        {/* News context card */}
        <div className='card bg-container'>
          <div className='card-body'>
            <div className='flex items-center gap-2'>
              <div className='bg-primary text-primary-content rounded-lg px-4 py-2'>
                {wordData.category}
              </div>
              <h3 className='font-semibold'>Trending Context</h3>
            </div>

            <div className='mt-2'>
              <a
                href={wordData.newsUrl}
                className='link link-hover font-medium'
              >
                {wordData.newsHeadline}
              </a>
              <div className='text-sm opacity-70 mt-1'>
                Source: {wordData.newsSource}
              </div>
            </div>

            <div className='card-actions justify-end mt-2'>
              <button className='btn btn-primary btn-sm'>Read More</button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className='btm-nav bg-base-300'>
        <button
          className={currentTab === 'word' ? 'active' : ''}
          onClick={() => setCurrentTab('word')}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
            />
          </svg>
          <span className='btm-nav-label'>Today</span>
        </button>

        <button
          className={currentTab === 'history' ? 'active' : ''}
          onClick={() => setCurrentTab('history')}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span className='btm-nav-label'>History</span>
        </button>

        <button
          className={currentTab === 'settings' ? 'active' : ''}
          onClick={() => setCurrentTab('settings')}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
            />
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
            />
          </svg>
          <span className='btm-nav-label'>Settings</span>
        </button>
      </div>
    </div>
  )
}

export default TrendWordApp
