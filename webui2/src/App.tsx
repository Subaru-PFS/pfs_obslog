import { HashRouter, } from 'react-router-dom'
import { RouteEntries } from './routes'


function App() {
  return (
    <HashRouter>
      <RouteEntries />
    </HashRouter>
  )
}

export default App
