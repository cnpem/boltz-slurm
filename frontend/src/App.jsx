import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import InputView from './components/InputView'
import ResultsView from './components/ResultsView'
import LoadingView from './components/LoadingView'
import LandingPage from './components/LandingPage'

function App() {
  const [currentView, setCurrentView] = useState('landing')
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

  const handleGetStarted = () => {
    setCurrentView('input')
  }

  const handleHome = () => {
    setCurrentView('landing')
    setSelectedJobId(null)
  }

  // Show landing page without header and sidebar
  if (currentView === 'landing') {
    return <LandingPage onGetStarted={handleGetStarted} />
  }

  return (
    <div className="min-h-screen main-container">
      {/* Fixed Header */}
      <Header />
      
      {/* Fixed Sidebar */}
      <Sidebar 
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectJob={selectJob}
        onNewJob={() => showView('input')}
        onRefreshJobs={loadJobs}
        onHome={handleHome}
      />

      {/* Main Content with margins to account for fixed header and sidebar */}
      <div className="ml-96 pt-20 min-h-screen flex flex-col">
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
