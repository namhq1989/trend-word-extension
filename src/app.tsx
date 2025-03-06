import { Router } from 'react-chrome-extension-router'
import HomeScreen from '@/resources/screens/home-screen.tsx'

const App = () => {
  return (
    <Router>
      <HomeScreen />
    </Router>
  )
}

export default App
