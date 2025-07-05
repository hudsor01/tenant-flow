#!/usr/bin/env node

// Script to update n8n workflow URLs to use Docker container names
// This ensures proper communication between containers

const fs = require('fs');
const path = require('path');

const workflowDir = path.join(__dirname, '..', 'n8n-workflows');
const workflows = fs.readdirSync(workflowDir).filter(f => f.endsWith('.json') && f.match(/^\d{2}-lead-magnet/));

console.log('🔧 Updating workflow URLs for Docker container communication...');

workflows.forEach(filename => {
    const filepath = path.join(workflowDir, filename);
    
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        let workflow = JSON.parse(content);
        let updated = false;
        
        // Update URLs in all nodes
        workflow.nodes.forEach(node => {
            if (node.parameters && node.parameters.url) {
                // Update Ollama URL
                if (node.parameters.url.includes('localhost:11434')) {
                    node.parameters.url = node.parameters.url.replace('localhost:11434', 'tenantflow-ollama:11434');
                    updated = true;
                }
                
                // Update Listmonk URLs
                if (node.parameters.url.includes('listmonk:9000')) {
                    node.parameters.url = node.parameters.url.replace('listmonk:9000', 'tenantflow-listmonk:9000');
                    updated = true;
                }
            }
            
            // Update body parameters that might contain URLs
            if (node.parameters && node.parameters.bodyParameters && node.parameters.bodyParameters.parameters) {
                node.parameters.bodyParameters.parameters.forEach(param => {
                    if (param.value && typeof param.value === 'string') {
                        if (param.value.includes('localhost:9000')) {
                            param.value = param.value.replace(/localhost:9000/g, 'tenantflow-listmonk:9000');
                            updated = true;
                        }
                        if (param.value.includes('localhost:8080')) {
                            param.value = param.value.replace(/localhost:8080/g, 'tenantflow-nocodb:8080');
                            updated = true;
                        }
                    }
                });
            }
        });
        
        if (updated) {
            fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2));
            console.log(`✅ Updated: ${filename}`);
        } else {
            console.log(`⏭️  No changes needed: ${filename}`);
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
    }
});

console.log('🎉 Workflow URL updates complete!');
console.log('');
console.log('Container URLs:');
console.log('- Ollama: http://tenantflow-ollama:11434');
console.log('- NocoDB: http://tenantflow-nocodb:8080');
console.log('- Listmonk: http://tenantflow-listmonk:9000');
console.log('- PostgreSQL: tenantflow-postgres:5432');