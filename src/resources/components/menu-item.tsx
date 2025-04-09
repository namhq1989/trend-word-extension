import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ElementType } from 'react'

interface IMenuItemProps {
  title: string
  icon: ElementType
  onClick: () => void
  indicator?: 'red' | 'green' | 'blue' | 'yellow'
}

const MenuItem = (props: IMenuItemProps) => {
  const { icon: Icon, title, indicator } = props

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Icon size={20} className='cursor-pointer' onClick={props.onClick} />
            {indicator && (
              <div 
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getIndicatorColor(indicator)}`}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Helper function to get the indicator color class
const getIndicatorColor = (color: IMenuItemProps['indicator']) => {
  switch (color) {
    case 'red': return 'bg-red-500'
    case 'green': return 'bg-green-500'
    case 'blue': return 'bg-blue-500'
    case 'yellow': return 'bg-yellow-500'
    default: return ''
  }
}

export default MenuItem
