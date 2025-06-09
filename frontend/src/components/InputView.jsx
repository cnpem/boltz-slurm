import { useState, useEffect } from 'react'
import SequenceInput from './SequenceInput'

const InputView = ({ onJobSubmitted, onShowLoading }) => {
  const [sequences, setSequences] = useState([])
  const [constraints, setConstraints] = useState([])
  const [templates, setTemplates] = useState([])
  const [enableAffinity, setEnableAffinity] = useState(false)
  const [affinityBinder, setAffinityBinder] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize with default protein sequence and ligand
  useEffect(() => {
    // Add protein sequence with example data
    const proteinSequence = {
      id: Date.now().toString(),
      entity_type: 'protein',
      chainId: 'A',
      sequence: 'MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ',
      smiles: '',
      ccd: '',
      msa: '',
      cyclic: false
    }
    
    // Add ligand sequence with example data
    const ligandSequence = {
      id: (Date.now() + 1).toString(),
      entity_type: 'ligand',
      chainId: 'B',
      sequence: '',
      smiles: 'N[C@@H](Cc1ccc(O)cc1)C(=O)O',
      ccd: '',
      msa: '',
      cyclic: false
    }
    
    setSequences([proteinSequence, ligandSequence])
    
    // Auto-enable affinity
    setEnableAffinity(true)
    setAffinityBinder('B')
  }, [])

  const addSequence = (type) => {
    const newSequence = {
      id: Date.now().toString(),
      entity_type: type,
      chainId: getDefaultChainId(),
      sequence: type === 'protein' ? 'MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ' : '',
      smiles: type === 'ligand' ? 'N[C@@H](Cc1ccc(O)cc1)C(=O)O' : '',
      ccd: '',
      msa: '',
      cyclic: false
    }
    setSequences(prev => [...prev, newSequence])
    
    // Auto-enable affinity if adding ligand
    if (type === 'ligand' && !enableAffinity) {
      setEnableAffinity(true)
      setAffinityBinder('B')
    }
  }

  const updateSequence = (id, updates) => {
    setSequences(prev => prev.map(seq => 
      seq.id === id ? { ...seq, ...updates } : seq
    ))
  }

  const removeSequence = (id) => {
    setSequences(prev => prev.filter(seq => seq.id !== id))
  }

  const getDefaultChainId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    return letters[sequences.length] || 'A'
  }

  const validateForm = () => {
    if (sequences.length === 0) {
      alert('Please add at least one sequence.')
      return false
    }

    for (let seq of sequences) {
      if (!seq.chainId) {
        alert('Please provide a chain ID for all sequences.')
        return false
      }

      if (seq.entity_type === 'ligand') {
        if (!seq.smiles && !seq.ccd) {
          alert('Ligand sequences must have either SMILES or CCD code.')
          return false
        }
      } else {
        if (!seq.sequence) {
          alert(`${seq.entity_type} sequences must have a sequence.`)
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    onShowLoading()

    try {
      const formData = {
        version: 1,
        sequences: sequences.map(seq => ({
          entity_type: seq.entity_type,
          id: seq.chainId,
          ...(seq.sequence && { sequence: seq.sequence }),
          ...(seq.smiles && { smiles: seq.smiles }),
          ...(seq.ccd && { ccd: seq.ccd }),
          ...(seq.msa && { msa: seq.msa }),
          ...(seq.cyclic && { cyclic: seq.cyclic })
        }))
      }

      // Add properties if affinity is enabled
      if (enableAffinity && affinityBinder) {
        formData.properties = [{
          affinity: { binder: affinityBinder }
        }]
      }

      // Add constraints if any
      if (constraints.length > 0) {
        formData.constraints = constraints
      }

      // Add templates if any
      if (templates.length > 0) {
        formData.templates = templates
      }

      const response = await fetch('/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        onJobSubmitted()
      } else {
        alert(`Prediction failed: ${result.message}`)
      }
      
    } catch (error) {
      console.error('Prediction failed:', error)
      alert('Failed to submit prediction. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getBinderOptions = () => {
    return sequences.map(seq => ({
      value: seq.chainId,
      label: `${seq.chainId} (${seq.entity_type})`
    }))
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            🚀 Run New Protein-Ligand Co-Folding
          </h1>
          <p className="text-gray-600">Predict protein-ligand binding affinity using Boltz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sequences Section */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Sequences</h2>
            
            <div className="space-y-4 mb-4">
              {sequences.map((sequence) => (
                <SequenceInput
                  key={sequence.id}
                  sequence={sequence}
                  onUpdate={(updates) => updateSequence(sequence.id, updates)}
                  onRemove={() => removeSequence(sequence.id)}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addSequence('protein')}
                className="btn-secondary text-sm"
              >
                + Add Protein
              </button>
              <button
                type="button"
                onClick={() => addSequence('ligand')}
                className="btn-secondary text-sm"
              >
                + Add Ligand
              </button>
              <button
                type="button"
                onClick={() => addSequence('dna')}
                className="btn-secondary text-sm"
              >
                + Add DNA
              </button>
              <button
                type="button"
                onClick={() => addSequence('rna')}
                className="btn-secondary text-sm"
              >
                + Add RNA
              </button>
            </div>
          </div>

          {/* Properties Section */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Properties</h2>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={enableAffinity}
                  onChange={(e) => setEnableAffinity(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Predict Binding Affinity</span>
              </label>

              {enableAffinity && (
                <div className="ml-7 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Binder Chain:
                  </label>
                  <select
                    value={affinityBinder}
                    onChange={(e) => setAffinityBinder(e.target.value)}
                    className="form-select w-48"
                  >
                    <option value="">Select binder chain</option>
                    {getBinderOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-submit disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : '🚀 Submit Co-Folding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InputView 