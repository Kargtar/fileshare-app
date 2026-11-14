import { useActionState } from 'react'
import { postJson } from './api.js'

async function uploadFile(file) {
  const { code, uploadUrl } = await postJson('/api/files', {
    filename: file.name,
    contentType: file.type,
    size: file.size,
  })

  const response = await fetch(uploadUrl, { method: 'PUT', body: file })
  if (!response.ok) throw new Error('Nie udało się wysłać pliku')

  await postJson(`/api/files/${code}/complete`)
  return code
}

async function handleUpload(previousState, formData) {
  try {
    const code = await uploadFile(formData.get('file'))
    return { link: `${window.location.origin}/d/${code}` }
  } catch (err) {
    return { error: err.message }
  }
}

export default function Upload() {
  const [result, formAction, isPending] = useActionState(handleUpload, null)

  return (
    <form action={formAction}>
      <input type="file" name="file" required />
      <button disabled={isPending}>{isPending ? 'Wysyłanie…' : 'Wyślij'}</button>

      {result?.link && (
        <p>
          Link ważny 7 dni: <a href={result.link}>{result.link}</a>
        </p>
      )}
      {result?.error && <p role="alert">{result.error}</p>}
    </form>
  )
}
