import { useState } from 'react'

const TemplateInput = ({ template, onUpdate, onRemove }) => {
  const [isUploading, setIsUploading] = useState(false)

  const handleFieldUpdate = (field, value) => {
    onUpdate({ ...template, [field]: value })
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/upload_template', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        handleFieldUpdate('cif', result.path)
        handleFieldUpdate('uploaded_filename', result.filename)
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.detail}`)
      }
    } catch (error) {
      console.error('Template upload failed:', error)
      alert('Template upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="border-2 border-purple-300 bg-purple-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl">📋</span>
          <h3 className="font-medium text-gray-800">
            Template Configuration
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
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CIF/PDB File *
          </label>
          
          {/* File Upload Option */}
          <div className="mb-2">
            <input
              type="file"
              accept=".cif,.pdb"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="form-input"
            />
            {isUploading && (
              <div className="mt-1 text-sm text-blue-600">
                Uploading template file...
              </div>
            )}
            {template.uploaded_filename && (
              <div className="mt-1 text-sm text-green-600">
                Uploaded: {template.uploaded_filename}
              </div>
            )}
          </div>
          
          {/* Manual Path Option */}
          <div className="text-sm text-gray-600 mb-2">Or enter file path manually:</div>
          <input
            type="text"
            value={template.cif || ''}
            onChange={(e) => handleFieldUpdate('cif', e.target.value)}
            className="form-input"
            placeholder="e.g., /path/to/template.cif"
            disabled={isUploading}
          />
          <div className="text-xs text-gray-500 mt-1">
            Upload a CIF/PDB file or enter the path to the template structure file
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chain IDs (optional)
          </label>
          <input
            type="text"
            value={template.chain_id || ''}
            onChange={(e) => handleFieldUpdate('chain_id', e.target.value)}
            className="form-input"
            placeholder="e.g., A,B"
          />
          <div className="text-xs text-gray-500 mt-1">
            Comma-separated chain IDs
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template IDs (optional)
          </label>
          <input
            type="text"
            value={template.template_id || ''}
            onChange={(e) => handleFieldUpdate('template_id', e.target.value)}
            className="form-input"
            placeholder="e.g., 1abc,2def"
          />
          <div className="text-xs text-gray-500 mt-1">
            Comma-separated template IDs
          </div>
        </div>
      </div>
    </div>
  )
}

export default TemplateInput 