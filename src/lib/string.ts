const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then()
}

export { copyToClipboard }
