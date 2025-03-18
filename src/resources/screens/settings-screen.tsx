import BackButton from '@/resources/components/back-button.tsx'
import HeaderTitle from '@/resources/components/header-title.tsx'
import SectionTitle from '@/resources/components/section-title.tsx'
import useDataControllerStore from '@/app/controllers/data-controller.ts'
import { Button } from '@/components/ui/button.tsx'
import { useEffect } from 'react'
import {
  Bell,
  Code,
  Gem,
  Hash,
  Heart,
  Info,
  MessageSquareCode,
  MoonStar,
  Shell,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch.tsx'
import { useTheme } from '@/components/theme/theme.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input.tsx'
import { copyToClipboard } from '@/lib/string.ts'
import useNotificationStore from '@/core/notification.ts'
import { DifficultyLevel, NotificationFrequency } from '@/core/storage.ts'

const SettingsScreen = () => {
  const { setTheme, theme } = useTheme()
  const {
    categories,
    getCategories,
    toggleCategory,
    difficultyLevel,
    getDifficultyLevel,
    setDifficultyLevel,
    notificationFrequency,
    getNotificationFrequency,
    setNotificationFrequency,
    maxWordsPerDay,
    getMaxWordsPerDay,
    setMaxWordsPerDay,
  } = useDataControllerStore()
  const { showSuccessNotification } = useNotificationStore()

  useEffect(() => {
    const fetchData = async () => {
      await getCategories()
      await getDifficultyLevel()
      await getNotificationFrequency()
      await getMaxWordsPerDay()
    }

    fetchData().then()
  }, [
    getCategories,
    getDifficultyLevel,
    getNotificationFrequency,
    getMaxWordsPerDay,
  ])

  const handleLevelChange = (value: string) => {
    setDifficultyLevel(value as DifficultyLevel).then()
    showSuccessNotification({
      description: `Difficulty level set to ${value}`,
    })
  }

  const handleNotificationFrequencyChange = (value: string) => {
    setNotificationFrequency(value as NotificationFrequency).then()

    let message = 'Notifications disabled'
    if (value !== '-') {
      message = `Notifications will be sent every ${value} hour${value !== '1' ? 's' : ''}`
    }

    showSuccessNotification({
      description: message,
    })
  }

  const handleMaxWordsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value)
    if (isNaN(value) || value < 5) return

    setMaxWordsPerDay(value).then()
    showSuccessNotification({
      description: `Max words per day set to ${value}`,
    })
  }

  return (
    <div className='flex flex-col w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title='Settings' />
      </div>
      <div className='flex flex-col p-4 gap-8'>
        {/*Account*/}
        <div className='flex flex-col gap-2'>
          <SectionTitle title='Account' />
          <div className='flex flex-col gap-2'>
            <div className='flex bg-container p-4 justify-between items-center'>
              <div className='flex flex-row gap-2 items-center justify-center'>
                <Gem size={20} className='text-muted-foreground' />
                <p className='text-sm text-foreground'>Subscription</p>
              </div>
              <p className='text-sm text-foreground'>Free</p>
            </div>
            <div className='flex bg-container p-4 justify-between items-center'>
              <div className='flex flex-row gap-2 items-center justify-center'>
                <Shell size={20} className='text-muted-foreground' />
                <p className='text-sm text-foreground'>Account ID</p>
              </div>
              <p
                className='text-sm text-foreground cursor-pointer'
                onClick={() => {
                  copyToClipboard('2RbWzbtRX8zUEa84')
                  showSuccessNotification({
                    description: 'Account ID copied to clipboard',
                  })
                }}
              >
                2RbWzbtRX8zUEa84
              </p>
            </div>
          </div>
        </div>
        {/*Customization*/}
        <div className='flex flex-col gap-2'>
          <SectionTitle title='Customization' />
          <div className='flex flex-col gap-2'>
            <div className='flex bg-container p-4 justify-between items-center'>
              <div className='flex flex-row gap-2 items-center justify-center'>
                <Code size={20} className='text-muted-foreground' />
                <p className='text-sm text-foreground'>Difficulty level</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} className='text-muted-foreground' />
                    </TooltipTrigger>
                    <TooltipContent className='w-[250px] p-4'>
                      <p className='text-sm'>
                        Higher difficulty levels include words from all previous
                        levels, expanding your vocabulary range as you progress
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={difficultyLevel} onValueChange={handleLevelChange}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Select a level' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Level</SelectLabel>
                    <SelectItem value='beginner'>Beginner</SelectItem>
                    <SelectItem value='intermediate'>Intermediate</SelectItem>
                    <SelectItem value='advanced'>Advanced</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className='flex bg-container p-4 justify-between items-center'>
              <div className='flex flex-row gap-2 items-center justify-center'>
                <Hash size={20} className='text-muted-foreground' />
                <p className='text-sm text-foreground'>Max words per day</p>
              </div>
              <Input
                type='number'
                value={maxWordsPerDay}
                onChange={handleMaxWordsChange}
                min={5}
                className='w-[140px]'
              />
            </div>
            <div className='flex bg-container p-4 justify-between items-center'>
              <div className='flex flex-row gap-2 items-center justify-center'>
                <Bell size={20} className='text-muted-foreground' />
                <p className='text-sm text-foreground'>
                  Notification frequency
                </p>
              </div>
              <Select
                value={notificationFrequency}
                onValueChange={handleNotificationFrequencyChange}
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Select frequency' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Receive notifications</SelectLabel>
                    <SelectItem value='1'>Every 1h</SelectItem>
                    <SelectItem value='2'>Every 2h</SelectItem>
                    <SelectItem value='3'>Every 3h</SelectItem>
                    <SelectItem value='-'>Never</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
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
              <div className='flex flex-row gap-2 items-center justify-center'>
                <MoonStar size={20} className='text-muted-foreground' />
                <p className='text-sm text-foreground'>Dark mode</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => {
                  setTheme(checked ? 'dark' : 'light')
                }}
              />
            </div>
            {/*<div className='flex bg-container p-4 justify-between items-center'>*/}
            {/*  <div className='flex flex-row gap-2 items-center justify-center'>*/}
            {/*    <Languages size={20} className='text-muted-foreground' />*/}
            {/*    <p className='text-sm text-foreground'>Translate to</p>*/}
            {/*  </div>*/}
            {/*  <TranslateToSheet />*/}
            {/*</div>*/}
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
            <div className='flex flex-col gap-4 mt-4 px-2'>
              <div className='flex gap-2 items-center cursor-pointer'>
                <MessageSquareCode size={16} className='text-primary' />
                <span className='text-sm text-primary'>Send feedback</span>
              </div>
              <div className='flex gap-2 items-center cursor-pointer'>
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
