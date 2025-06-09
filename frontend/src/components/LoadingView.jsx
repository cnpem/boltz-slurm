const LoadingView = ({ onComplete }) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="spinner mx-auto mb-6"></div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Running Prediction...
        </h2>
        
        <p className="text-gray-600 mb-8">
          This may take several minutes. The Boltz model is analyzing your sequences and predicting the protein-ligand binding structure and affinity.
        </p>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3">What's happening?</h3>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li>• Processing input sequences</li>
            <li>• Running multiple sequence alignment (if needed)</li>
            <li>• Generating structure predictions</li>
            <li>• Calculating binding affinity (if requested)</li>
            <li>• Analyzing confidence scores</li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          Your job will appear in the sidebar once completed. You can monitor the progress there.
        </p>
      </div>
    </div>
  )
}

export default LoadingView 