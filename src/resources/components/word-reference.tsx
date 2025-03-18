import SectionTitle from '@/resources/components/section-title.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { IWordNews } from '@/app/models/word-news.ts'
import {
  capitalizeString,
  getDomainFromUrl,
  removePeriodFromEnd,
} from '@/lib/string.ts'
import { formatDateToDDMMYYYY } from '@/lib/date.ts'

interface IWordReferenceProps {
  news: IWordNews | null
}

const WordReference = ({ news }: IWordReferenceProps) => {
  if (!news) {
    return null
  }

  return (
    <div className='flex flex-col p-4 gap-2'>
      <SectionTitle title='Reference' />
      <div className='flex flex-col gap-2 bg-container p-4'>
        {news.categories.map((c, index) => {
          return (
            <Badge key={`news-category-${index}`} variant='secondary'>
              {capitalizeString(c)}
            </Badge>
          )
        })}
        <h4 className='text-lg font-bold'>{news.title}</h4>

        <div className='flex items-center gap-2'>
          <a
            href={news.sourceUrl}
            target='_blank'
            className='underline underline-offset-2 text-sm text-muted-foreground inline-block w-auto max-w-fit'
          >
            {getDomainFromUrl(news.sourceUrl)}
          </a>
          <span>•</span>
          <span className='text-sm text-muted-foreground'>
            {formatDateToDDMMYYYY(news.publishedAt)}
          </span>
        </div>
        <img
          src={news.imageUrl}
          alt={news.title}
          className='w-full h-[180px] rounded-xl my-1'
        />
        <p className='text-sm'>{removePeriodFromEnd(news.summary)}</p>
      </div>
    </div>
  )
}

export default WordReference
