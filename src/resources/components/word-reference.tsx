import SectionTitle from '@/resources/components/section-title.tsx'
import { Badge } from '@/components/ui/badge.tsx'

const WordReference = () => {
  return (
    <div className='flex flex-col p-4 gap-2'>
      <SectionTitle title='Reference' />
      <div className='flex flex-col gap-2 bg-container p-4'>
        <Badge variant='secondary' className='mb-2'>
          Sports
        </Badge>

        <h4 className='text-lg font-bold'>
          Eastleigh improve play-off prospects with home defeat of bottom club
          Ebbsfleet
        </h4>

        <a
          href='https://google.com.vn'
          target='_blank'
          className='underline underline-offset-2 text-sm text-muted-foreground inline-block w-auto max-w-fit'
        >
          LiveScore
        </a>

        <p className='text-sm mt-2'>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Penatibus
          primis tempus porta conubia ultricies luctus eleifend justo. Auctor
          dolor conubia lacus turpis nostra duis lobortis egestas. Justo felis
          morbi pretium euismod laoreet sit eleifend pharetra
        </p>
      </div>
    </div>
  )
}

export default WordReference
