import { useState, useEffect } from 'react'
import { Trophy } from 'lucide-react'

interface TotalPointsDisplayProps {
  className?: string
}

const TotalPointsDisplay = ({ className = '' }: TotalPointsDisplayProps) => {
  const [totalPoints, setTotalPoints] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchTotalPoints = async () => {
      try {
        const result = await new Promise<{ totalGamePoints?: number }>(
          (resolve) => {
            chrome.storage.local.get(['totalGamePoints'], (items) => {
              resolve(items)
            })
          },
        )

        setTotalPoints(result.totalGamePoints || 0)
      } catch (error) {
        console.error('Error fetching total points:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTotalPoints()
  }, [])

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Trophy size={14} className='text-yellow-500' />
      <span className='font-semibold'>{loading ? '...' : totalPoints}</span>
    </div>
  )
}

export default TotalPointsDisplay
