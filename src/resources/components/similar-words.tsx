import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import SectionTitle from '@/resources/components/section-title.tsx'
import { Badge } from '@/components/ui/badge.tsx'

const SimilarWords = () => {
  return (
    <div className='flex flex-col gap-2 mt-2 mb-4'>
      <SectionTitle title='Similar Words' className='ml-4' />
      <Carousel
        orientation='horizontal'
        opts={{
          align: 'start',
          dragFree: true,
        }}
        className='w-full'
      >
        <CarouselContent>
          <CarouselItem className='basis-1/2 flex items-center justify-center ml-4'>
            <div className='flex flex-col gap-2 bg-container p-4'>
              <p className='text-base font-bold cursor-pointer'>intensity</p>
              <Badge variant='accent'>noun</Badge>
              <p className='italic'>
                Would you like me to suggest any other variations or more
                specific options for your application?
              </p>
            </div>
          </CarouselItem>
          <CarouselItem className='basis-1/2 flex items-center justify-center'>
            <div className='flex flex-col gap-2 bg-container p-4'>
              <p className='text-base font-bold cursor-pointer'>intensity</p>
              <Badge variant='accent'>noun</Badge>
              <p className='italic'>
                Would you like me to suggest any other variations or more
                specific options for your application?
              </p>
            </div>
          </CarouselItem>
          <CarouselItem className='basis-1/2 flex items-center justify-center'>
            <div className='flex flex-col gap-2 bg-container p-4'>
              <p className='text-base font-bold cursor-pointer'>intensity</p>
              <Badge variant='accent'>noun</Badge>
              <p className='italic'>
                Would you like me to suggest any other variations or more
                specific options for your application?
              </p>
            </div>
          </CarouselItem>
          <CarouselItem className='basis-1/2 flex items-center justify-center'>
            <div className='flex flex-col gap-2 bg-container p-4'>
              <p className='text-base font-bold cursor-pointer'>intensity</p>
              <Badge variant='accent'>noun</Badge>
              <p className='italic'>
                Would you like me to suggest any other variations or more
                specific options for your application?
              </p>
            </div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    </div>
  )
}

export default SimilarWords
