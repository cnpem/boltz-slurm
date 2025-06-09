const ConstraintInput = ({ constraint, onUpdate, onRemove }) => {
  const getConstraintIcon = (type) => {
    switch (type) {
      case 'bond': return '🔗'
      case 'pocket': return '🕳️'
      case 'contact': return '👋'
      default: return '🔧'
    }
  }

  const getConstraintColor = (type) => {
    switch (type) {
      case 'bond': return 'border-red-300 bg-red-50'
      case 'pocket': return 'border-yellow-300 bg-yellow-50'
      case 'contact': return 'border-green-300 bg-green-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const handleFieldUpdate = (field, value) => {
    onUpdate({ ...constraint, [field]: value })
  }

  const renderBondFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Atom 1 (Chain,ResIdx,AtomName) *
        </label>
        <input
          type="text"
          value={constraint.atom1 || ''}
          onChange={(e) => handleFieldUpdate('atom1', e.target.value)}
          className="form-input"
          placeholder="e.g., A,100,CA"
        />
        <div className="text-xs text-gray-500 mt-1">
          Format: CHAIN_ID,RES_IDX,ATOM_NAME
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Atom 2 (Chain,ResIdx,AtomName) *
        </label>
        <input
          type="text"
          value={constraint.atom2 || ''}
          onChange={(e) => handleFieldUpdate('atom2', e.target.value)}
          className="form-input"
          placeholder="e.g., B,200,CB"
        />
        <div className="text-xs text-gray-500 mt-1">
          Format: CHAIN_ID,RES_IDX,ATOM_NAME
        </div>
      </div>
    </div>
  )

  const renderPocketFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Binder Chain *
          </label>
          <input
            type="text"
            value={constraint.binder || ''}
            onChange={(e) => handleFieldUpdate('binder', e.target.value)}
            className="form-input"
            placeholder="e.g., B"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Distance (optional)
          </label>
          <input
            type="number"
            step="0.1"
            value={constraint.max_distance || ''}
            onChange={(e) => handleFieldUpdate('max_distance', e.target.value ? parseFloat(e.target.value) : null)}
            className="form-input"
            placeholder="e.g., 5.0"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contacts (one per line) *
        </label>
        <textarea
          value={constraint.contacts || ''}
          onChange={(e) => handleFieldUpdate('contacts', e.target.value)}
          className="form-textarea"
          placeholder="A,100,CA&#10;A,101,CB&#10;A,102"
          rows={4}
        />
        <div className="text-xs text-gray-500 mt-1">
          Format: CHAIN_ID,RES_IDX[,ATOM_NAME] (one per line)
        </div>
      </div>
    </div>
  )

  const renderContactFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Token 1 (Chain,ResIdx[,AtomName]) *
        </label>
        <input
          type="text"
          value={constraint.token1 || ''}
          onChange={(e) => handleFieldUpdate('token1', e.target.value)}
          className="form-input"
          placeholder="e.g., A,100,CA"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Token 2 (Chain,ResIdx[,AtomName]) *
        </label>
        <input
          type="text"
          value={constraint.token2 || ''}
          onChange={(e) => handleFieldUpdate('token2', e.target.value)}
          className="form-input"
          placeholder="e.g., B,200,CB"
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max Distance (optional)
        </label>
        <input
          type="number"
          step="0.1"
          value={constraint.max_distance || ''}
          onChange={(e) => handleFieldUpdate('max_distance', e.target.value ? parseFloat(e.target.value) : null)}
          className="form-input w-48"
          placeholder="e.g., 5.0"
        />
      </div>
    </div>
  )

  return (
    <div className={`border-2 rounded-lg p-4 ${getConstraintColor(constraint.type)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{getConstraintIcon(constraint.type)}</span>
          <h3 className="font-medium text-gray-800 capitalize">
            {constraint.type} Constraint
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

      {constraint.type === 'bond' && renderBondFields()}
      {constraint.type === 'pocket' && renderPocketFields()}
      {constraint.type === 'contact' && renderContactFields()}
    </div>
  )
}

export default ConstraintInput 