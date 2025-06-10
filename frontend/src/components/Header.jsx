const Header = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-20 shadow-2xl"
         style={{
           background: 'rgba(255, 255, 255, 0.2)',
           backdropFilter: 'blur(20px)',
           border: '1px solid rgba(255, 255, 255, 0.3)',
           borderTop: 'none',
           borderLeft: 'none',
           borderRight: 'none'
         }}>
      <div className="px-8 py-4 text-center">
        <h1 className="text-3xl font-black text-gray-800">
          Boltz-GUI
        </h1>
      </div>
    </div>
  )
}

export default Header 