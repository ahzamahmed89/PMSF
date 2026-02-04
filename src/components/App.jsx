import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './Home'
import DataManager from './DataManager'
import EntryModule from './EntryModule'
import PMSFForm from './PMSFForm'
import ViewModule from './ViewModule'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/data-manager" element={<DataManager />} />
          <Route path="/entry-module" element={<EntryModule />} />
          <Route path="/pmsf-form" element={<PMSFForm />} />
          <Route path="/view-module" element={<ViewModule />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
