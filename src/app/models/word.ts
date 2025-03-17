import {
  IWordDefinition,
  IWordNounForm,
  IWordVerbForm,
} from '@/app/models/word-data.ts'
import { IWordExample } from '@/app/models/word-example.ts'
import { IWordNews } from '@/app/models/word-news.ts'

export interface IWord {
  id: string
  word: string
  level: string
  definitions: IWordDefinition[]
  partsOfSpeech: string[]
  ipa: string
  nounForm: IWordNounForm | null
  verbForm: IWordVerbForm | null
  examples: IWordExample[]
  news: IWordNews[]
}
