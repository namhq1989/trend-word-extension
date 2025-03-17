const formatDateToDDMMYYYY = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return '-'
    }

    const day = date.getDate()
    const month = date.getMonth() + 1 // getMonth() returns 0-11
    const year = date.getFullYear()

    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')

    return `${formattedDay}/${formattedMonth}/${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return '-'
  }
}

export { formatDateToDDMMYYYY }
