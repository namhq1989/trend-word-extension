export interface IWordDefinition {
  pos: string
  definition: string
}

export interface IWordNounForm {
  base: string
  plural: string
}

export interface IWordVerbForm {
  base: string
  past: string
  pastParticiple: string
  gerund: string
  presentThirdPerson: string
}
