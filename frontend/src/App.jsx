import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import InputView from './components/InputView'
import ResultsView from './components/ResultsView'
import LoadingView from './components/LoadingView'
import LandingPage from './components/LandingPage'

// Main componente da aplicação, nela são exibidos os diferentes componentes com base no estado atual
// Inicia os estados:
//        currentView: 'landing' -> Controla qual "tela" está visível
//        selectedJobId: null -> Armazena o ID do job selecionado ou null caso não tenha "(null) = default"
//        jobs: [] -> Armazena a lista de jobs carregados do backend
// Carrega a lista de jobs ao montar o componente APP

function App() {
  const [currentView, setCurrentView] = useState('landing') //Controla qual "tela" está visível
  const [selectedJobId, setSelectedJobId] = useState(null) //Armazena o ID do job selecionado ou null caso não tenha
  const [jobs, setJobs] = useState([]) //Armazena a lista de jobs carregados do backend

  // Load jobs on component mount
  useEffect(() => {
    loadJobs()
  }, [])


  // Função para carregar a lista de Jobs
  // faz um fetch(get) no endpoint /api/jobs -> endpoint responsável por retornar os jobs caso existam dentro do diretório JOB
  // Chama o método setJobs para atualizar o estado com a lista de jobs recebida
  const loadJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      const data = await response.json()
      setJobs(data.jobs)
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }


  // Função para selecionar um job específico
  // Seta o estado selectedJob para guarda o ID do job selecionado
  // Seta estado currentView para 'results' e re renderiza o component APP
  const selectJob = async (jobId) => {
    setSelectedJobId(jobId)
    setCurrentView('results')
  }

  // Função para mudar a visualização atual
  // Seta o estado da current view, e em caso de uma nova entrada (inputView), reseta o selectedJobId para null
  const showView = (viewName) => {
    setCurrentView(viewName)
    if (viewName === 'input') {
      setSelectedJobId(null)
    }
  }

  // Função para lidar com a conclusão de um job
  // Seta o estado selectedJobId para o ID do job concluído
  // Seta current view para 'results'
  const handleJobCompleted = (jobId) => {
    // When a job completes in LoadingView, switch to results view
    setSelectedJobId(jobId)
    setCurrentView('results')
    // Also refresh the jobs list
    loadJobs()
  }

  // Função para setar a view para o componente inputview ativada pela prop onGetStarted
  // Seta o estado currentView para 'input' (todo set re renderiza o componente)
  const handleGetStarted = () => {
    setCurrentView('input')
  }

  // Função para lidar com o clique no botão Home na sidebar
  // Seta a view para a home do aplicativo, normalmente ativado pela prop onHome
  // Seta o estado selectedJobId para null
  const handleHome = () => {
    setCurrentView('landing')
    setSelectedJobId(null)
  }
  // Render do componente
  // Show landing page without header and sidebar
  if (currentView === 'landing') {
    // retorna o compontent landingPage e seta a propriedade 
    // onGetStarted para chamar a função handleGetStarted
    return <LandingPage onGetStarted={handleGetStarted} />
  }
  // TODO continuar documentando apartir daqui
  return (
    <div className="min-h-screen main-container">
      {/* Fixed Header */}
      <Header />
      
      {/* Fixed Sidebar */}
      <Sidebar 
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectJob={selectJob}
        onNewJob={() => showView('input')}
        onRefreshJobs={loadJobs}
        onHome={handleHome}
      />

      {/* Main Content with margins to account for fixed header and sidebar */}
      <div className="ml-96 pt-20 min-h-screen flex flex-col">
        {currentView === 'input' && (
          <InputView 
            onJobSubmitted={loadJobs}
            onShowLoading={() => setCurrentView('loading')}
          />
        )}
        
        {currentView === 'results' && (
          <ResultsView 
            jobId={selectedJobId}
            onBackToInput={() => showView('input')}
            onNewJob={() => showView('input')}
          />
        )}
        
        {currentView === 'loading' && (
          <LoadingView 
            onComplete={() => {
              loadJobs()
              setCurrentView('input')
            }}
            onJobCompleted={handleJobCompleted}
          />
        )}
      </div>
    </div>
  )
}

export default App
