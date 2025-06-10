const SequenceInput = ({ sequence, onUpdate, onRemove }) => {
  const getSequenceIcon = (type) => {
    switch (type) {
      case 'protein': return '🧬'
      case 'dna': return '🧬'
      case 'rna': return '🧬'
      case 'ligand': return '💊'
      default: return '🧬'
    }
  }

  const getSequenceColor = (type) => {
    switch (type) {
      case 'protein': return 'glass-card-blue'
      case 'dna': return 'glass-card-green'
      case 'rna': return 'glass-card-purple'
      case 'ligand': return 'glass-card-orange'
      default: return 'glass-card-gray'
    }
  }

  return (
    <div className={`rounded-xl p-6 shadow-xl transition-all duration-300 hover:scale-[1.02] ${getSequenceColor(sequence.entity_type)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{getSequenceIcon(sequence.entity_type)}</span>
          <h3 className="font-medium text-gray-800 capitalize">
            {sequence.entity_type} Sequence
          </h3>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chain ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chain ID *
          </label>
          <input
            type="text"
            value={sequence.chainId}
            onChange={(e) => onUpdate({ chainId: e.target.value })}
            className="form-input"
            placeholder="e.g., A"
            maxLength={5}
          />
        </div>

        {/* Entity Type specific fields */}
        {sequence.entity_type === 'ligand' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMILES
              </label>
              <input
                type="text"
                value={sequence.smiles}
                onChange={(e) => onUpdate({ smiles: e.target.value })}
                className="form-input"
                placeholder="e.g., N[C@@H](Cc1ccc(O)cc1)C(=O)O"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CCD Code
              </label>
              <input
                type="text"
                value={sequence.ccd}
                onChange={(e) => onUpdate({ ccd: e.target.value })}
                className="form-input"
                placeholder="e.g., TYR"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={sequence.cyclic}
                  onChange={(e) => onUpdate({ cyclic: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Cyclic</span>
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence *
              </label>
              <textarea
                value={sequence.sequence}
                onChange={(e) => onUpdate({ sequence: e.target.value })}
                className="form-textarea"
                placeholder={`Enter ${sequence.entity_type} sequence...`}
                rows={4}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MSA File (.a3m)
              </label>
              <input
                type="file"
                accept=".a3m"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    // For now, just store the file name
                    // In a real implementation, you'd want to upload this
                    onUpdate({ msa: file.name })
                  }
                }}
                className="form-input"
              />
              {sequence.msa && (
                <div className="mt-1 text-sm text-gray-600">
                  Current: {sequence.msa}
                </div>
              )}
            </div>
            {sequence.entity_type === 'protein' && (
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={sequence.cyclic}
                    onChange={(e) => onUpdate({ cyclic: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Cyclic</span>
                </label>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SequenceInput 