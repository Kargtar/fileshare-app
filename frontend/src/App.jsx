import Upload from './Upload.jsx'
import Download from './Download.jsx'

const path = window.location.pathname
const downloadCode = path.startsWith('/d/') ? path.slice('/d/'.length) : null

export default function App() {
  return (
    <main>
      <h1>
        <a href="/">fileshare</a>
      </h1>
      {downloadCode ? <Download code={downloadCode} /> : <Upload />}
    </main>
  )
}
