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
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="spinner mx-auto mb-6"></div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Running Prediction...
        </h2>
        
        <p className="text-gray-600 mb-8">
          This may take several minutes. The Boltz model is analyzing your sequences and predicting the protein-ligand binding structure and affinity.
        </p>

        {submittedJobId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>Job ID:</strong> {submittedJobId}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Checking status every 2 seconds...
            </p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3">What's happening?</h3>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li>• Processing input sequences</li>
            <li>• Running multiple sequence alignment (if needed)</li>
            <li>• Generating structure predictions</li>
            <li>• Calculating binding affinity (if requested)</li>
            <li>• Analyzing confidence scores</li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          You will be automatically redirected to the results when the job completes.
        </p>
      </div>
    </div>
  )
}

export default LoadingView 