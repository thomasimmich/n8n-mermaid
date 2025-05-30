import WorkflowConverter from './components/WorkflowConverter'
import './App.css'

function App() {
  return (
    <div className="app">
      <header>
        <h1>n8n Workflow to Mermaid Converter</h1>
      </header>
      <main>
        <WorkflowConverter />
      </main>
    </div>
  )
}

export default App
