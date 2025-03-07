import BackButton from '@/resources/components/back-button.tsx'
import HeaderTitle from '@/resources/components/header-title.tsx'
import SectionTitle from '@/resources/components/section-title.tsx'
import useDataControllerStore from '@/app/controllers/data-controller.ts'
import { Button } from '@/components/ui/button.tsx'
import { useEffect } from 'react'
import {
  ChevronRight,
  Heart,
  Languages,
  MessageSquareCode,
  MoonStar,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch.tsx'
import { useTheme } from '@/components/theme/theme.tsx'

const SettingsScreen = () => {
  const { setTheme, theme } = useTheme()
  const { categories, getCategories, toggleCategory } = useDataControllerStore()

  useEffect(() => {
    const fetchData = async () => {
      await getCategories()
    }

    fetchData().then()
  }, [getCategories])

  return (
    <div className='flex flex-col w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title='Settings' />
      </div>
      <div className='flex flex-col p-4 gap-8'>
        {/*Categories*/}
        <div className='flex flex-col gap-2'>
          <SectionTitle title='Categories' />
          <div className='grid grid-cols-3 gap-2'>
            {categories.length === 0 && (
              <div className='col-span-3 flex items-center justify-center'>
                <p className='text-sm text-muted-foreground'>No categories</p>
              </div>
            )}
            {categories.map((category) => (
              <div key={category.id} className='h-10'>
                <Button
                  variant={category.isSelected ? 'default' : 'outline'}
                  className='w-full h-full cursor-pointer justify-start text-xs'
                  onClick={() => toggleCategory(category.id)}
                >
                  {category.name}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/*Appearances*/}
        <div className='flex flex-col gap-2'>
          <SectionTitle title='Appearances' />
          <div className='flex flex-col gap-2'>
            <div className='flex bg-container p-4 justify-between items-center'>
              <div className='flex flex-row gap-4 items-center justify-center'>
                <MoonStar size={20} className='text-muted-foreground' />
                <p className='text-sm text-foreground'>Dark mode</p>
              </div>
              <Switch
                defaultChecked={theme === 'dark'}
                onCheckedChange={(checked) => {
                  setTheme(checked ? 'dark' : 'light')
                }}
              />
            </div>
            <div className='flex bg-container p-4 justify-between items-center'>
              <div className='flex flex-row gap-4 items-center justify-center'>
                <Languages size={20} className='text-muted-foreground' />
                <p className='text-sm text-foreground'>Translate to</p>
              </div>
              <div className='flex flex-row gap-2 items-center justify-center cursor-pointer'>
                <p className='text-sm text-foreground'>English</p>
                <ChevronRight size={20} className='text-muted-foreground' />
              </div>
            </div>
          </div>
        </div>

        {/*About*/}
        <div className='flex flex-col gap-2'>
          <SectionTitle title='About' />
          <div className='flex flex-col gap-2'>
            <div className='flex bg-container p-4 justify-between items-center'>
              <p className='text-sm'>
                <span className='font-bold'>WordDrop</span> - Expand your
                vocabulary daily with words from trending news stories!
              </p>
            </div>
            <div className='flex bg-container p-4 justify-between items-center'>
              <p className='text-sm'>Version</p>
              <p className='text-sm'>1.0.0</p>
            </div>
            <div className='flex flex-col gap-2 mt-4 px-2'>
              <div className='flex gap-1 items-center cursor-pointer'>
                <MessageSquareCode size={16} className='text-primary' />
                <span className='text-sm text-primary'>Send feedback</span>
              </div>
              <div className='flex gap-1 items-center cursor-pointer'>
                <Heart size={16} className='text-primary' />
                <span className='text-sm text-primary'>Rate extension</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsScreen
