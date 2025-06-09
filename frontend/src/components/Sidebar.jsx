import { useState } from 'react'

const Sidebar = ({ jobs, selectedJobId, onSelectJob, onNewJob, onRefreshJobs }) => {
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
      case 'completed': return 'text-green-700 bg-green-100 border-green-300'
      case 'running': return 'text-blue-700 bg-blue-100 border-blue-300'
      case 'failed': return 'text-red-700 bg-red-100 border-red-300'
      case 'timeout': return 'text-orange-700 bg-orange-100 border-orange-300'
      case 'error': return 'text-red-700 bg-red-100 border-red-300'
      default: return 'text-gray-700 bg-gray-100 border-gray-300'
    }
  }

  return (
    <div className="w-96 sidebar-container flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b-4 border-gray-300 bg-white shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-800 flex items-center">
            🧬 Boltz Jobs
          </h2>
          <button
            onClick={onNewJob}
            className="btn-primary text-sm"
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
            🔄
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-white rounded-2xl border-3 border-gray-300 p-8 shadow-xl">
              <div className="text-6xl mb-4">🧪</div>
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
                    <div className="font-bold text-gray-800 text-sm flex-1 mr-3 break-words">
                      {job.job_id}
                    </div>
                    <span className={`status-badge ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="font-semibold">{getJobSummary(job)}</div>
                    <div className="text-xs font-medium">{date} at {time}</div>
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