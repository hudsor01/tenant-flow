#!/usr/bin/env node

// Script to complete workflows 01-11 with full NocoDB + Listmonk integration
// Makes them consistent with the complete implementation in workflows 12-14

const fs = require('fs');
const path = require('path');

const workflowDir = path.join(__dirname, '..', 'n8n-workflows');
const workflows = fs.readdirSync(workflowDir).filter(f => f.endsWith('.json') && f.match(/^(0[1-9]|1[01])-lead-magnet/));

console.log('🚀 Completing workflows 01-11 with full integration...');

// Workflow type mapping for proper topics and content
const workflowTypes = {
    '01': {
        name: 'Tenant Screening',
        category: 'tenant_screening',
        description: 'tenant screening and background check strategies',
        topics: generateTenantScreeningTopics()
    },
    '02': {
        name: 'Financial ROI',
        category: 'financial_analysis', 
        description: 'financial analysis and ROI calculation techniques',
        topics: generateFinancialROITopics()
    },
    '03': {
        name: 'Maintenance Management',
        category: 'maintenance_management',
        description: 'property maintenance and management systems',
        topics: generateMaintenanceTopics()
    },
    '04': {
        name: 'Marketing Vacancy',
        category: 'marketing_vacancy',
        description: 'vacancy marketing and tenant attraction strategies',
        topics: generateMarketingTopics()
    },
    '05': {
        name: 'Property Investment',
        category: 'property_investment',
        description: 'property investment and acquisition strategies',
        topics: generateInvestmentTopics()
    },
    '06': {
        name: 'Insurance Risk',
        category: 'insurance_risk',
        description: 'insurance coverage and risk management for properties',
        topics: generateInsuranceTopics()
    },
    '07': {
        name: 'Technology Automation',
        category: 'technology_automation',
        description: 'property management technology and automation tools',
        topics: generateTechnologyTopics()
    },
    '08': {
        name: 'Seasonal Management',
        category: 'seasonal_management',
        description: 'seasonal property management and maintenance planning',
        topics: generateSeasonalTopics()
    },
    '09': {
        name: 'Tenant Communication',
        category: 'tenant_communication',
        description: 'tenant relations and communication best practices',
        topics: generateCommunicationTopics()
    },
    '10': {
        name: 'Market Analysis',
        category: 'market_analysis',
        description: 'real estate market analysis and investment timing',
        topics: generateMarketAnalysisTopics()
    },
    '11': {
        name: 'Exit Strategies',
        category: 'exit_strategies',
        description: 'property disposition and exit strategy planning',
        topics: generateExitStrategyTopics()
    }
};

workflows.forEach(filename => {
    const filepath = path.join(workflowDir, filename);
    const workflowNumber = filename.match(/^(\d{2})/)[1];
    const workflowInfo = workflowTypes[workflowNumber];
    
    if (!workflowInfo) {
        console.log(`⏭️  Skipping unknown workflow: ${filename}`);
        return;
    }
    
    try {
        console.log(`🔧 Completing workflow: ${filename}`);
        
        const completeWorkflow = {
            "name": `Lead Magnet ${workflowNumber}: ${workflowInfo.name}`,
            "nodes": [
                // Schedule Trigger
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
                    "name": `Every 14 Days - ${workflowInfo.name} (Day ${workflowNumber})`,
                    "type": "n8n-nodes-base.scheduleTrigger",
                    "typeVersion": 1.1,
                    "position": [240, 300]
                },
                
                // Select Topic (Code Node)
                {
                    "parameters": {
                        "jsCode": workflowInfo.topics
                    },
                    "id": "selectTopic",
                    "name": `Select ${workflowInfo.name} Topic`,
                    "type": "n8n-nodes-base.code",
                    "typeVersion": 2,
                    "position": [460, 300]
                },
                
                // Generate Content
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
                                    "value": `Create a comprehensive ${workflowInfo.description} lead magnet for landlords:\\n\\nTitle: {{ $json.title }}\\nDescription: {{ $json.description }}\\nValue: {{ $json.value }}\\nAngle: {{ $json.angle }}\\nPain Point: {{ $json.pain_point }}\\nTarget: {{ $json.targetAudience }}\\n\\nGenerate detailed content including:\\n1. Executive summary of key strategies\\n2. Step-by-step implementation guides\\n3. Best practices and industry standards\\n4. Common mistakes to avoid\\n5. Tools and resources recommendations\\n6. Real-world examples and case studies\\n7. Action items and checklists\\n8. Legal considerations where applicable\\n9. Cost-saving tips and techniques\\n10. Performance metrics and tracking\\n\\nMake it actionable with downloadable resources. Focus on practical value for property managers and landlords.`
                                },
                                {
                                    "name": "stream",
                                    "value": false
                                }
                            ]
                        }
                    },
                    "id": "generateContent",
                    "name": `Generate ${workflowInfo.name} Content`,
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.1,
                    "position": [680, 300]
                },
                
                // Save to NocoDB
                {
                    "parameters": {
                        "method": "POST",
                        "url": "http://tenantflow-nocodb:8080/api/v1/db/data/noco/tenantflow/lead_magnets",
                        "sendHeaders": true,
                        "headerParameters": {
                            "parameters": [
                                {
                                    "name": "Content-Type",
                                    "value": "application/json"
                                },
                                {
                                    "name": "xc-token",
                                    "value": "{{ $credentials.nocodbApi.token }}"
                                }
                            ]
                        },
                        "sendBody": true,
                        "bodyParameters": {
                            "parameters": [
                                {
                                    "name": "title",
                                    "value": "{{ $('Select " + workflowInfo.name + " Topic').item.json.title }}"
                                },
                                {
                                    "name": "category",
                                    "value": "{{ $('Select " + workflowInfo.name + " Topic').item.json.category }}"
                                },
                                {
                                    "name": "content",
                                    "value": "{{ $('Generate " + workflowInfo.name + " Content').item.json.response }}"
                                },
                                {
                                    "name": "status",
                                    "value": "active"
                                },
                                {
                                    "name": "workflow_id",
                                    "value": workflowNumber
                                },
                                {
                                    "name": "created_at",
                                    "value": "{{ $('Select " + workflowInfo.name + " Topic').item.json.createdAt }}"
                                }
                            ]
                        }
                    },
                    "id": "saveToNocoDB",
                    "name": `Save ${workflowInfo.name} to NocoDB`,
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.1,
                    "position": [900, 300]
                },
                
                // Get Listmonk Lists
                {
                    "parameters": {
                        "method": "GET",
                        "url": "http://tenantflow-listmonk:9000/api/lists",
                        "sendHeaders": true,
                        "headerParameters": {
                            "parameters": [
                                {
                                    "name": "Authorization",
                                    "value": "Basic {{ $credentials.listmonkApi.basicAuth }}"
                                }
                            ]
                        }
                    },
                    "id": "getListmonkLists",
                    "name": "Get Listmonk Lists",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.1,
                    "position": [1120, 300]
                },
                
                // Extract List ID
                {
                    "parameters": {
                        "jsCode": `const lists = $('Get Listmonk Lists').item.json.data.data;\\nconst leadMagnetList = lists.find(list => list.name === 'Lead Magnets');\\nreturn {\\n  json: {\\n    listId: leadMagnetList ? leadMagnetList.id : 1\\n  }\\n};`
                    },
                    "id": "extractListId",
                    "name": "Extract List ID",
                    "type": "n8n-nodes-base.code",
                    "typeVersion": 2,
                    "position": [1340, 300]
                },
                
                // Create Campaign
                {
                    "parameters": {
                        "method": "POST",
                        "url": "http://tenantflow-listmonk:9000/api/campaigns",
                        "sendHeaders": true,
                        "headerParameters": {
                            "parameters": [
                                {
                                    "name": "Content-Type",
                                    "value": "application/json"
                                },
                                {
                                    "name": "Authorization",
                                    "value": "Basic {{ $credentials.listmonkApi.basicAuth }}"
                                }
                            ]
                        },
                        "sendBody": true,
                        "bodyParameters": {
                            "parameters": [
                                {
                                    "name": "name",
                                    "value": "{{ $('Select " + workflowInfo.name + " Topic').item.json.title }}"
                                },
                                {
                                    "name": "subject",
                                    "value": "🎯 New {{ $('Select " + workflowInfo.name + " Topic').item.json.title }}"
                                },
                                {
                                    "name": "lists",
                                    "value": "[{{ $('Extract List ID').item.json.listId }}]"
                                },
                                {
                                    "name": "type",
                                    "value": "regular"
                                },
                                {
                                    "name": "content_type",
                                    "value": "html"
                                },
                                {
                                    "name": "body",
                                    "value": `<h2>🎯 {{ $('Select ${workflowInfo.name} Topic').item.json.title }}</h2>\\n<p>{{ $('Select ${workflowInfo.name} Topic').item.json.description }}</p>\\n<p><strong>Value: {{ $('Select ${workflowInfo.name} Topic').item.json.value }}</strong></p>\\n<br>\\n<a href="https://tenantflow.app/lead-magnets/{{ $('Select ${workflowInfo.name} Topic').item.json.id }}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Get Your Free Guide →</a>`
                                }
                            ]
                        }
                    },
                    "id": "createCampaign",
                    "name": `Create ${workflowInfo.name} Campaign`,
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.1,
                    "position": [1560, 300]
                },
                
                // Send Notification
                {
                    "parameters": {
                        "fromEmail": "noreply@tenantflow.app",
                        "toEmail": "admin@tenantflow.app",
                        "subject": `New ${workflowInfo.name} Lead Magnet Created`,
                        "emailType": "text",
                        "message": `New lead magnet created:\\n\\nTitle: {{ $('Select ${workflowInfo.name} Topic').item.json.title }}\\nCategory: {{ $('Select ${workflowInfo.name} Topic').item.json.category }}\\nWorkflow: ${workflowNumber}\\nCreated: {{ $('Select ${workflowInfo.name} Topic').item.json.createdAt }}\\n\\nContent saved to NocoDB and campaign created in Listmonk.`
                    },
                    "id": "sendNotification",
                    "name": "Send Notification",
                    "type": "n8n-nodes-base.emailSend",
                    "typeVersion": 2,
                    "position": [1780, 300]
                }
            ],
            
            "connections": {
                [`Every 14 Days - ${workflowInfo.name} (Day ${workflowNumber})`]: {
                    "main": [
                        [
                            {
                                "node": `Select ${workflowInfo.name} Topic`,
                                "type": "main",
                                "index": 0
                            }
                        ]
                    ]
                },
                [`Select ${workflowInfo.name} Topic`]: {
                    "main": [
                        [
                            {
                                "node": `Generate ${workflowInfo.name} Content`,
                                "type": "main",
                                "index": 0
                            }
                        ]
                    ]
                },
                [`Generate ${workflowInfo.name} Content`]: {
                    "main": [
                        [
                            {
                                "node": `Save ${workflowInfo.name} to NocoDB`,
                                "type": "main",
                                "index": 0
                            }
                        ]
                    ]
                },
                [`Save ${workflowInfo.name} to NocoDB`]: {
                    "main": [
                        [
                            {
                                "node": "Get Listmonk Lists",
                                "type": "main",
                                "index": 0
                            }
                        ]
                    ]
                },
                "Get Listmonk Lists": {
                    "main": [
                        [
                            {
                                "node": "Extract List ID",
                                "type": "main",
                                "index": 0
                            }
                        ]
                    ]
                },
                "Extract List ID": {
                    "main": [
                        [
                            {
                                "node": `Create ${workflowInfo.name} Campaign`,
                                "type": "main",
                                "index": 0
                            }
                        ]
                    ]
                },
                [`Create ${workflowInfo.name} Campaign`]: {
                    "main": [
                        [
                            {
                                "node": "Send Notification",
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
                },
                {
                    "id": workflowInfo.category,
                    "name": workflowInfo.name
                }
            ],
            "meta": {
                "description": `Creates ${workflowInfo.description} lead magnets every 14 days - specialized content for property managers and landlords`,
                "templateCredsSetupCompleted": true
            },
            "pinData": {},
            "versionId": "1.0.0"
        };
        
        fs.writeFileSync(filepath, JSON.stringify(completeWorkflow, null, 2));
        console.log(`✅ Completed: ${filename}`);
        
    } catch (error) {
        console.error(`❌ Error completing ${filename}:`, error.message);
    }
});

function generateTenantScreeningTopics() {
    return `const tenantScreeningTopics = [
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
  },
  {
    type: 'Application Analysis',
    title: 'Rental Application Red Flags & Warning Signs',
    description: 'Identify problematic applicants before they become your tenant nightmare',
    value: '$97 value',
    angle: 'early_detection',
    pain_point: 'bad_decisions'
  },
  {
    type: 'Legal Compliance',
    title: 'Fair Housing Compliant Tenant Screening Process',
    description: 'Screen thoroughly while staying legally compliant and avoiding discrimination lawsuits',
    value: '$177 value',
    angle: 'legal_protection',
    pain_point: 'fair_housing_violations'
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
};`;
}

function generateFinancialROITopics() {
    return `const financialROITopics = [
  {
    type: 'ROI Calculator',
    title: 'Complete Property Investment ROI Analysis System',
    description: 'Calculate true ROI, cash flow, and profitability with advanced financial metrics',
    value: '$247 value',
    angle: 'profit_maximization',
    pain_point: 'poor_returns'
  },
  {
    type: 'Cash Flow Analysis',
    title: 'Advanced Cash Flow Forecasting for Rental Properties',
    description: 'Master cash flow projections and optimize rental income for maximum profitability',
    value: '$197 value',
    angle: 'income_optimization',
    pain_point: 'negative_cash_flow'
  },
  {
    type: 'Tax Strategy',
    title: 'Rental Property Tax Optimization & Deduction Guide',
    description: 'Maximize tax benefits and minimize liability with professional tax strategies',
    value: '$227 value',
    angle: 'tax_savings',
    pain_point: 'overpaying_taxes'
  }
];

const selectedMagnet = financialROITopics[Math.floor(Math.random() * financialROITopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'financial_roi_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'real estate investors, property managers, landlords',
    category: 'financial_analysis',
    workflow: '02',
    folderPath: \`\${year}/Q\${quarter}/financial-roi\`,
    seoKeywords: 'ROI analysis, cash flow, property investment, financial returns'
  }
};`;
}

function generateMaintenanceTopics() {
    return `const maintenanceTopics = [
  {
    type: 'Preventive Maintenance',
    title: 'Complete Property Maintenance Schedule & Checklist System',
    description: 'Prevent costly repairs with systematic maintenance planning and vendor management',
    value: '$167 value',
    angle: 'cost_prevention',
    pain_point: 'expensive_repairs'
  },
  {
    type: 'Emergency Response',
    title: 'Emergency Maintenance Response & Vendor Network Guide',
    description: 'Handle maintenance emergencies efficiently with pre-established vendor relationships',
    value: '$147 value',
    angle: 'crisis_management',
    pain_point: 'emergency_costs'
  }
];

const selectedMagnet = maintenanceTopics[Math.floor(Math.random() * maintenanceTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'maintenance_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'property managers, landlords, real estate investors',
    category: 'maintenance_management',
    workflow: '03',
    folderPath: \`\${year}/Q\${quarter}/maintenance\`,
    seoKeywords: 'property maintenance, preventive maintenance, repair management'
  }
};`;
}

function generateMarketingTopics() {
    return `const marketingTopics = [
  {
    type: 'Vacancy Marketing',
    title: 'Rapid Vacancy Filling: Marketing System for Quick Tenant Placement',
    description: 'Fill vacancies faster with proven marketing strategies and tenant attraction techniques',
    value: '$187 value',
    angle: 'income_recovery',
    pain_point: 'long_vacancies'
  }
];

const selectedMagnet = marketingTopics[Math.floor(Math.random() * marketingTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'marketing_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'landlords, property managers, real estate investors',
    category: 'marketing_vacancy',
    workflow: '04',
    folderPath: \`\${year}/Q\${quarter}/marketing\`,
    seoKeywords: 'vacancy marketing, tenant attraction, rental marketing'
  }
};`;
}

function generateInvestmentTopics() {
    return `const investmentTopics = [
  {
    type: 'Property Analysis',
    title: 'Complete Property Investment Analysis & Due Diligence System',
    description: 'Evaluate investment properties like a pro with comprehensive analysis frameworks',
    value: '$297 value',
    angle: 'smart_investing',
    pain_point: 'bad_investments'
  }
];

const selectedMagnet = investmentTopics[Math.floor(Math.random() * investmentTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'investment_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'real estate investors, property buyers, landlords',
    category: 'property_investment',
    workflow: '05',
    folderPath: \`\${year}/Q\${quarter}/investment\`,
    seoKeywords: 'property investment, real estate analysis, investment strategy'
  }
};`;
}

function generateInsuranceTopics() {
    return `const insuranceTopics = [
  {
    type: 'Risk Management',
    title: 'Complete Landlord Insurance & Risk Management Guide',
    description: 'Protect your investment with comprehensive insurance coverage and risk mitigation strategies',
    value: '$207 value',
    angle: 'asset_protection',
    pain_point: 'uninsured_losses'
  }
];

const selectedMagnet = insuranceTopics[Math.floor(Math.random() * insuranceTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'insurance_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'landlords, property owners, real estate investors',
    category: 'insurance_risk',
    workflow: '06',
    folderPath: \`\${year}/Q\${quarter}/insurance\`,
    seoKeywords: 'landlord insurance, property insurance, risk management'
  }
};`;
}

function generateTechnologyTopics() {
    return `const technologyTopics = [
  {
    type: 'Automation Systems',
    title: 'Property Management Technology & Automation Guide',
    description: 'Streamline operations with modern technology and automation tools for landlords',
    value: '$177 value',
    angle: 'efficiency_gains',
    pain_point: 'manual_processes'
  }
];

const selectedMagnet = technologyTopics[Math.floor(Math.random() * technologyTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'technology_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'property managers, landlords, real estate investors',
    category: 'technology_automation',
    workflow: '07',
    folderPath: \`\${year}/Q\${quarter}/technology\`,
    seoKeywords: 'property management technology, automation, proptech'
  }
};`;
}

function generateSeasonalTopics() {
    return `const seasonalTopics = [
  {
    type: 'Seasonal Planning',
    title: 'Year-Round Property Management: Seasonal Planning & Maintenance Guide',
    description: 'Optimize property performance with seasonal management strategies and planning',
    value: '$157 value',
    angle: 'proactive_management',
    pain_point: 'seasonal_issues'
  }
];

const selectedMagnet = seasonalTopics[Math.floor(Math.random() * seasonalTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'seasonal_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'property managers, landlords, property owners',
    category: 'seasonal_management',
    workflow: '08',
    folderPath: \`\${year}/Q\${quarter}/seasonal\`,
    seoKeywords: 'seasonal property management, property planning, maintenance scheduling'
  }
};`;
}

function generateCommunicationTopics() {
    return `const communicationTopics = [
  {
    type: 'Tenant Relations',
    title: 'Professional Tenant Communication & Relationship Management System',
    description: 'Build positive tenant relationships and reduce conflicts with proven communication strategies',
    value: '$137 value',
    angle: 'relationship_building',
    pain_point: 'tenant_conflicts'
  }
];

const selectedMagnet = communicationTopics[Math.floor(Math.random() * communicationTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'communication_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'landlords, property managers, property owners',
    category: 'tenant_communication',
    workflow: '09',
    folderPath: \`\${year}/Q\${quarter}/communication\`,
    seoKeywords: 'tenant communication, tenant relations, property management communication'
  }
};`;
}

function generateMarketAnalysisTopics() {
    return `const marketAnalysisTopics = [
  {
    type: 'Market Research',
    title: 'Real Estate Market Analysis & Investment Timing Guide',
    description: 'Master market analysis techniques to time investments and maximize returns',
    value: '$217 value',
    angle: 'market_timing',
    pain_point: 'poor_timing'
  }
];

const selectedMagnet = marketAnalysisTopics[Math.floor(Math.random() * marketAnalysisTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'market_analysis_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'real estate investors, property buyers, market analysts',
    category: 'market_analysis',
    workflow: '10',
    folderPath: \`\${year}/Q\${quarter}/market-analysis\`,
    seoKeywords: 'market analysis, real estate market, investment timing'
  }
};`;
}

function generateExitStrategyTopics() {
    return `const exitStrategyTopics = [
  {
    type: 'Property Disposition',
    title: 'Strategic Property Exit Planning & Disposition Guide',
    description: 'Maximize returns when selling properties with professional exit strategies and timing',
    value: '$267 value',
    angle: 'profit_maximization',
    pain_point: 'suboptimal_exits'
  }
];

const selectedMagnet = exitStrategyTopics[Math.floor(Math.random() * exitStrategyTopics.length)];
const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
const year = new Date().getFullYear();

return {
  json: {
    ...selectedMagnet,
    id: 'exit_strategy_' + Date.now(),
    createdAt: new Date().toISOString(),
    targetAudience: 'real estate investors, property sellers, landlords',
    category: 'exit_strategies',
    workflow: '11',
    folderPath: \`\${year}/Q\${quarter}/exit-strategies\`,
    seoKeywords: 'exit strategy, property disposition, real estate exit planning'
  }
};`;
}

console.log('🎉 All workflows 01-11 completed with full integration!');