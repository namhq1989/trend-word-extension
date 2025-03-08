import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'

const CategoryFilter = () => {
  return (
    <Select>
      <SelectTrigger className='w-[160px]'>
        <SelectValue placeholder='Category' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value='all'>All</SelectItem>
          <SelectItem value='politics'>Politics</SelectItem>
          <SelectItem value='technology'>Technology</SelectItem>
          <SelectItem value='business'>Business</SelectItem>
          <SelectItem value='science'>Science</SelectItem>
          <SelectItem value='health'>Health</SelectItem>
          <SelectItem value='sports'>Sports</SelectItem>
          <SelectItem value='entertainment'>Entertainment</SelectItem>
          <SelectItem value='world'>World News</SelectItem>
          <SelectItem value='education'>Education</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export default CategoryFilter
