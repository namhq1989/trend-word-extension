import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet.tsx'
import { useState } from 'react'
import { Menu, MoonStar } from 'lucide-react'
import { Switch } from '@/components/ui/switch.tsx'
import { useTheme } from '@/components/theme/theme.tsx'
import { Separator } from '@/components/ui/separator.tsx'

const side = 'left'

const AppMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { setTheme, theme } = useTheme()

  return (
    <Sheet key={side} open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger>
        <Menu className='cursor-pointer' />
      </SheetTrigger>
      <SheetContent side={side} className='p-0 scrollbar-hide overflow-auto'>
        <div className='flex flex-col gap-1 p-2 mt-16'>
          <div className='flex flex-row items-center justify-between cursor-pointer rounded-xl hover:container-selected p-4'>
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
          <Separator className='w-[90%] mt-4 self-center' />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default AppMenu
