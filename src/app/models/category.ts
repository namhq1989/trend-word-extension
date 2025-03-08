export interface ICategory {
  id: string
  name: string
  isSelected: boolean
}

const categories : ICategory[] = [
  { id: 'politics', name: 'Politics', isSelected: false },
  { id: 'technology', name: 'Technology', isSelected: false },
  { id: 'business', name: 'Business', isSelected: false },
  { id: 'science', name: 'Science', isSelected: false },
  { id: 'health', name: 'Health', isSelected: false },
  { id: 'sports', name: 'Sports', isSelected: false },
  { id: 'entertainment', name: 'Entertainment', isSelected: false },
  { id: 'world', name: 'World News', isSelected: false },
  { id: 'education', name: 'Education', isSelected: false },
]

export default categories
