import express from 'express'
import { randomBytes } from 'node:crypto'
import { Valkey } from 'iovalkey'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const { PORT = 3000, S3_BUCKET, VALKEY_URL = 'redis://localhost:6379', VALKEY_PASSWORD } = process.env
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? 100 * 1024 * 1024)
const PENDING_TTL = 60 * 60 // sekundy

// bez kolejki offline zapytania od razu dostają błąd, kiedy Valkey nie działa, zamiast wisieć
const valkey = new Valkey(VALKEY_URL, { password: VALKEY_PASSWORD, enableOfflineQueue: false })
valkey.on('error', err => console.error('valkey:', err.message))

// domyślnie SDK dopisuje do URL-a sumę kontrolną pustego body i upload z przeglądarki się nie udaje
const s3 = new S3Client({ requestChecksumCalculation: 'WHEN_REQUIRED' })

function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

function secondsFromNow(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

const app = express()
app.use(express.json())

app.get('/healthz', (req, res) => res.send('ok'))

app.get('/ready', async (req, res) => {
  try {
    await valkey.ping()
    res.send('ok')
  } catch {
    sendError(res, 503, 'VALKEY_UNAVAILABLE', 'Brak połączenia z Valkey')
  }
})

app.post('/api/files', async (req, res) => {
  const { filename, contentType, size } = req.body ?? {}

  const validFilename = typeof filename === 'string' && filename.length > 0 && filename.length <= 255
  const validSize = Number.isInteger(size) && size > 0
  if (!validFilename || !validSize) {
    return sendError(res, 400, 'INVALID_REQUEST', 'Wymagane pola: filename (tekst) i size (liczba bajtów)')
  }
  if (size > MAX_FILE_SIZE) {
    return sendError(res, 413, 'FILE_TOO_LARGE', `Plik może mieć najwyżej ${MAX_FILE_SIZE / 1024 / 1024} MB`)
  }

  const code = randomBytes(6).toString('base64url') // 8 znaków
  const file = {
    filename,
    contentType: contentType || 'application/octet-stream',
    size,
    s3Key: `files/${code}`,
    status: 'pending',
    expiresAt: secondsFromNow(PENDING_TTL),
  }
  await valkey.set(`file:${code}`, JSON.stringify(file), 'EX', PENDING_TTL)

  const upload = new PutObjectCommand({ Bucket: S3_BUCKET, Key: file.s3Key })
  const uploadUrl = await getSignedUrl(s3, upload, { expiresIn: PENDING_TTL })

  res.status(201).json({ code, uploadUrl })
})

// błędy rzucone w handlerach async trafiają tutaj same (Express 5)
app.use((err, req, res, next) => {
  if (err.status < 500) {
    // np. niepoprawny JSON z express.json()
    return sendError(res, err.status, 'INVALID_REQUEST', 'Niepoprawne zapytanie')
  }
  console.error(err)
  sendError(res, 500, 'INTERNAL_ERROR', 'Błąd serwera')
})

app.listen(PORT, () => console.log(`backend na porcie ${PORT}`))
