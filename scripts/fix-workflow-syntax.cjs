#!/usr/bin/env node

// Script to fix n8n workflow JSON syntax issues
// Converts problematic Set node expressions to proper Code nodes

const fs = require('fs');
const path = require('path');

const workflowDir = path.join(__dirname, '..', 'n8n-workflows');
const workflows = fs.readdirSync(workflowDir).filter(f => f.endsWith('.json') && f.match(/^(0[1-9]|1[01])-lead-magnet/));

console.log('🔧 Fixing n8n workflow syntax issues...');

workflows.forEach(filename => {
    const filepath = path.join(workflowDir, filename);
    
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        
        // Try to parse - if it fails, we need to fix the syntax
        let workflow;
        try {
            workflow = JSON.parse(content);
            console.log(`✅ Already valid JSON: ${filename}`);
            return;
        } catch (parseError) {
            console.log(`🔧 Fixing JSON syntax in: ${filename}`);
            
            // The issue is with multiline n8n expressions in Set nodes
            // We need to convert these to proper Code nodes
            let fixedContent = content;
            
            // Fix the malformed Set node with topics
            if (fixedContent.includes('"value": "={{')) {
                // Extract the workflow name and create appropriate topics
                const workflowMatch = filename.match(/^\d{2}-lead-magnet-(.+)\.json$/);
                const workflowName = workflowMatch ? workflowMatch[1] : 'unknown';
                
                // Generate appropriate topics based on workflow type
                const topicsCode = generateTopicsCode(workflowName);
                
                // Replace the problematic Set node with a proper Code node
                fixedContent = fixedContent.replace(
                    /"type": "n8n-nodes-base\.set"[^}]+},/s,
                    `"type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "jsCode": "${topicsCode.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
      },`
                );
                
                // Fix the node name reference in connections
                fixedContent = fixedContent.replace(
                    /"Set Topics"/g,
                    '"Select Topic"'
                );
                
                // Update node name
                fixedContent = fixedContent.replace(
                    /"name": "Set Topics"/g,
                    '"name": "Select Topic"'
                );
            }
            
            // Try parsing again
            workflow = JSON.parse(fixedContent);
            
            // Write the fixed content
            fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2));
            console.log(`✅ Fixed: ${filename}`);
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
        
        // For severe syntax errors, let's create a completely new workflow
        try {
            console.log(`🛠️  Rebuilding workflow: ${filename}`);
            const workflowMatch = filename.match(/^\d{2}-lead-magnet-(.+)\.json$/);
            const workflowName = workflowMatch ? workflowMatch[1] : 'unknown';
            const workflowNumber = filename.match(/^(\d{2})/)[1];
            
            const newWorkflow = createValidWorkflow(workflowName, workflowNumber);
            fs.writeFileSync(filepath, JSON.stringify(newWorkflow, null, 2));
            console.log(`✅ Rebuilt: ${filename}`);
        } catch (rebuildError) {
            console.error(`❌ Failed to rebuild ${filename}:`, rebuildError.message);
        }
    }
});

function generateTopicsCode(workflowType) {
    const topicsMap = {
        'tenant-screening': `const tenantScreeningTopics = [
  {
    type: 'Background Check Mastery',
    title: 'Complete Tenant Screening & Background Check System',
    description: 'Bulletproof tenant screening techniques to avoid problem tenants and costly evictions',
    value: '$197 value',
    angle: 'risk_prevention',
    pain_point: 'bad_tenants'
  },
  {
    type: 'Credit Analysis Guide',
    title: 'Professional Credit Report Analysis for Landlords',
    description: 'Master credit report interpretation and score analysis for better tenant selection',
    value: '$147 value',
    angle: 'financial_protection',
    pain_point: 'payment_defaults'
  },
  {
    type: 'Reference Verification',
    title: 'Advanced Reference & Employment Verification System',
    description: 'Catch lying applicants with proven verification techniques and red flag detection',
    value: '$127 value',
    angle: 'fraud_prevention',
    pain_point: 'false_applications'
  }
];

const selectedMagnet = tenantScreeningTopics[Math.floor(Math.random() * tenantScreeningTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'tenant_screening_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'landlords, property managers, real estate investors',
    category: 'tenant_screening',
    workflow: '01',
    folderPath: \`\${year}/Q\${quarter}/tenant-screening\`,
    seoKeywords: 'tenant screening, background checks, credit analysis, landlord protection'
  }
};`,
        'financial-roi': `const financialTopics = [
  {
    type: 'ROI Calculator',
    title: 'Complete Property Investment ROI Analysis System',
    description: 'Calculate true ROI, cash flow, and profitability with advanced financial metrics',
    value: '$247 value',
    angle: 'profit_maximization',
    pain_point: 'poor_returns'
  }
];

const selectedMagnet = financialTopics[Math.floor(Math.random() * financialTopics.length)];
return {
  json: {
    ...selectedMagnet,
    id: 'financial_roi_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'real estate investors, property managers',
    category: 'financial_analysis',
    workflow: '02',
    folderPath: \`\${new Date().getFullYear()}/Q\${Math.ceil((new Date().getMonth() + 1) / 3)}/financial-roi\`,
    seoKeywords: 'ROI analysis, cash flow, property investment, financial returns'
  }
};`
    };
    
    return topicsMap[workflowType] || topicsMap['tenant-screening'];
}

function createValidWorkflow(workflowType, workflowNumber) {
    const workflowName = workflowType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
        "name": `Lead Magnet ${workflowNumber}: ${workflowName}`,
        "nodes": [
            {
                "parameters": {
                    "rule": {
                        "interval": [
                            {
                                "field": "cronExpression",
                                "value": `0 8 ${workflowNumber},${parseInt(workflowNumber) + 14} * *`
                            }
                        ]
                    }
                },
                "id": "scheduleTrigger",
                "name": `Every 14 Days - ${workflowName} (Day ${workflowNumber})`,
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.1,
                "position": [240, 300]
            },
            {
                "parameters": {
                    "jsCode": generateTopicsCode(workflowType)
                },
                "id": "selectTopic",
                "name": "Select Topic",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [460, 300]
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": "http://tenantflow-ollama:11434/api/generate",
                    "sendHeaders": true,
                    "headerParameters": {
                        "parameters": [
                            {
                                "name": "Content-Type",
                                "value": "application/json"
                            }
                        ]
                    },
                    "sendBody": true,
                    "bodyParameters": {
                        "parameters": [
                            {
                                "name": "model",
                                "value": "llama3.2"
                            },
                            {
                                "name": "prompt",
                                "value": "Create comprehensive content for this lead magnet:\\n\\nTitle: {{ $json.title }}\\nDescription: {{ $json.description }}\\nValue: {{ $json.value }}\\nTarget: {{ $json.targetAudience }}\\n\\nGenerate detailed, actionable content that provides real value to property managers and landlords."
                            },
                            {
                                "name": "stream",
                                "value": false
                            }
                        ]
                    }
                },
                "id": "generateContent",
                "name": "Generate Content",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.1,
                "position": [680, 300]
            }
        ],
        "connections": {
            [`Every 14 Days - ${workflowName} (Day ${workflowNumber})`]: {
                "main": [
                    [
                        {
                            "node": "Select Topic",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            },
            "Select Topic": {
                "main": [
                    [
                        {
                            "node": "Generate Content",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            }
        },
        "active": true,
        "settings": {
            "saveExecutionProgress": false,
            "saveManualExecutions": true,
            "saveDataErrorExecution": "all",
            "saveDataSuccessExecution": "all",
            "executionTimeout": 3600,
            "timezone": "America/New_York"
        },
        "staticData": {},
        "tags": [
            {
                "id": "lead_magnet",
                "name": "Lead Magnet"
            }
        ],
        "meta": {
            "description": `Creates ${workflowName.toLowerCase()} lead magnets every 14 days`,
            "templateCredsSetupCompleted": true
        },
        "pinData": {},
        "versionId": "1.0.0"
    };
}

console.log('🎉 Workflow syntax fixes complete!');