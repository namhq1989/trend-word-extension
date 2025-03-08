export interface Language {
  id: string
  name: string
  isSelected: boolean
}

const languages: Language[] = [
  { id: 'en', name: 'English', isSelected: true },
  { id: 'es', name: 'Spanish', isSelected: false },
  { id: 'fr', name: 'French', isSelected: false },
  { id: 'de', name: 'German', isSelected: false },
  { id: 'it', name: 'Italian', isSelected: false },
  { id: 'pt', name: 'Portuguese', isSelected: false },
  { id: 'ru', name: 'Russian', isSelected: false },
  { id: 'zh', name: 'Chinese', isSelected: false },
  { id: 'ja', name: 'Japanese', isSelected: false },
  { id: 'ko', name: 'Korean', isSelected: false },
  { id: 'vi', name: 'Vietnamese', isSelected: false },
]

export default languages
