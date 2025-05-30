import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import mermaid from 'mermaid';
import MDEditor from '@uiw/react-md-editor';

interface Node {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  name?: string;
}

interface Connection {
  source: string;
  target: string;
  sourceHandle?: string;
}

interface Workflow {
  nodes: Node[];
  connections: Record<string, Connection[]>;
}

const WorkflowConverter = () => {
  const [mermaidDiagram, setMermaidDiagram] = useState<string>('');
  const [showCode, setShowCode] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);

  const convertToMermaid = (workflow: Workflow) => {
    let mermaidCode = 'flowchart TD;\n';
    
    // Add nodes
    workflow.nodes.forEach((node) => {
      const nodeLabel = node.name || node.type.split('.').pop() || node.id;
      mermaidCode += `    ${node.id}["${nodeLabel}"];\n`;
    });

    // Add connections
    Object.entries(workflow.connections).forEach(([sourceId, connections]) => {
      if (Array.isArray(connections)) {
        connections.forEach((connection) => {
          const arrow = connection.sourceHandle === 'else' ? '-.->' : '-->';
          mermaidCode += `    ${sourceId} ${arrow} ${connection.target};\n`;
        });
      }
    });

    return mermaidCode;
  };

  const renderDiagram = useCallback(async (code: string) => {
    if (mermaidRef.current) {
      try {
        mermaidRef.current.innerHTML = '';
        const { svg } = await mermaid.render('mermaid-diagram', code);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Error rendering diagram:', error);
      }
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target?.result as string) as Workflow;
          const mermaidCode = convertToMermaid(workflow);
          setMermaidDiagram(mermaidCode);
          renderDiagram(mermaidCode);
        } catch (error) {
          console.error('Error parsing workflow:', error);
          alert('Error parsing workflow file. Please make sure it\'s a valid n8n workflow JSON.');
        }
      };
      reader.readAsText(file);
    }
  }, [renderDiagram]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    multiple: false
  });

  return (
    <div className="workflow-converter">
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '4px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '20px',
          backgroundColor: isDragActive ? '#f0f0f0' : 'white'
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the n8n workflow file here...</p>
        ) : (
          <p>Drag and drop an n8n workflow JSON file here, or click to select one</p>
        )}
      </div>
      
      {mermaidDiagram && (
        <div className="mermaid-output">
          <div className="mermaid-controls">
            <button 
              onClick={() => setShowCode(!showCode)}
              style={{
                padding: '8px 16px',
                marginBottom: '10px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showCode ? 'Show Diagram' : 'Show Code'}
            </button>
          </div>
          
          {showCode ? (
            <MDEditor
              value={`\`\`\`mermaid\n${mermaidDiagram}\n\`\`\``}
              preview="live"
              hideToolbar={true}
              height={400}
              onChange={(value) => {
                if (value) {
                  const code = value.replace(/```mermaid\n|\n```/g, '');
                  setMermaidDiagram(code);
                  renderDiagram(code);
                }
              }}
            />
          ) : (
            <div ref={mermaidRef} className="mermaid-diagram" />
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowConverter; 