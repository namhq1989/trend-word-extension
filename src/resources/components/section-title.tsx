import { cn } from '@/lib/utils.ts'

interface ISectionTitleProps {
  title: string
  className?: string
}

const SectionTitle = (props: ISectionTitleProps) => {
  return (
    <h2 className={cn('text-base font-bold tracking-wide', props.className)}>
      {props.title}
    </h2>
  )
}

export default SectionTitle
