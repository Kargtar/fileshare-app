import express from 'express'
import Valkey from 'iovalkey'

const { PORT = 3000, VALKEY_URL = 'redis://localhost:6379', VALKEY_PASSWORD } = process.env

// bez kolejki offline zapytania od razu dostają błąd, kiedy Valkey nie działa, zamiast wisieć
const valkey = new Valkey(VALKEY_URL, { password: VALKEY_PASSWORD, enableOfflineQueue: false })
valkey.on('error', err => console.error('valkey:', err.message))

const app = express()
app.use(express.json())

app.get('/healthz', (req, res) => res.send('ok'))

app.get('/ready', async (req, res) => {
  try {
    await valkey.ping()
    res.send('ok')
  } catch {
    res.status(503).json({ error: { code: 'VALKEY_UNAVAILABLE', message: 'Brak połączenia z Valkey' } })
  }
})

app.listen(PORT, () => console.log(`backend na porcie ${PORT}`))
