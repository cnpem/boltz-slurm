import { useState, useEffect } from 'react'
import SequenceInput from './SequenceInput'
import ConstraintInput from './ConstraintInput'
import TemplateInput from './TemplateInput'

// Componente InputView que gerencia o formulário de entrada para submissão de jobs
const InputView = ({ onJobSubmitted, onShowLoading, onBackToHome }) => {
  const [jobName, setJobName] = useState('') // Guardo o estado do jobname com set para atualizar o jobname atual, inicia vazio
  const [sequences, setSequences] = useState([]) // Guardo o estado das sequências com set para atualizar as sequências atuais, inicia vazio
  const [constraints, setConstraints] = useState([]) // Guardo o estado das restrições com set para atualizar as restrições atuais, inicia vazio
  const [templates, setTemplates] = useState([]) // Guardo o estado dos templates com set para atualizar os templates atuais, inicia vazio
  const [enableAffinity, setEnableAffinity] = useState(false) // Guardo o estado da afinidade com set para atualizar a afinidade atual, inicia falso
  const [affinityBinder, setAffinityBinder] = useState('') // Guardo o estado do binder de afinidade com set para atualizar o binder de afinidade atual, inicia vazio
  const [isSubmitting, setIsSubmitting] = useState(false) // Guardo o estado de submissão com set para atualizar o estado de submissão atual, inicia falso
  const [showExamples, setShowExamples] = useState(false) // Guardo o estado de exibição de exemplos com set para atualizar o estado de exibição de exemplos atual, inicia falso

  // Example templates
  const examples = [
    {
      id: 'affinity',
      name: 'Protein-Ligand Affinity',
      description: 'Predict binding affinity between a protein and small molecule',
      data: {
        jobName: 'Protein-Ligand Affinity Example',
        sequences: [
          {
            id: Date.now().toString() + '_1',
            entity_type: 'protein',
            chainId: 'A',
            sequence: 'MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ',
            smiles: '',
            ccd: '',
            msa: '',
            cyclic: false
          },
          {
            id: Date.now().toString() + '_2',
            entity_type: 'ligand',
            chainId: 'B',
            sequence: '',
            smiles: 'N[C@@H](Cc1ccc(O)cc1)C(=O)O',
            ccd: '',
            msa: '',
            cyclic: false
          }
        ],
        affinityEnabled: true,
        affinityBinder: 'B'
      }
    },
    {
      id: 'cyclic',
      name: 'Cyclic Protein',
      description: 'Predict structure of a cyclic protein peptide',
      data: {
        jobName: 'Cyclic Protein Example',
        sequences: [
          {
            id: Date.now().toString() + '_1',
            entity_type: 'protein',
            chainId: 'A',
            sequence: 'QLEDSEVEAVAKG',
            smiles: '',
            ccd: '',
            msa: '',
            cyclic: true
          }
        ],
        affinityEnabled: false,
        affinityBinder: ''
      }
    },
    {
      id: 'multiple_ligands',
      name: 'Multiple Ligands',
      description: 'Protein with multiple ligands using CCD and SMILES',
      data: {
        jobName: 'Multiple Ligands Example',
        sequences: [
          {
            id: Date.now().toString() + '_1',
            entity_type: 'protein',
            chainId: 'A',
            sequence: 'MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ',
            smiles: '',
            ccd: '',
            msa: '',
            cyclic: false
          },
          {
            id: Date.now().toString() + '_2',
            entity_type: 'ligand',
            chainId: 'C',
            sequence: '',
            smiles: '',
            ccd: 'SAH',
            msa: '',
            cyclic: false
          },
          {
            id: Date.now().toString() + '_3',
            entity_type: 'ligand',
            chainId: 'D',
            sequence: '',
            smiles: 'N[C@@H](Cc1ccc(O)cc1)C(=O)O',
            ccd: '',
            msa: '',
            cyclic: false
          }
        ],
        affinityEnabled: false,
        affinityBinder: ''
      }
    },
    {
      id: 'multimer',
      name: 'Protein Multimer',
      description: 'Predict complex structure of multiple proteins',
      data: {
        jobName: 'Protein Multimer Example',
        sequences: [
          {
            id: Date.now().toString() + '_1',
            entity_type: 'protein',
            chainId: 'A',
            sequence: 'MAHHHHHHVAVDAVSFTLLQDQLQSVLDTLSEREAGVVRLRFGLTDGQPRTLDEIGQVYGVTRERIRQIESKTMSKLRHPSRSQVLRDYLDGSSGSGTPEERLLRAIFGEKA',
            smiles: '',
            ccd: '',
            msa: '',
            cyclic: false
          },
          {
            id: Date.now().toString() + '_2',
            entity_type: 'protein',
            chainId: 'B',
            sequence: 'MRYAFAAEATTCNAFWRNVDMTVTALYEVPLGVCTQDPDRWTTTPDDEAKTLCRACPRRWLCARDAVESAGAEGLWAGVVIPESGRARAFALGQLRSLAERNGYPVRDHRVSAQSA',
            smiles: '',
            ccd: '',
            msa: '',
            cyclic: false
          }
        ],
        affinityEnabled: false,
        affinityBinder: ''
      }
    },
    // {
    //   id: 'pocket_constraints',
    //   name: 'Pocket Constraints',
    //   description: 'Protein-ligand prediction with pocket constraints',
    //   data: {
    //     jobName: 'Pocket Constraints Example',
    //     sequences: [
    //       {
    //         id: Date.now().toString() + '_1',
    //         entity_type: 'protein',
    //         chainId: 'A1',
    //         sequence: 'MYNMRRLSLSPTFSMGFHLLVTVSLLFSHVDHVIAETEMEGEGNETGECTGSYYCKKGVILPIWEPQDPSFGDKIARATVYFVAMVYMFLGVSIIADRFMSSIEVITSQEKEITIKKPNGETTKTTVRIWNETVSNLTLMALGSSAPEILLSVIEVCGHNFTAGDLGPSTIVGSAAFNMFIIIALCVYVVPDGETRKIKHLRVFFVTAAWSIFAYTWLYIILSVISPGVVEVWEGLLTFFFFPICVVFAWVADRRLLFYKYVYKRYRAGKQRGMIIEHEGDRPSSKTEIEMDGKVVNSHVENFLDGALVLEVDERDQDDEEARREMARILKELKQKHPDKEIEQLIELANYQVLSQQQKSRAFYRIQATRLMTGAGNILKRHAADQARKAVSMHEVNTEVTENDPVSKIFFEQGTYQCLENCGTVALTIIRRGGDLTNTVFVDFRTEDGTANAGSDYEFTEGTVVFKPGDTQKEIRVGIIDDDIFEEDENFLVHLSNVKVSSEASEDGILEANHVSTLACLGSPSTATVTIFDDDHAGIFTFEEPVTHVSESIGIMEVKVLRTSGARGNVIVPYKTIEGTARGGGEDFEDTCGELEFQNDEIVKIITIRIFDREEYEKECSFSLVLEEPKWIRRGMKGGFTITDEYDDKQPLTSKEEEERRIAEMGRPILGEHTKLEVIIEESYEFKSTVDKLIKKTNLALVVGTNSWREQFIEAITVSAGEDDDDDECGEEKLPSCFDYVMHFLTVFWKVLFAFVPPTEYWNGWACFIVSILMIGLLTAFIGDLASHFGCTIGLKDSVTAVVFVALGTSVPDTFASKVAATQDQYADASIGNVTGSNAVNVFLGIGVAWSIAAIYHAANGEQFKVSPGTLAFSVTLFTIFAFINVGVLLYRRRPEIGGELGGPRTAKLLTSCLFVLLWLLYIFFSSLEAYCHIKGF',
    //         smiles: '',
    //         ccd: '',
    //         msa: '',
    //         cyclic: false
    //       },
    //       {
    //         id: Date.now().toString() + '_2',
    //         entity_type: 'ligand',
    //         chainId: 'B1',
    //         sequence: '',
    //         smiles: '',
    //         ccd: 'EKY',
    //         msa: '',
    //         cyclic: false
    //       }
    //     ],
    //     affinityEnabled: false,
    //     affinityBinder: '',
    //     constraints: [
    //       {
    //         id: Date.now().toString() + '_constraint_1',
    //         type: 'pocket',
    //         binder: 'B1',
    //         contacts: 'A1,829\nA1,138',
    //         maxDistance: ''
    //       }
    //     ]
    //   }
    // },
    {
      id: 'single_protein',
      name: 'Single Protein',
      description: 'Simple protein structure prediction',
      data: {
        jobName: 'Single Protein Example',
        sequences: [
          {
            id: Date.now().toString() + '_1',
            entity_type: 'protein',
            chainId: 'A',
            sequence: 'QLEDSEVEAVAKGLEEMYANGVTEDNFKNYVKNNFAQQEISSVEEELNVNISDSCVANKIKDEFFAMISISAIVKAAQKKAWKELAVTVLRFAKANGLKTNAIIVAGQLALWAVQCG',
            smiles: '',
            ccd: '',
            msa: '',
            cyclic: false
          }
        ],
        affinityEnabled: false,
        affinityBinder: ''
      }
    }
  ]

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

  // Função para adicionar uma nova sequência
  // Adiciona uma nova sequência ao estado com valores default no input
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

  // Função para atualizar uma sequência existente
  const updateSequence = (id, updates) => {
    // Recebe id e dados
    // Chama o setter do estado sequences
    // Verifica cada sequência na lista e substitui
    // com as de mesmo dado
    setSequences(prev => prev.map(seq => 
      seq.id === id ? { ...seq, ...updates } : seq
    ))
  }

  // Função para remove a sequence do array de sequencias

  const removeSequence = (id) => {
    // Filtra o array de sequências pelo id passado
    setSequences(prev => prev.filter(seq => seq.id !== id))
  }

  // Adciciona constraint e as opções 
  const addConstraint = (type) => {
    const newConstraint = {
      id: Date.now().toString(),
      type: type,
      // Initialize fields based on type
      ...(type === 'bond' && { atom1: '', atom2: '' }),
      ...(type === 'pocket' && { binder: '', contacts: '', max_distance: null }),
      ...(type === 'contact' && { token1: '', token2: '', max_distance: null })
    }
    // Seta estado com a nova constraint
    setConstraints(prev => [...prev, newConstraint])
  }

  // Função para atualizar uma constraint existente
  const updateConstraint = (id, updates) => {
    setConstraints(prev => prev.map(constraint => 
      constraint.id === id ? { ...constraint, ...updates } : constraint
    ))
  }

  const removeConstraint = (id) => {
    setConstraints(prev => prev.filter(constraint => constraint.id !== id))
  }

  // Função para adicionar um template
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

  // Função para obter o ID da cadeia padrão
  const getDefaultChainId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    return letters[sequences.length] || 'A'
  }

  // Função para validar o formulário antes da submissão
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

  // Processa as constraints para submissão
  const processConstraintsForSubmission = () => {
    // Converte os números de string para inteiro
    const parseContactTokens = (tokens) => {
      return tokens.map(token => {
        // Convert string residue indices to integers
        if (!isNaN(token) && token !== '') {
          return parseInt(token, 10)
        }
        return token
      })
    }

    // Retorna as constraints processadas
    return constraints.map(constraint => {
      // Cria um objeto para armazenar o resultado
      const result = {}

      // Processa as constraints com base no tipo
      if (constraint.type === 'bond') {
        // Converte a string em integer
        result.bond = {
          atom1: parseContactTokens(constraint.atom1.split(',').map(s => s.trim())),
          atom2: parseContactTokens(constraint.atom2.split(',').map(s => s.trim()))
        }
      } else if (constraint.type === 'pocket') {
        // Converte a string em integer
        const contacts = constraint.contacts.split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .map(line => parseContactTokens(line.split(',').map(s => s.trim())))
        // Alimenta o objeto result com o pocket e atribui qual o binder e os residuos de contato
        // exemplo:
        // binder: 'A',
        // contacts: [[1, 2], [3, 4]]
        // max_distance: 5
        // TODO: force: true ou false para forçar o binder no sitio
        result.pocket = {
          binder: constraint.binder,
          contacts: contacts
        }
        
        if (constraint.max_distance) {
          result.pocket.max_distance = constraint.max_distance
        }
      } else if (constraint.type === 'contact') {
        result.contact = {
          token1: parseContactTokens(constraint.token1.split(',').map(s => s.trim())),
          token2: parseContactTokens(constraint.token2.split(',').map(s => s.trim()))
        }
        
        if (constraint.max_distance) {
          result.contact.max_distance = constraint.max_distance
        }
      }
      
      return result
    }).filter(constraint => Object.keys(constraint).length > 0) // Filtra pelas constrains que estão populadas
  }

  // Função responsável por processar os templates antes da submissão
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
  // Função para lidar com a submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    onShowLoading()

    try {
      // Prepare o formulaario para envia, adicionando a propriedade
      // no array no spread somente se o valor a esquerda do && for verdadeiro
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
      
      // Faz o fetch usando POST na rota /predict da api
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

  // Função para obter as opções de binder
  const getBinderOptions = () => {
    return sequences.map(seq => ({
      value: seq.chainId,
      label: `${seq.chainId} (${seq.entity_type})`
    }))
  }
  // Função para carregar um exemplo pré-definido
  // Atualiza o estado com os dados do exemplo selecionado
  const loadExample = (example) => {
    setJobName(example.data.jobName)
    
    // Generate fresh IDs for the sequences to avoid conflicts
    const sequencesWithNewIds = example.data.sequences.map((seq, index) => ({
      ...seq,
      id: Date.now().toString() + '_seq_' + index
    }))
    // popula o estado com a sequencia selecionada
    setSequences(sequencesWithNewIds)
    // seta a afinidade para true
    setEnableAffinity(example.data.affinityEnabled)
    // seta o binder para calcular afinidade
    setAffinityBinder(example.data.affinityBinder)
    setShowExamples(false)
    
    // Load constraints if they exist in the example
    if (example.data.constraints && example.data.constraints.length > 0) {
      const constraintsWithNewIds = example.data.constraints.map((constraint, index) => ({
        ...constraint,
        id: Date.now().toString() + '_constraint_' + index
      }))
      // seta o constraints com novos IDs
      setConstraints(constraintsWithNewIds)
    } else {
      setConstraints([])
    }
    
    // Load templates if they exist in the example
    if (example.data.templates && example.data.templates.length > 0) {
      const templatesWithNewIds = example.data.templates.map((template, index) => ({
        ...template,
        id: Date.now().toString() + '_template_' + index
      }))
      setTemplates(templatesWithNewIds)
    } else {
      setTemplates([])
    }
    
    // Show a brief notification
    setTimeout(() => {
      alert(`Loaded example: ${example.name}`)
    }, 100)
  }

  // Renderiza o component com as propriedas e estados
  return (
    <div className="flex-1 p-8 overflow-y-auto main-container">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="card-header mb-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBackToHome} className="btn-secondary">
              ← Back to Home
            </button>
          </div>
          
          <h1 className="text-4xl font-black text-gray-800 mb-4">
            Create New Prediction
          </h1>
          <p className="text-gray-600 text-lg font-semibold">
            Configure your Boltz-2 prediction job
          </p>
        </div>

        {/* Examples Section */}
        <div className="mb-8">
          <div className="rounded-2xl p-6 shadow-2xl transition-all duration-500 hover:scale-[1.01] affinity-section">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-black text-blue-800 mb-2">Quick Start Examples</h2>
                <p className="text-blue-700 font-semibold">Load pre-configured examples to get started quickly</p>
              </div>
              <button
                onClick={() => setShowExamples(!showExamples)} // Alterna a visibilidade dos exemplos. inicia nao visivel
                className="btn-primary bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
              >
                <span>{showExamples ? 'Hide' : 'Show'} Examples</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showExamples ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {showExamples && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {examples.map((example) => (
                  <div
                    key={example.id}
                    className="rounded-xl p-4 shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onClick={() => loadExample(example)}
                  >
                    <h3 className="font-bold text-blue-800 mb-2">{example.name}</h3>
                    <p className="text-sm text-blue-600 mb-3">{example.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-1">
                        {example.data.sequences.map((sequence, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              sequence.entity_type === 'protein' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {sequence.entity_type}
                          </span>
                        ))}
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
                        Load →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Job Name Section */}
          <div className="input-section">
            <h2 className="section-title">Job Information</h2>
            <div className="space-y-4">
              <div>
                <label className="input-label">
                  Job Name (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="Enter a descriptive name for this job..."
                />
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  A custom name helps you identify this job later. If left empty, a unique ID will be generated.
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
          {/*
          <div className="card">
            <details className="space-y-6">
              <summary className="text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600">
                Advanced Options
              </summary>
              
              <div className="mt-6 space-y-6">
              */}
                {/* Constraints */}
                {/*
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
                */}
                {/* Templates */}
                {/*
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
*/} 
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