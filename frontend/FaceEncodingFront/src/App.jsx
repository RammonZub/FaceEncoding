import './App.css'
import { Route } from 'react-router-dom'
import { BrowserRouter, Routes } from 'react-router-dom'
import VideoStream from './components/StreamVideo'

function App() {

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<VideoStream />} />
        

      </Routes>
    </BrowserRouter>
  )
}

export default App
