import { useCallback, useRef } from 'react'

/**
 * Custom hook to handle audio playback with prevention of multiple simultaneous playbacks
 * @returns A function to play audio by ID
 */
export const useAudioPlayer = () => {
  // Keep a reference to the current audio being played
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const playAudio = useCallback((audioId: string) => {
    if (!audioId) return

    // If there's already an audio playing, stop it
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    const audioUrl = `${import.meta.env.VITE_CDN_ENDPOINT}/${audioId}.mp3`
    const audio = new Audio(audioUrl)
    
    // Update the ref to point to the new audio
    audioRef.current = audio
    
    // Play the new audio
    audio.play().catch((error) => {
      console.error('Error playing audio:', error)
    })
    
    // Clean up the reference after audio finishes
    audio.onended = () => {
      audioRef.current = null
    }
  }, [])

  return { playAudio }
}
