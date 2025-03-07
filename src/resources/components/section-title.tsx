interface ISectionTitleProps {
  title: string
}

const SectionTitle = (props: ISectionTitleProps) => {
  return <h2 className='text-base font-bold tracking-wide'>{props.title}</h2>
}

export default SectionTitle
