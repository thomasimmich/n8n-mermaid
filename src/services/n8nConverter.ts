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
        content?: string; // Added for sticky note content
      }>;
    };
  };
}

interface Connection {
  node: string; // The name of the target node
  type: string; // The type of connection (e.g., 'main', 'additional')
  index: number; // The index of the input on the target node
  sourceHandle?: string; // The handle on the source node for conditional connections
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

      // Skip sticky note nodes for now
      if (nodeType === 'stickyNote') {
        return; 
      }

      // Use node.name if available, otherwise fallback to node.type or node.id for the key
      const nodeKey = node.name || node.type || node.id; 
      const nodeId = `node${index}`;
      const label = `${nodeId}["${node.name || nodeType}\n(${nodeType})"]`; // Use node.name or type for display
      nodeLabels.push(label);
      nodeMap.set(nodeKey, nodeId); // Map using a more robust key

      // Add sticky note content as a comment if available
      if (nodeType === 'stickyNote' && node.parameters && 'content' in node.parameters && typeof node.parameters.content === 'string') {
        const commentContent = node.parameters.content.replace(/\n/g, ' ').substring(0, 100) + (node.parameters.content.length > 100 ? '...' : ''); // Limit comment length
        nodeLabels.push(`%% ${commentContent}`);
      }
    });

    const edges: string[] = [];

    // Define connections (edges)
    console.log('Processing connections...');
    Object.entries(connections).forEach(([sourceKey, outputInfo]) => { // Use sourceKey from connections object
      // outputInfo should be an object where keys are output names (e.g., 'main') and values are arrays of connection arrays
      if (typeof outputInfo !== 'object' || outputInfo === null) { 
         console.warn(`Output info for ${sourceKey} is not an object.`, outputInfo);
        return;
      }

      // Find the source node using the sourceKey (which should be the node name)
      const sourceNode = nodes.find(n => (n.name || n.type || n.id) === sourceKey); 
      if (!sourceNode) { 
        console.warn(`Source node with key ${sourceKey} not found in nodes array.`);
        return; // Ensure the source node exists
      }

      const sourceId = nodeMap.get(sourceKey); // Get source ID using the robust key
      if (!sourceId) { 
           console.warn(`Source nodeId not found in map for key ${sourceKey}.`);
           return;
      }

      // Iterate through the output ports (e.g., 'main', 'else')
      Object.entries(outputInfo).forEach(([outputName, outputBranches]) => {
        if (!Array.isArray(outputBranches)) { // Ensure it's an array of connection arrays for this output
             console.warn(`Output branches for ${sourceKey} -> ${outputName} is not an array.`, outputBranches);
            return;
        }

        // outputBranches is an array of arrays, where each inner array represents connections from a single output
        outputBranches.forEach((connectionsArray, outputIndex) => { // Iterate through each inner array/branch from this output port
          if (!Array.isArray(connectionsArray)) { // Ensure it's an array of connections
               console.warn(`Connections array for ${sourceKey} -> ${outputName} output index ${outputIndex} is not an array.`, connectionsArray);
              return;
          }

          connectionsArray.forEach((connection: Connection) => { // Iterate through each connection object, explicitly typed
            // The target is referenced by node name in connection.node
            const targetKey = connection.node; 
            const targetId = nodeMap.get(targetKey); // Get target ID using target node name as key

            console.log(`Checking connection from ${sourceKey} (output: ${outputName}, outputIndex: ${outputIndex}, handle: ${connection.sourceHandle}, target input index: ${connection.index}): targetKey=${targetKey}, targetId=${targetId}`);

            if (targetId) { // Only add edge if target node is found
              const nodeType = sourceNode.type.split('.').pop() || '';
              let arrow = '-->';
              let label = '';

              if (nodeType === 'If') {
                arrow = connection.sourceHandle === 'true' ? '-->' : '-.->';
                label = connection.sourceHandle ? `|${connection.sourceHandle}|` : '';
                console.log(` If node connection: arrow=${arrow}, label=${label}`);
              } else if (nodeType === 'Switch') {
                 // For Switch nodes, try to get the outputKey as the label from the source node's rules based on the output index
                const switchNode = sourceNode as Node & { parameters?: { rules?: { values?: Array<{ outputKey?: string, index?: number }> } } };
                // Find the specific output rule that matches this connection using the outputIndex from the outer loop
                const outputRule = switchNode.parameters?.rules?.values?.[outputIndex];
                
                // Use outputKey from rule, or fallback to sourceHandle, or generic output index label based on outer loop outputIndex
                label = outputRule?.outputKey ? `|${outputRule.outputKey}|` : connection.sourceHandle ? `|${connection.sourceHandle}|` : outputIndex !== undefined ? `|Output ${outputIndex + 1}|` : '';
                
                // Arrow style for switch: solid for the first output (index 0) or if a sourceHandle/outputKey matches, dotted for others.
                // Using outputIndex for determining arrow style from the source node's perspective
                arrow = outputRule?.outputKey || connection.sourceHandle || outputIndex === 0 ? '-->' : '-.->';
                console.log(` Switch node connection: outputIndex=${outputIndex}, connectionIndex=${connection.index}, sourceHandle=${connection.sourceHandle}, outputKey=${outputRule?.outputKey}, label=${label}, arrow=${arrow}`);
              } else { // Standard nodes might also have sourceHandles (like success/error on HTTP nodes)
                   label = connection.sourceHandle ? `|${connection.sourceHandle}|` : '';
                   console.log(` Standard connection: arrow=${arrow}, label=${label}`);
              }

              edges.push(`${sourceId} ${arrow}${label} ${targetId}`);
               console.log(`Edge added: ${sourceId} ${arrow}${label} ${targetId}`);
            } else {
                console.warn(`Target node with name ${targetKey} not found in map for connection from ${sourceKey} (output ${outputName}, index ${outputIndex}).`);
            }
          });
        });
      });
    });

    console.log(`Total edges found: ${edges.length}`);
    console.log('Edges:', edges);

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