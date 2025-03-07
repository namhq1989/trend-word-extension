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
}

const MenuItem = (props: IMenuItemProps) => {
  const { icon: Icon, title } = props

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon size={20} className='cursor-pointer' onClick={props.onClick} />
        </TooltipTrigger>
        <TooltipContent>{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default MenuItem
