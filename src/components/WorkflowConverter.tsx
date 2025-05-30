import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import mermaid from 'mermaid';
// import MDEditor from '@uiw/react-md-editor';
import { convertN8nToMermaid } from '../services/n8nConverter';

interface Node {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  name?: string;
  parameters?: {
    rules?: {
      values?: Array<{
        conditions?: {
          conditions?: Array<{
            leftValue: string;
            rightValue: string;
            operator: {
              type: string;
              operation: string;
            };
          }>;
        };
        outputKey?: string;
      }>;
    };
  };
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
        curve: 'basis',
        rankSpacing: 50,
        nodeSpacing: 50
      }
    });
  }, []);

  const getNodeLabel = (node: Node) => {
    const nodeType = node.type.split('.').pop() || '';
    const nodeName = node.name || nodeType;
    
    // Handle special node types
    if (nodeType === 'If' || nodeType === 'Switch') {
      return `${nodeName}\n[Condition]`;
    }
    
    return nodeName;
  };

  const getConnectionStyle = (node: Node, connection: Connection) => {
    const nodeType = node.type.split('.').pop() || '';
    
    if (nodeType === 'If') {
      return connection.sourceHandle === 'true' ? '-->' : '-.->';
    }
    
    if (nodeType === 'Switch') {
      // For Switch nodes, use the outputKey as the condition label
      const switchNode = node as Node & { parameters?: { rules?: { values?: Array<{ outputKey?: string }> } } };
      const outputKey = switchNode.parameters?.rules?.values?.find(v => v.outputKey === connection.sourceHandle)?.outputKey;
      return outputKey ? '-->' : '-.->';
    }
    
    return '-->';
  };

  const getConnectionLabel = (node: Node, connection: Connection) => {
    const nodeType = node.type.split('.').pop() || '';
    
    if (nodeType === 'Switch') {
      const switchNode = node as Node & { parameters?: { rules?: { values?: Array<{ outputKey?: string }> } } };
      const outputKey = switchNode.parameters?.rules?.values?.find(v => v.outputKey === connection.sourceHandle)?.outputKey;
      return outputKey ? `|${outputKey}|` : '';
    }
    
    if (nodeType === 'If') {
      return connection.sourceHandle ? `|${connection.sourceHandle}|` : '';
    }
    
    return '';
  };

  // This function is now unused since convertN8nToMermaid is in a separate file
  // const convertToMermaid = (workflow: Workflow) => {
  //   let mermaidCode = 'flowchart TB;\n';
    
  //   // Add nodes
  //   workflow.nodes.forEach((node) => {
  //     const nodeLabel = getNodeLabel(node);
  //     mermaidCode += `    ${node.id}["${nodeLabel}"];\n`;
  //   });

  //   // Add connections
  //   Object.entries(workflow.connections).forEach(([sourceId, connections]) => {
  //     if (Array.isArray(connections)) {
  //       const sourceNode = workflow.nodes.find(n => n.id === sourceId);
  //       if (sourceNode) {
  //         connections.forEach((connection) => {
  //           const arrow = getConnectionStyle(sourceNode, connection);
  //           const label = getConnectionLabel(sourceNode, connection);
  //           mermaidCode += `    ${sourceId} ${arrow}${label} ${connection.target};\n`;
  //         });
  //       }
  //     }
  //   });

  //   return mermaidCode;
  // };

  const renderDiagram = useCallback(async (code: string) => {
    if (mermaidRef.current) {
      try {
        mermaidRef.current.innerHTML = '';
        // Use the raw code for rendering
        const cleanCode = code.trim();
        if (!cleanCode) { // Also check for empty code after trimming
          mermaidRef.current.innerHTML = 'Error: Empty Mermaid diagram.';
          return;
        }
        const { svg } = await mermaid.render('mermaid-diagram', cleanCode);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      } catch (error: unknown) {
        console.error('Error rendering diagram:', error);
        if (mermaidRef.current) {
           mermaidRef.current.innerHTML = `Error rendering diagram: ${(error as Error).message || error}`;;
        }
      }
    }
  }, []);

   // Effect to render the diagram when mermaidDiagram state changes and showCode is false
  useEffect(() => {
    if (mermaidDiagram && !showCode) {
      renderDiagram(mermaidDiagram);
    }
  }, [mermaidDiagram, showCode, renderDiagram]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const n8nJsonString = e.target?.result as string;
          const mermaidCode = convertN8nToMermaid(n8nJsonString);
          setMermaidDiagram(mermaidCode); // Store raw mermaid code
          // No immediate render here, let the useEffect handle it when showCode is false
          // renderDiagram(mermaidCode); 
        } catch (error: unknown) {
          console.error('Error parsing workflow:', error);
          alert(`Error parsing workflow file: ${(error as Error).message || error}`);
        }
      };
      reader.readAsText(file);
    }
  }, [/* Removed renderDiagram dependency */]); // Removed renderDiagram as dependency to avoid infinite loop

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
            <pre className="mermaid-code-output" style={{
              textAlign: 'left',
              backgroundColor: '#f4f4f4',
              padding: '10px',
              borderRadius: '4px',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, Consolas, source-code-pro, monospace',
              fontSize: '14px'
            }}>
              {mermaidDiagram}
            </pre>
          ) : (
            <div ref={mermaidRef} className="mermaid-diagram" />
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowConverter; 