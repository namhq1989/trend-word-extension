interface IHeaderTitleProps {
  title: string
}

const HeaderTitle = (props: IHeaderTitleProps) => {
  return (
    <div className='flex flex-row gap-4 justify-center'>
      <h2 className='text-base font-bold tracking-wide'>{props.title}</h2>
    </div>
  )
}

export default HeaderTitle
