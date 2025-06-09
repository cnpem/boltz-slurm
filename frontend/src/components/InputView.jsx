import { useState, useEffect } from 'react'
import SequenceInput from './SequenceInput'
import ConstraintInput from './ConstraintInput'
import TemplateInput from './TemplateInput'

const InputView = ({ onJobSubmitted, onShowLoading }) => {
  const [jobName, setJobName] = useState('')
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

  const addConstraint = (type) => {
    const newConstraint = {
      id: Date.now().toString(),
      type: type,
      // Initialize fields based on type
      ...(type === 'bond' && { atom1: '', atom2: '' }),
      ...(type === 'pocket' && { binder: '', contacts: '', max_distance: null }),
      ...(type === 'contact' && { token1: '', token2: '', max_distance: null })
    }
    setConstraints(prev => [...prev, newConstraint])
  }

  const updateConstraint = (id, updates) => {
    setConstraints(prev => prev.map(constraint => 
      constraint.id === id ? { ...constraint, ...updates } : constraint
    ))
  }

  const removeConstraint = (id) => {
    setConstraints(prev => prev.filter(constraint => constraint.id !== id))
  }

  const addTemplate = () => {
    const newTemplate = {
      id: Date.now().toString(),
      cif: '',
      chain_id: '',
      template_id: ''
    }
    setTemplates(prev => [...prev, newTemplate])
  }

  const updateTemplate = (id, updates) => {
    setTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, ...updates } : template
    ))
  }

  const removeTemplate = (id) => {
    setTemplates(prev => prev.filter(template => template.id !== id))
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

  const processConstraintsForSubmission = () => {
    return constraints.map(constraint => {
      const result = {}
      
      if (constraint.type === 'bond') {
        result.bond = {
          atom1: constraint.atom1.split(',').map(s => s.trim()),
          atom2: constraint.atom2.split(',').map(s => s.trim())
        }
      } else if (constraint.type === 'pocket') {
        const contacts = constraint.contacts.split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .map(line => line.split(',').map(s => s.trim()))
        
        result.pocket = {
          binder: constraint.binder,
          contacts: contacts
        }
        
        if (constraint.max_distance) {
          result.pocket.max_distance = constraint.max_distance
        }
      } else if (constraint.type === 'contact') {
        result.contact = {
          token1: constraint.token1.split(',').map(s => s.trim()),
          token2: constraint.token2.split(',').map(s => s.trim())
        }
        
        if (constraint.max_distance) {
          result.contact.max_distance = constraint.max_distance
        }
      }
      
      return result
    }).filter(constraint => Object.keys(constraint).length > 0)
  }

  const processTemplatesForSubmission = () => {
    return templates.map(template => {
      const result = { cif: template.cif }
      
      if (template.chain_id) {
        result.chain_id = template.chain_id.split(',').map(s => s.trim())
      }
      
      if (template.template_id) {
        result.template_id = template.template_id.split(',').map(s => s.trim())
      }
      
      return result
    }).filter(template => template.cif)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    onShowLoading()

    try {
      const formData = {
        version: 1,
        ...(jobName && { job_name: jobName }),
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
      const processedConstraints = processConstraintsForSubmission()
      if (processedConstraints.length > 0) {
        formData.constraints = processedConstraints
      }

      // Add templates if any
      const processedTemplates = processTemplatesForSubmission()
      if (processedTemplates.length > 0) {
        formData.templates = processedTemplates
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
    <div className="flex-1 p-8 overflow-y-auto main-container">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="card-header mb-8">
          <h1 className="text-4xl font-black text-gray-800 mb-4 flex items-center">
            Run New Protein-Ligand Co-Folding
          </h1>
          <p className="text-lg text-gray-700 font-semibold">Predict protein-ligand binding affinity using Boltz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Job Name Section */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Job Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Job Name (Optional)
                </label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="Enter a descriptive name for this job..."
                  className="form-input"
                  maxLength={100}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Give your job a meaningful name to easily identify it later. If left empty, a unique ID will be used.
                </p>
              </div>
            </div>
          </div>

          {/* Sequences Section */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Sequences</h2>
            
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Properties</h2>
            
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

          {/* Advanced Options */}
          <div className="card">
            <details className="space-y-6">
              <summary className="text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600">
                Advanced Options
              </summary>
              
              <div className="mt-6 space-y-6">
                {/* Constraints */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Constraints (Optional)</h3>
                  
                  <div className="space-y-4 mb-4">
                    {constraints.map((constraint) => (
                      <ConstraintInput
                        key={constraint.id}
                        constraint={constraint}
                        onUpdate={(updates) => updateConstraint(constraint.id, updates)}
                        onRemove={() => removeConstraint(constraint.id)}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addConstraint('bond')}
                      className="btn-secondary text-sm"
                    >
                      🔗 Add Bond Constraint
                    </button>
                    <button
                      type="button"
                      onClick={() => addConstraint('pocket')}
                      className="btn-secondary text-sm"
                    >
                      🕳️ Add Pocket Constraint
                    </button>
                    <button
                      type="button"
                      onClick={() => addConstraint('contact')}
                      className="btn-secondary text-sm"
                    >
                      👋 Add Contact Constraint
                    </button>
                  </div>
                </div>

                {/* Templates */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Templates (Optional)</h3>
                  
                  <div className="space-y-4 mb-4">
                    {templates.map((template) => (
                      <TemplateInput
                        key={template.id}
                        template={template}
                        onUpdate={(updates) => updateTemplate(template.id, updates)}
                        onRemove={() => removeTemplate(template.id)}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addTemplate}
                    className="btn-secondary text-sm"
                  >
                    📋 Add Template
                  </button>
                </div>
              </div>
            </details>
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