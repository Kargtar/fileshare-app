import Upload from './Upload.jsx'
import Download from './Download.jsx'

const path = window.location.pathname
const downloadCode = path.startsWith('/d/') ? path.slice('/d/'.length) : null

// SHA commita wstawiane przez CI przy budowie obrazu, lokalnie 'dev'
const version = import.meta.env.VITE_VERSION ?? 'dev'

export default function App() {
  return (
    <main>
      <h1>
        <a href="/">fileshare</a>
      </h1>
      {downloadCode ? <Download code={downloadCode} /> : <Upload />}
      <footer>
        wersja{' '}
        <a href={`https://github.com/Kargtar/fileshare-app/commit/${version}`}>{version.slice(0, 7)}</a>
      </footer>
    </main>
  )
}
