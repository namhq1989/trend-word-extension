import { goBack } from 'react-chrome-extension-router'
import { ArrowLeft } from 'lucide-react'

const BackButton = () => {
  return <ArrowLeft className='cursor-pointer' onClick={() => goBack()} />
}

export default BackButton
