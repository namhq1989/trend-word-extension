import { Router } from 'react-chrome-extension-router'
import HomeScreen from '@/resources/screens/home-screen.tsx'
import { ThemeProvider } from '@/components/theme/theme.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'

const App = () => {
  return (
    <ThemeProvider defaultTheme='dark' storageKey='ui-theme'>
      <Toaster />
      <Router>
        <HomeScreen />
      </Router>
    </ThemeProvider>
  )
}

export default App
