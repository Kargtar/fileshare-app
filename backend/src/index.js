import express from 'express'

const app = express()
app.use(express.json())

app.get('/healthz', (req, res) => res.send('ok'))

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`backend na porcie ${port}`))
