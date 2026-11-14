import { useEffect, useState } from 'react'
import { getJson } from './api.js'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })
}

export default function Download({ code }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getJson(`/api/files/${code}`)
      .then(setFile)
      .catch(err => setError(err.message))
  }, [code])

  if (error) return <p role="alert">{error}</p>
  if (!file) return <p>Wczytywanie…</p>

  return (
    <section>
      <h2>{file.filename}</h2>
      <p>
        {formatSize(file.size)}, dostępny do {formatDate(file.expiresAt)}
      </p>
      <a href={file.downloadUrl}>Pobierz</a>
    </section>
  )
}
