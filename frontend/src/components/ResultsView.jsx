import { useState, useEffect } from 'react'
import MolstarViewer from './MolstarViewer'

const ResultsView = ({ jobId, onBackToInput, onNewJob }) => {
  const [jobData, setJobData] = useState(null)
  const [resultsData, setResultsData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobId) {
      loadJobDetails()
    }
  }, [jobId])

  const loadJobDetails = async () => {
    try {
      setLoading(true)
      
      // Load formatted results using the new endpoint
      const response = await fetch(`/api/jobs/${jobId}/results`)
      const data = await response.json()
      
      setJobData(data.job_info)
      setResultsData({
        affinity: data.affinity_results,
        confidence: data.confidence_results
      })

    } catch (error) {
      console.error('Failed to load job details:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
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

  const convertToPIC50 = (modelOutput) => {
    // Convert model output to pIC50 in kcal/mol using formula: (6 - y) * 1.364
    return (6 - modelOutput) * 1.364
  }

  const getAffinityInterpretation = (modelOutput) => {
    if (modelOutput <= -2) return { strength: "Very Strong", color: "text-green-700", description: "IC50 < 10⁻⁸ M" }
    if (modelOutput <= -1) return { strength: "Strong", color: "text-green-600", description: "IC50 ≈ 10⁻⁹ M" }
    if (modelOutput <= 0) return { strength: "Moderate", color: "text-yellow-600", description: "IC50 ≈ 10⁻⁶ M" }
    if (modelOutput <= 2) return { strength: "Weak", color: "text-orange-600", description: "IC50 ≈ 10⁻⁴ M" }
    return { strength: "Very Weak/Decoy", color: "text-red-600", description: "IC50 > 10⁻⁴ M" }
  }

  const renderAffinityResults = (affinityData) => {
    if (!affinityData || !affinityData.detailed) return null

    const data = affinityData.detailed

    return (
      <div className="space-y-4">
        {/* Ensemble Results */}
        <div className="section-card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300">
          <h4 className="font-black text-blue-800 mb-4 text-lg">Ensemble Model Results</h4>
          <div className="space-y-3">
            {data.affinity_pred_value !== undefined && (
              <div className="metric-box">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-blue-700">Binding Affinity (log IC50):</span>
                  <span className="text-blue-900 font-mono text-xl font-black">
                    {data.affinity_pred_value.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-blue-700">pIC50 (kcal/mol):</span>
                  <span className="text-blue-900 font-mono text-xl font-black">
                    {convertToPIC50(data.affinity_pred_value).toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-700">Binding Strength:</span>
                  <div className="text-right">
                    <span className={`font-bold ${getAffinityInterpretation(data.affinity_pred_value).color}`}>
                      {getAffinityInterpretation(data.affinity_pred_value).strength}
                    </span>
                    <div className="text-sm text-gray-600">
                      {getAffinityInterpretation(data.affinity_pred_value).description}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {data.affinity_probability_binary !== undefined && (
              <div className="bg-white rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-700">Binding Probability:</span>
                  <div className="text-right">
                    <span className="text-blue-900 font-mono text-lg">
                      {(data.affinity_probability_binary * 100).toFixed(1)}%
                    </span>
                    <div className="text-sm text-gray-600">
                      Likelihood of being a binder
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Individual Model Results */}
        {(data.affinity_pred_value1 !== undefined || data.affinity_pred_value2 !== undefined) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🔬 Individual Model Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Model 1 */}
              {data.affinity_pred_value1 !== undefined && (
                <div className="bg-white rounded p-3">
                  <h5 className="font-medium text-gray-700 mb-2">Model 1</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Affinity (log IC50):</span>
                      <span className="font-mono">{data.affinity_pred_value1.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>pIC50 (kcal/mol):</span>
                      <span className="font-mono">{convertToPIC50(data.affinity_pred_value1).toFixed(3)}</span>
                    </div>
                    {data.affinity_probability_binary1 !== undefined && (
                      <div className="flex justify-between">
                        <span>Binding Probability:</span>
                        <span className="font-mono">{(data.affinity_probability_binary1 * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Model 2 */}
              {data.affinity_pred_value2 !== undefined && (
                <div className="bg-white rounded p-3">
                  <h5 className="font-medium text-gray-700 mb-2">Model 2</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Affinity (log IC50):</span>
                      <span className="font-mono">{data.affinity_pred_value2.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>pIC50 (kcal/mol):</span>
                      <span className="font-mono">{convertToPIC50(data.affinity_pred_value2).toFixed(3)}</span>
                    </div>
                    {data.affinity_probability_binary2 !== undefined && (
                      <div className="flex justify-between">
                        <span>Binding Probability:</span>
                        <span className="font-mono">{(data.affinity_probability_binary2 * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interpretation Guide */}
        <div className="interpretation-box">
          <h4 className="font-black text-yellow-800 mb-4 text-lg">Interpretation Guide</h4>
          <div className="text-sm text-yellow-700 space-y-2 font-semibold">
            <p><strong>Lower affinity values = stronger binding</strong></p>
            <p>• Strong binders: log(IC50) ≤ -1 (IC50 ≤ 10⁻⁷ M)</p>
            <p>• Moderate binders: log(IC50) ≈ 0 (IC50 ≈ 10⁻⁶ M)</p>
            <p>• Weak binders: log(IC50) ≥ 2 (IC50 ≥ 10⁻⁴ M)</p>
          </div>
        </div>
      </div>
    )
  }

  const getConfidenceColor = (score) => {
    if (score >= 0.9) return "text-green-700"
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.7) return "text-yellow-600"
    if (score >= 0.6) return "text-orange-600"
    return "text-red-600"
  }

  const getConfidenceLevel = (score) => {
    if (score >= 0.9) return "Very High"
    if (score >= 0.8) return "High"
    if (score >= 0.7) return "Moderate"
    if (score >= 0.6) return "Low"
    return "Very Low"
  }

  const renderConfidenceResults = (confidenceData) => {
    if (!confidenceData || !confidenceData.detailed) return null

    const data = confidenceData.detailed

    return (
      <div className="space-y-4">
        {/* Overall Confidence */}
        <div className="section-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-300">
                      <h4 className="font-black text-green-800 mb-4 text-lg">Overall Confidence</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.confidence_score !== undefined && (
              <div className="metric-box">
                <div className="text-center">
                  <div className="metric-label mb-2">Confidence Score</div>
                  <div className={`metric-value ${getConfidenceColor(data.confidence_score)}`}>
                    {(data.confidence_score * 100).toFixed(1)}%
                  </div>
                  <div className={`text-sm font-bold ${getConfidenceColor(data.confidence_score)} mb-2`}>
                    {getConfidenceLevel(data.confidence_score)}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold">
                    0.8 × pLDDT + 0.2 × ipTM
                  </div>
                </div>
              </div>
            )}

            {data.complex_plddt !== undefined && (
              <div className="bg-white rounded p-3">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Complex pLDDT</div>
                  <div className={`text-2xl font-bold ${getConfidenceColor(data.complex_plddt)}`}>
                    {(data.complex_plddt * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Average confidence across complex
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TM Scores */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-3">📐 Template Modeling (TM) Scores</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.ptm !== undefined && (
              <div className="bg-white rounded p-3 text-center">
                <div className="text-sm text-gray-600">PTM (Complex)</div>
                <div className={`text-lg font-bold ${getConfidenceColor(data.ptm)}`}>
                  {(data.ptm * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {data.iptm !== undefined && (
              <div className="bg-white rounded p-3 text-center">
                <div className="text-sm text-gray-600">ipTM (Interface)</div>
                <div className={`text-lg font-bold ${getConfidenceColor(data.iptm)}`}>
                  {(data.iptm * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {data.protein_iptm !== undefined && (
              <div className="bg-white rounded p-3 text-center">
                <div className="text-sm text-gray-600">Protein ipTM</div>
                <div className={`text-lg font-bold ${getConfidenceColor(data.protein_iptm)}`}>
                  {(data.protein_iptm * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Distance Errors */}
        {(data.complex_pde !== undefined || data.complex_ipde !== undefined) && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 mb-3">📏 Distance Errors (Lower = Better)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.complex_pde !== undefined && (
                <div className="bg-white rounded p-3 text-center">
                  <div className="text-sm text-gray-600">Complex PDE</div>
                  <div className="text-lg font-bold text-purple-700">
                    {data.complex_pde.toFixed(2)} Å
                  </div>
                  <div className="text-xs text-gray-500">Average distance error</div>
                </div>
              )}
              {data.complex_ipde !== undefined && (
                <div className="bg-white rounded p-3 text-center">
                  <div className="text-sm text-gray-600">Interface PDE</div>
                  <div className="text-lg font-bold text-purple-700">
                    {data.complex_ipde.toFixed(2)} Å
                  </div>
                  <div className="text-xs text-gray-500">Interface distance error</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chain-wise Results */}
        {(data.chains_ptm || data.pair_chains_iptm) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🔗 Chain-wise Analysis</h4>
            
            {data.chains_ptm && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-700 mb-2">Individual Chain PTM</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(data.chains_ptm).map(([chain, score]) => (
                    <div key={chain} className="bg-white rounded p-2 text-center">
                      <div className="text-xs text-gray-600">Chain {chain}</div>
                      <div className={`font-bold ${getConfidenceColor(score)}`}>
                        {(score * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.pair_chains_iptm && (
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Pairwise Chain ipTM</h5>
                <div className="bg-white rounded p-3">
                  <div className="grid gap-2">
                    {Object.entries(data.pair_chains_iptm).map(([chain1, pairs]) => 
                      Object.entries(pairs).map(([chain2, score]) => (
                        <div key={`${chain1}-${chain2}`} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Chain {chain1} ↔ Chain {chain2}:</span>
                          <span className={`font-mono ${getConfidenceColor(score)}`}>
                            {(score * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Score Interpretation */}
        <div className="interpretation-box">
          <h4 className="font-black text-yellow-800 mb-4 text-lg">Score Interpretation</h4>
          <div className="text-sm text-yellow-700 space-y-2 font-semibold">
            <p><strong>Confidence & TM Scores (0-1):</strong> Higher values = better confidence</p>
            <p><strong>Distance Errors (Ångstroms):</strong> Lower values = better accuracy</p>
            <p><strong>PTM:</strong> Predicted Template Modeling score</p>
            <p><strong>ipTM:</strong> Interface PTM score (quality of interfaces)</p>
            <p><strong>pLDDT:</strong> Predicted Local Distance Difference Test</p>
          </div>
        </div>
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
    <div className="flex-1 p-8 overflow-y-auto main-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="card-header mb-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBackToInput} className="btn-secondary">
              ← Back to Input
            </button>
          </div>
          
          <h1 className="text-4xl font-black text-gray-800 mb-4">
            Job Results: {jobData.job_name || jobData.job_id}
          </h1>
          {jobData.job_name && (
            <p className="text-lg text-gray-600 font-mono">
              ID: {jobData.job_id}
            </p>
          )}
        </div>

        {/* Job Information */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <div className="results-section info-section">
            <h3 className="text-2xl font-black text-gray-800 mb-6">Job Information</h3>
            <div className="space-y-4">
              {jobData.job_name && (
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-gray-200">
                  <span className="font-bold text-gray-700">Job Name:</span>
                  <span className="text-gray-900 font-semibold">{jobData.job_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-gray-200">
                <span className="font-bold text-gray-700">Job ID:</span>
                <span className="text-gray-900 font-mono text-sm">{jobData.job_id}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-gray-200">
                <span className="font-bold text-gray-700">Status:</span>
                <span className={`status-badge ${getStatusColor(jobData.status)}`}>
                  {jobData.status}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-gray-200">
                <span className="font-bold text-gray-700">Created:</span>
                <span className="text-gray-900 font-semibold">{formatDate(jobData.timestamp)}</span>
              </div>
              {jobData.completion_time && (
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-gray-200">
                  <span className="font-bold text-gray-700">Completed:</span>
                  <span className="text-gray-900 font-semibold">{formatDate(jobData.completion_time)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="results-section info-section">
            <h3 className="text-2xl font-black text-gray-800 mb-6">Entities</h3>
            <div className="space-y-4">
              {(jobData.entities || []).map((entity, index) => (
                <div key={index} className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-700">Type:</span>
                      <span className="text-gray-900 capitalize font-semibold">{entity.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-700">ID:</span>
                      <span className="text-gray-900 font-mono text-sm">{entity.id}</span>
                    </div>
                    {entity.sequence_length && (
                      <div className="flex justify-between col-span-2">
                        <span className="font-bold text-gray-700">Length:</span>
                        <span className="text-gray-900 font-semibold">{entity.sequence_length} residues</span>
                      </div>
                    )}
                    {entity.smiles && (
                      <div className="flex justify-between col-span-2">
                        <span className="font-bold text-gray-700">SMILES:</span>
                        <span className="text-gray-900 font-mono text-xs break-all">{entity.smiles}</span>
                      </div>
                    )}
                    {entity.ccd && (
                      <div className="flex justify-between col-span-2">
                        <span className="font-bold text-gray-700">CCD:</span>
                        <span className="text-gray-900 font-semibold">{entity.ccd}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3D Structure Viewer */}
        {jobData.status === 'completed' && (
          <div className="mb-8">
            <div className="results-section from-slate-50 to-gray-50 border-gray-300">
              <h3 className="text-2xl font-black text-gray-800 mb-6">3D Structure</h3>
              <MolstarViewer jobId={jobId} className="w-full rounded-xl border-3 border-gray-300 shadow-xl" />
            </div>
          </div>
        )}

        {/* Results */}
        {jobData.status === 'completed' && resultsData && (resultsData.affinity || resultsData.confidence) && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {resultsData.affinity && (
              <div className="results-section affinity-section">
                <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center">
                  Affinity Results
                </h3>
                {renderAffinityResults(resultsData.affinity)}
              </div>
            )}

            {resultsData.confidence && (
              <div className="results-section confidence-section">
                <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center">
                  Confidence Results
                </h3>
                {renderConfidenceResults(resultsData.confidence)}
              </div>
            )}
          </div>
        )}

        {/* Error Information */}
        {(jobData.status === 'failed' || jobData.status === 'error') && (
          <div className="results-section from-red-50 to-pink-50 border-red-300">
            <h3 className="text-2xl font-black text-red-800 mb-6">Error Information</h3>
            
            {jobData.stderr && (
              <div className="mb-6">
                <h4 className="font-bold text-red-700 mb-3 text-lg">Error Output:</h4>
                <pre className="bg-red-100 p-4 rounded-xl text-sm text-red-800 overflow-x-auto border-2 border-red-200 shadow-lg">
                  {jobData.stderr}
                </pre>
              </div>
            )}
            
            {jobData.stdout && (
              <div className="mb-4">
                <h4 className="font-bold text-red-700 mb-3 text-lg">Standard Output:</h4>
                <pre className="bg-red-100 p-4 rounded-xl text-sm text-red-800 overflow-x-auto border-2 border-red-200 shadow-lg">
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