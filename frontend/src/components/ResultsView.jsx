import { useState, useEffect } from 'react'

const ResultsView = ({ jobId, onBackToInput, onNewJob }) => {
  const [jobData, setJobData] = useState(null)
  const [affinityData, setAffinityData] = useState(null)
  const [confidenceData, setConfidenceData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobId) {
      loadJobDetails()
    }
  }, [jobId])

  const loadJobDetails = async () => {
    try {
      setLoading(true)
      
      // Load job info
      const response = await fetch(`/api/jobs/${jobId}`)
      const data = await response.json()
      setJobData(data)

      // Load result files if job completed
      if (data.status === 'completed') {
        const [affinityResult, confidenceResult] = await Promise.all([
          loadJobFile(jobId, 'affinity_boltz_input.json'),
          loadJobFile(jobId, 'confidence_boltz_input_model_0.json')
        ])
        
        setAffinityData(affinityResult)
        setConfidenceData(confidenceResult)
      }
    } catch (error) {
      console.error('Failed to load job details:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadJobFile = async (jobId, filename) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/file/${filename}`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error(`Failed to load ${filename}:`, error)
    }
    return null
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
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

  const formatAffinityResults = (data) => {
    if (!data || !data.affinity) return null

    return (
      <div className="space-y-2">
        {Object.entries(data.affinity).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
            <span className="font-medium text-gray-700">{key.replace(/_/g, ' ').toUpperCase()}:</span>
            <span className="text-gray-900">
              {typeof value === 'number' ? value.toFixed(4) : value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const formatConfidenceResults = (data) => {
    if (!data || !data.confidence) return null

    return (
      <div className="space-y-2">
        {Object.entries(data.confidence).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
            <span className="font-medium text-gray-700">{key.replace(/_/g, ' ').toUpperCase()}:</span>
            <span className="text-gray-900">
              {typeof value === 'number' ? value.toFixed(4) : value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (!jobData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Failed to load job details</p>
          <button onClick={onBackToInput} className="btn-primary">
            Back to Input
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button onClick={onBackToInput} className="btn-secondary">
                ← Back to Input
              </button>
              <button onClick={onNewJob} className="btn-primary">
                + New Job
              </button>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Job Results: {jobData.job_id}
          </h1>
        </div>

        {/* Job Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Job Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Job ID:</span>
                <span className="text-gray-900">{jobData.job_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(jobData.status)}`}>
                  {jobData.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Created:</span>
                <span className="text-gray-900">{formatDate(jobData.timestamp)}</span>
              </div>
              {jobData.completion_time && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Completed:</span>
                  <span className="text-gray-900">{formatDate(jobData.completion_time)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Command:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {jobData.command || 'N/A'}
                </code>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Entities</h3>
            <div className="space-y-3">
              {(jobData.entities || []).map((entity, index) => (
                <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="text-gray-900 capitalize">{entity.type}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-700">ID:</span>
                    <span className="text-gray-900">{entity.id}</span>
                  </div>
                  {entity.sequence_length && (
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-gray-700">Length:</span>
                      <span className="text-gray-900">{entity.sequence_length} residues</span>
                    </div>
                  )}
                  {entity.smiles && (
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-gray-700">SMILES:</span>
                      <span className="text-gray-900 font-mono text-sm">{entity.smiles}</span>
                    </div>
                  )}
                  {entity.ccd && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">CCD:</span>
                      <span className="text-gray-900">{entity.ccd}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {jobData.status === 'completed' && (affinityData || confidenceData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {affinityData && (
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  🎯 Affinity Results
                </h3>
                {formatAffinityResults(affinityData)}
              </div>
            )}

            {confidenceData && (
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  📊 Confidence Results
                </h3>
                {formatConfidenceResults(confidenceData)}
              </div>
            )}
          </div>
        )}

        {/* Error Information */}
        {(jobData.status === 'failed' || jobData.status === 'error') && (
          <div className="card border-red-200 bg-red-50">
            <h3 className="text-xl font-semibold text-red-800 mb-4">Error Information</h3>
            
            {jobData.stderr && (
              <div className="mb-4">
                <h4 className="font-medium text-red-700 mb-2">Error Output:</h4>
                <pre className="bg-red-100 p-3 rounded text-sm text-red-800 overflow-x-auto">
                  {jobData.stderr}
                </pre>
              </div>
            )}
            
            {jobData.stdout && (
              <div className="mb-4">
                <h4 className="font-medium text-red-700 mb-2">Standard Output:</h4>
                <pre className="bg-red-100 p-3 rounded text-sm text-red-800 overflow-x-auto">
                  {jobData.stdout}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsView 