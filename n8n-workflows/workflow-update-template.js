// Template generator for updating n8n workflows with NocoDB + Listmonk
// This is a reference for the pattern used in all workflows

const createWorkflowTemplate = (workflowNumber, categoryName, listName, schedule, topics) => {
  return {
    "name": `Lead Magnet ${workflowNumber.toString().padStart(2, '0')}: ${categoryName}`,
    "nodes": [
      {
        "parameters": {
          "rule": {
            "interval": [
              {
                "field": "cronExpression",
                "value": schedule
              }
            ]
          }
        },
        "id": "scheduleTrigger",
        "name": `Every 14 Days - ${categoryName} (Day ${workflowNumber})`,
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.1,
        "position": [240, 300]
      },
      {
        "parameters": {
          "assignments": {
            "assignments": [
              {
                "id": "setTopicsId",
                "name": "topics",
                "value": JSON.stringify(topics),
                "type": "array"
              }
            ]
          }
        },
        "id": "setTopics",
        "name": "Set Topics",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [420, 300]
      },
      // ... rest of nodes follow the same pattern
    ],
    "connections": {
      // Standard connection pattern
    },
    "active": true,
    "settings": {
      "saveExecutionProgress": false,
      "saveManualExecutions": true,
      "saveDataErrorExecution": "all",
      "saveDataSuccessExecution": "all",
      "executionTimeout": 3600,
      "timezone": "America/New_York"
    }
  };
};

// Workflow definitions
const workflows = {
  "06": {
    category: "Insurance & Risk Management",
    listName: "Lead Magnets - Insurance & Risk",
    schedule: "0 12 6,20 * *",
    topics: [
      // Insurance & risk topics
    ]
  },
  // ... etc for all workflows
};