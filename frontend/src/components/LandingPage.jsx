import { useState } from 'react'
import boltzImage from '../assets/boltz1_pred_figure.png'

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen main-container">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-black text-gray-800 mb-6">
            Boltz GUI
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto font-medium">
            A user-friendly interface for running Boltz-2 predictions with beautiful visualizations 
            and streamlined workflows for protein-ligand co-folding and binding affinity prediction.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-12 mb-16">
          {/* Image Section */}
          <div>
            <div className="results-section from-blue-50 to-cyan-50 border-blue-300 p-8">
              <img 
                src={boltzImage} 
                alt="Boltz Prediction Visualization" 
                className="w-full h-auto rounded-2xl shadow-xl border-3 border-gray-300"
              />
            </div>
          </div>
            {/* Button Section */}
          <div>
            <button
              onClick={onGetStarted}
              className="btn-submit w-full text-xl py-6"
            >
              Try Boltz-2 Now
            </button>
          </div>
          
          {/* Content Section */}
          <div>
            <div className="results-section from-green-50 to-emerald-50 border-green-300">
              <h2 className="text-3xl font-black text-gray-800 mb-6">Why Boltz GUI?</h2>
              <div className="space-y-4 text-gray-700">
                <p className="font-semibold text-lg">
                  Running Boltz predictions has never been easier. Our GUI eliminates the complexity 
                  of command-line interfaces and provides:
                </p>
                <ul className="space-y-3 text-base">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span className="font-semibold">Intuitive job management with custom naming</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span className="font-semibold">Interactive 3D structure visualization</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span className="font-semibold">Comprehensive results analysis and interpretation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span className="font-semibold">Real-time job monitoring and status tracking</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
          {/* Feature 1 */}
          <div className="results-section from-purple-50 to-pink-50 border-purple-300">
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-black text-gray-800 mb-3">Lightning Fast</h3>
              <p className="text-gray-700 font-semibold">
                Boltz-2 runs <strong>1000x faster</strong> than traditional FEP methods 
                while approaching their accuracy.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="results-section from-blue-50 to-cyan-50 border-blue-300">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-black text-gray-800 mb-3">Accurate Predictions</h3>
              <p className="text-gray-700 font-semibold">
                First deep learning model to approach <strong>FEP-level accuracy</strong> 
                in binding affinity prediction.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="results-section from-green-50 to-emerald-50 border-green-300">
            <div className="text-center">
              <div className="text-4xl mb-4">🔬</div>
              <h3 className="text-xl font-black text-gray-800 mb-3">Complete Analysis</h3>
              <p className="text-gray-700 font-semibold">
                Joint structure and binding affinity prediction with 
                <strong>comprehensive confidence scores</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* About Boltz-2 Section */}
        <div className="results-section from-slate-50 to-gray-50 border-gray-300 mb-16">
          <h2 className="text-3xl font-black text-gray-800 mb-6 text-center">About Boltz-2</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Revolutionary Technology</h3>
              <p className="text-gray-700 font-semibold mb-4">
                Developed by researchers at <strong>MIT</strong> and <strong>Recursion</strong>, 
                Boltz-2 is a next-generation biomolecular foundation model that goes beyond 
                AlphaFold3 by jointly modeling complex structures and binding affinities.
              </p>
              <p className="text-gray-700 font-semibold">
                Used by <strong>thousands of scientists</strong> across leading academic labs, 
                biotechs, and all 20 largest pharmaceutical companies.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Open Science</h3>
              <p className="text-gray-700 font-semibold mb-4">
                Released under the <strong>MIT License</strong>, making it freely available 
                for both academic and commercial use. This GUI makes the power of Boltz-2 
                accessible to researchers without computational expertise.
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-bold mr-2">•</span>
                  <span className="font-semibold">Outperformed all methods in CASP16 affinity challenge</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-bold mr-2">•</span>
                  <span className="font-semibold">Comparable to OpenFE/FEP+ workflows</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="results-section affinity-section max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-gray-800 mb-6">Read about Boltz-2</h2>
            <p className="text-lg text-gray-700 font-semibold mb-8">
              Check out the Github and paper for more information.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/jwohlwend/boltz"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary align-middle"
              >
                Github
              </a>
              <a
                href="https://cdn.prod.website-files.com/68404fd075dba49e58331ad9/6842ee1285b9af247ac5a122_boltz2.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary align-middle"
              >
                Boltz-2 Paper
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage 