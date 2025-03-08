import { Bookmark, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { Separator } from '@/components/ui/separator.tsx'

const WordListItem = () => {
  return (
    <div className='flex flex-col bg-container p-4 gap-2'>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl text-primary font-bold cursor-pointer'>
          emergency
        </h2>
        <Bookmark
          size={24}
          className='text-muted-foreground cursor-pointer'
          fill='var(--primary)'
          color='var(--primary)'
        />
      </div>
      <div className='flex flex-row gap-1'>
        <Badge variant='secondary'>intermediate</Badge>
        <Badge variant='accent'>noun</Badge>
      </div>
      <p className='text-sm mt-2'>
        something dangerous or serious, such as an accident, that happens
        suddenly or unexpectedly and needs fast action in order to avoid harmful
        results
      </p>
      <Separator className='bg-foreground/10 my-2' />
      <div className='flex justify-between items-center'>
        <div className='flex flex-shrink-0 gap-2 items-center text-muted-foreground'>
          <p>Sports</p>
          <p>•</p>
          <a
            href='https://google.com.vn'
            target='_blank'
            className='underline underline-offset-2'
          >
            Source
          </a>
          <p>•</p>
          <p>15/02/2025</p>
        </div>
        <div className='flex w-5 h-5 items-center justify-center text-muted-foreground cursor-pointer'>
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  )
}

export default WordListItem
