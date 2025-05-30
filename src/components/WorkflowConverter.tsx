import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import mermaid from 'mermaid';

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
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  const convertToMermaid = (workflow: Workflow) => {
    let mermaidCode = 'graph TD;\n';
    
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target?.result as string) as Workflow;
          const mermaidCode = convertToMermaid(workflow);
          setMermaidDiagram(mermaidCode);
          
          // Render the diagram
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = '';
            mermaid.render('mermaid-diagram', mermaidCode).then(({ svg }) => {
              if (mermaidRef.current) {
                mermaidRef.current.innerHTML = svg;
              }
            });
          }
        } catch (error) {
          console.error('Error parsing workflow:', error);
          alert('Error parsing workflow file. Please make sure it\'s a valid n8n workflow JSON.');
        }
      };
      reader.readAsText(file);
    }
  }, []);

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
      
      <div ref={mermaidRef} className="mermaid-diagram" />
    </div>
  );
};

export default WorkflowConverter; 