import useHttpStore from '@/core/http.ts'
import { IWord } from '@/app/models/word.ts'
import { DifficultyLevel } from '@/core/storage.ts'

export interface INewWordApiRequest {
  level?: DifficultyLevel
  categories?: string[]
}

export interface INewWordApiResponse {
  word: IWord
}

export const fetchNewWordApi = async (
  req: INewWordApiRequest,
): Promise<IWord> => {
  const response = await useHttpStore
    .getState()
    .get<INewWordApiResponse>('api/word/new', req as object)
  return response.word
}
