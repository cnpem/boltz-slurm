import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import InputView from './components/InputView'
import ResultsView from './components/ResultsView'
import LoadingView from './components/LoadingView'

function App() {
  const [currentView, setCurrentView] = useState('input')
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [jobs, setJobs] = useState([])

  // Load jobs on component mount
  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      const data = await response.json()
      setJobs(data.jobs)
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }

  const selectJob = async (jobId) => {
    setSelectedJobId(jobId)
    setCurrentView('results')
  }

  const showView = (viewName) => {
    setCurrentView(viewName)
    if (viewName === 'input') {
      setSelectedJobId(null)
    }
  }

  const handleJobCompleted = (jobId) => {
    // When a job completes in LoadingView, switch to results view
    setSelectedJobId(jobId)
    setCurrentView('results')
    // Also refresh the jobs list
    loadJobs()
  }

  return (
    <div className="min-h-screen main-container flex">
      {/* Sidebar */}
      <Sidebar 
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectJob={selectJob}
        onNewJob={() => showView('input')}
        onRefreshJobs={loadJobs}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {currentView === 'input' && (
          <InputView 
            onJobSubmitted={loadJobs}
            onShowLoading={() => setCurrentView('loading')}
          />
        )}
        
        {currentView === 'results' && (
          <ResultsView 
            jobId={selectedJobId}
            onBackToInput={() => showView('input')}
            onNewJob={() => showView('input')}
          />
        )}
        
        {currentView === 'loading' && (
          <LoadingView 
            onComplete={() => {
              loadJobs()
              setCurrentView('input')
            }}
            onJobCompleted={handleJobCompleted}
          />
        )}
      </div>
    </div>
  )
}

export default App
