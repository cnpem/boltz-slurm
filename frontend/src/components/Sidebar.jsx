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
      case 'completed': return 'text-green-600 bg-green-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'timeout': return 'text-orange-600 bg-orange-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="w-80 bg-white shadow-lg flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
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
          <span className="text-gray-600 font-medium">Recent Jobs</span>
          <button
            onClick={onRefreshJobs}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
            title="Refresh jobs"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-gray-500 mb-4">No jobs yet</p>
            <button
              onClick={onNewJob}
              className="btn-secondary text-sm"
            >
              Create First Job
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {jobs.map((job) => {
              const { date, time } = formatDate(job.timestamp)
              const isSelected = selectedJobId === job.job_id
              
              return (
                <div
                  key={job.job_id}
                  onClick={() => onSelectJob(job.job_id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-800 text-sm truncate flex-1 mr-2">
                      {job.job_id}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>{getJobSummary(job)}</div>
                    <div>{date} {time}</div>
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