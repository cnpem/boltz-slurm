import { useState } from 'react'

const Sidebar = ({ jobs, selectedJobId, onSelectJob, onNewJob, onRefreshJobs, onHome }) => {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    }
  }

  const getJobSummary = (job) => {
    const entities = job.entities || []
    const proteinCount = entities.filter(e => e.type === 'protein').length
    const ligandCount = entities.filter(e => e.type === 'ligand').length
    return `${proteinCount} protein(s), ${ligandCount} ligand(s)`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-800 bg-green-200 border-green-400'
      case 'running': return 'text-blue-800 bg-blue-200 border-blue-400'
      case 'failed': return 'text-red-800 bg-red-200 border-red-400'
      case 'timeout': return 'text-orange-800 bg-orange-200 border-orange-400'
      case 'error': return 'text-red-800 bg-red-200 border-red-400'
      default: return 'text-gray-800 bg-gray-200 border-gray-400'
    }
  }

  const getJobDisplayName = (job) => {
    return job.job_name || job.job_id
  }

  const downloadJobFiles = async (e, jobId, jobName) => {
    e.stopPropagation() // Prevent job selection when clicking download
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/download`)
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${jobName || jobId}_complete.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download job files:', error)
      alert('Failed to download job files. Please try again.')
    }
  }

  return (
    <div className="w-96 sidebar-container flex flex-col h-screen fixed left-0 top-20 z-10">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 shadow-2xl"
           style={{
             background: 'rgba(255, 255, 255, 0.2)',
             backdropFilter: 'blur(20px)',
             border: '1px solid rgba(255, 255, 255, 0.3)',
             borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
           }}>
        <div className="flex flex-col gap-4 mb-6">
          <button
            onClick={onHome}
            className="btn-secondary w-full"
          >
            Home
          </button>
          <button
            onClick={onNewJob}
            className="btn-primary w-full"
          >
            + New Job
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-700 font-bold text-lg">Recent Jobs</span>
          <button
            onClick={onRefreshJobs}
            className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 border-2 border-transparent hover:border-gray-300"
            title="Refresh jobs"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Scrollable Jobs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <div className="rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:scale-105"
                 style={{
                   background: 'rgba(255, 255, 255, 0.15)',
                   backdropFilter: 'blur(20px)',
                   border: '1px solid rgba(255, 255, 255, 0.2)'
                 }}>
              <div className="text-6xl mb-4">💡</div>
              <p className="text-gray-600 mb-6 font-semibold text-lg">No jobs yet</p>
              <button
                onClick={onNewJob}
                className="btn-secondary"
              >
                Create First Job
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const { date, time } = formatDate(job.timestamp)
              const isSelected = selectedJobId === job.job_id
              const isCompleted = job.status === 'completed'
              
              return (
                <div
                  key={job.job_id}
                  onClick={() => onSelectJob(job.job_id)}
                  className={`job-item ${
                    isSelected 
                      ? 'job-item-selected' 
                      : 'job-item-default'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 mr-3 min-w-0">
                      <div className="font-bold text-gray-800 text-base truncate">
                        {getJobDisplayName(job)}
                      </div>
                      {job.job_name && (
                        <div className="text-xs text-gray-500 font-mono mt-1 truncate">
                          {job.job_id}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {isCompleted && (
                        <button
                          onClick={(e) => downloadJobFiles(e, job.job_id, job.job_name)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-100 p-1.5 rounded transition-all duration-200 border border-transparent hover:border-green-300"
                          title="Download all files"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                      <span className={`status-badge ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="font-semibold">{getJobSummary(job)}</div>
                    <div className="text-xs font-medium text-gray-500">{date} at {time}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar 