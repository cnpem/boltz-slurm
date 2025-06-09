import { useState, useEffect } from 'react'

const LoadingView = ({ onComplete, onJobCompleted }) => {
  const [submittedJobId, setSubmittedJobId] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)

  useEffect(() => {
    // Start polling for the most recent job
    const startPolling = () => {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/jobs')
          const data = await response.json()
          
          if (data.jobs && data.jobs.length > 0) {
            // Get the most recent job (first in the array)
            const latestJob = data.jobs[0]
            
            // If we haven't set a submitted job ID yet, use the latest one
            if (!submittedJobId) {
              setSubmittedJobId(latestJob.job_id)
            }
            
            // Check if our job is completed
            if (submittedJobId && latestJob.job_id === submittedJobId) {
              if (latestJob.status === 'completed') {
                clearInterval(interval)
                setPollingInterval(null)
                // Call the callback to switch to results view with this job
                if (onJobCompleted) {
                  onJobCompleted(latestJob.job_id)
                } else {
                  onComplete()
                }
              } else if (latestJob.status === 'failed' || latestJob.status === 'error') {
                clearInterval(interval)
                setPollingInterval(null)
                // Show error and go back to input
                alert(`Job failed: ${latestJob.status}`)
                onComplete()
              }
            }
          }
        } catch (error) {
          console.error('Failed to poll for job status:', error)
        }
      }, 2000) // Poll every 2 seconds

      setPollingInterval(interval)
    }

    startPolling()

    // Cleanup interval on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [submittedJobId, onComplete, onJobCompleted])

  return (
    <div className="flex-1 flex items-center justify-center main-container p-8">
      <div className="text-center max-w-lg">
        <div className="spinner mx-auto mb-8"></div>
        
        <h2 className="text-4xl font-black text-gray-800 mb-6">
          Running Prediction...
        </h2>
        
        <p className="text-lg text-gray-700 mb-8 font-semibold">
          This may take several minutes. The Boltz model is analyzing your sequences and predicting the protein-ligand binding structure and affinity.
        </p>

        {submittedJobId && (
          <div className="section-card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 mb-8">
            <p className="text-sm font-bold text-blue-800">
              <strong>Job ID:</strong> {submittedJobId}
            </p>
            <p className="text-xs text-blue-700 mt-2 font-semibold">
              Checking status every 2 seconds...
            </p>
          </div>
        )}
        
        <div className="card">
          <h3 className="font-black text-gray-800 mb-4 text-xl">What's happening?</h3>
          <ul className="text-sm text-gray-700 space-y-3 text-left font-semibold">
            <li>• Processing input sequences</li>
            <li>• Running multiple sequence alignment (if needed)</li>
            <li>• Generating structure predictions</li>
            <li>• Calculating binding affinity (if requested)</li>
            <li>• Analyzing confidence scores</li>
          </ul>
        </div>
        
        <p className="text-sm text-gray-600 mt-8 font-semibold">
          You will be automatically redirected to the results when the job completes.
        </p>
      </div>
    </div>
  )
}

export default LoadingView 