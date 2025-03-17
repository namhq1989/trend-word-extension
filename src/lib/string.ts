const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then()
}

const getDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch (error) {
    console.error('Invalid URL:', error)
    return ''
  }
}

const capitalizeString = (str: string): string => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const removePeriodFromEnd = (sentence: string): string => {
  if (!sentence) return sentence

  if (sentence.endsWith('.')) {
    return sentence.slice(0, -1)
  }
  return sentence
}

export {
  copyToClipboard,
  getDomainFromUrl,
  capitalizeString,
  removePeriodFromEnd,
}
