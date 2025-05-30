import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkflowConverter from '../WorkflowConverter';
import fs from 'fs';
import path from 'path';

// Sample n8n workflow for testing
const sampleWorkflow = {
  nodes: [
    {
      id: '1',
      type: 'n8n-nodes-base.httpRequest',
      position: { x: 100, y: 100 }
    },
    {
      id: '2',
      type: 'n8n-nodes-base.set',
      position: { x: 300, y: 100 }
    }
  ],
  connections: {
    '1': [
      {
        source: '1',
        target: '2'
      }
    ]
  }
};

describe('WorkflowConverter', () => {
  it('renders the dropzone', () => {
    render(<WorkflowConverter />);
    expect(screen.getByText(/Drag and drop an n8n workflow JSON file here/i)).toBeInTheDocument();
  });

  it('converts simple workflow to mermaid diagram', () => {
    const { container } = render(<WorkflowConverter />);
    
    // Simulate file drop with sample workflow
    const file = new File([JSON.stringify(sampleWorkflow)], 'workflow.json', { type: 'application/json' });
    const dropzone = container.querySelector('.workflow-converter');
    
    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      });
    }

    // Check if mermaid diagram is rendered
    expect(container.querySelector('.mermaid-diagram')).toBeInTheDocument();
  });

  it('converts Qualitative Coding workflow to mermaid diagram', () => {
    const { container } = render(<WorkflowConverter />);
    
    // Read the Qualitative Coding workflow file
    const workflowPath = path.join(process.cwd(), 'src', 'n8n-samples', 'Qualitative_Coding_from_Transcript.json');
    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    
    // Simulate file drop with Qualitative Coding workflow
    const file = new File([workflowContent], 'Qualitative_Coding_from_Transcript.json', { type: 'application/json' });
    const dropzone = container.querySelector('.workflow-converter');
    
    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      });
    }

    // Check if mermaid diagram is rendered
    expect(container.querySelector('.mermaid-diagram')).toBeInTheDocument();
    
    // Verify the workflow structure
    const workflow = JSON.parse(workflowContent);
    expect(workflow.nodes).toBeDefined();
    expect(workflow.connections).toBeDefined();
    expect(Array.isArray(workflow.nodes)).toBe(true);
    expect(typeof workflow.connections).toBe('object');
  });

  it('handles invalid JSON gracefully', () => {
    const { container } = render(<WorkflowConverter />);
    
    // Simulate file drop with invalid JSON
    const file = new File(['invalid json'], 'workflow.json', { type: 'application/json' });
    const dropzone = container.querySelector('.workflow-converter');
    
    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      });
    }

    // Check if error is handled
    expect(container.querySelector('.mermaid-diagram')).toBeEmptyDOMElement();
  });
}); 