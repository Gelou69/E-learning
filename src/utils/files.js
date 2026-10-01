function readFile(file, as) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', () => reject(new Error('Could not read that file.')))
    if (as === 'text') reader.readAsText(file)
    else reader.readAsDataURL(file)
  })
}

export function readFileAsDataUrl(file) {
  return readFile(file, 'dataUrl')
}

export function readFileAsText(file) {
  return readFile(file, 'text')
}

/** Read a generated Blob as a data URL so it can be uploaded to Storage. */
export function blobToDataUrl(blob) {
  return readFile(new Blob([blob], { type: blob.type || 'application/pdf' }), 'dataUrl')
}

export function downloadBlobUrl(url, filename) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function pageCountFromPdfText(text) {
  const matches = text.match(/\/Type\s*\/Page[^s]/g)
  if (matches?.length) return matches.length
  const countMatch = text.match(/\/Count\s+(\d+)/)
  return countMatch ? Number(countMatch[1]) : 1
}
