import { Router } from 'react-chrome-extension-router'
import HomeScreen from '@/resources/screens/home-screen.tsx'
import { ThemeProvider } from '@/components/theme/theme.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import useWordControllerStore from './app/controllers/word-controller'

chrome.storage.local.set(
  {
    env: import.meta.env.VITE_ENV,
    apiHost: import.meta.env.VITE_API_HOST,
  },
  () => {
    // console.log('API host saved to storage')
  },
)

chrome.runtime.onMessage.addListener(function (message) {
  if (message.action === 'initialSetupStarted') {
    // Show loading UI
    // console.log('Setup started, showing loading state')
    // Code to update UI to show loading state
  } else if (message.action === 'initialSetupCompleted') {
    if (message.word) {
      useWordControllerStore.getState().updateWord(message.word)
    }
  }
})

const App = () => {
  chrome.runtime.sendMessage(
    { action: 'checkFirstPopupOpen' },
    function (response) {
      if (response && response.success) {
        if (response.needsSetup) {
          // Show loading UI while initial words are being fetched
          // console.log('Initial setup needed, showing loading UI')
          // You would add code here to show a loading spinner or message
        }
      }
    },
  )

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
