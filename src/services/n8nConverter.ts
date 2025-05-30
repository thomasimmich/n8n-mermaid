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

/**
 * Converts an n8n workflow JSON string into a Mermaid.js flowchart definition.
 * @param {string} n8nJsonString - The JSON string exported from an n8n workflow.
 * @returns {string} Mermaid.js flowchart string
 */
export function convertN8nToMermaid(n8nJsonString: string): string {
  try {
    const workflow = JSON.parse(n8nJsonString) as Workflow;
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};

    const nodeMap = new Map<string, string>();
    const nodeLabels: string[] = [];

    // Define nodes
    nodes.forEach((node, index) => {
      const nodeType = node.type.split('.').pop() || '';
      const nodeName = node.name || nodeType;
      // Use a simple identifier for the node
      const nodeId = `node${index}`;
      const label = `${nodeId}["${nodeName}\n(${nodeType})"]`;
      nodeLabels.push(label);
      nodeMap.set(node.id, nodeId);
    });

    const edges: string[] = [];

    // Define connections (edges)
    Object.entries(connections).forEach(([sourceId, connections]) => {
      if (!Array.isArray(connections)) return;

      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return;

      connections.forEach((connection) => {
        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(connection.target);
        if (source && target) {
          const nodeType = sourceNode.type.split('.').pop() || '';
          let arrow = '-->';
          let label = '';

          if (nodeType === 'If') {
            arrow = connection.sourceHandle === 'true' ? '-->' : '-.->';
            label = connection.sourceHandle ? `|${connection.sourceHandle}|` : '';
          } else if (nodeType === 'Switch') {
            const switchNode = sourceNode as Node & { parameters?: { rules?: { values?: Array<{ outputKey?: string }> } } };
            const outputKey = switchNode.parameters?.rules?.values?.find(v => v.outputKey === connection.sourceHandle)?.outputKey;
            arrow = outputKey ? '-->' : '-.->';
            label = outputKey ? `|${outputKey}|` : '';
          }

          edges.push(`${source} ${arrow}${label} ${target}`);
        }
      });
    });

    // Build Mermaid string with proper indentation
    const mermaidLines = [
      'flowchart TB',
      ...nodeLabels.map(label => `    ${label}`),
      ...edges.map(edge => `    ${edge}`)
    ];

    return mermaidLines.join('\n');
  } catch (error) {
    console.error('Invalid n8n JSON or conversion error:', error);
    return '// Error parsing n8n workflow';
  }
} 