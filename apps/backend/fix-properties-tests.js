#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const testFile = '/Users/richard/Developer/tenant-flow/apps/backend/src/properties/properties.service.test.ts';

console.log('Fixing PropertiesService tests to match BaseCrudService pattern...');

let content = fs.readFileSync(testFile, 'utf8');

// Fix all the exists calls to use findByIdAndOwner
content = content.replace(/propertiesRepository\.exists\.mockResolvedValue\(true\)/g, 
  'propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)');

content = content.replace(/propertiesRepository\.exists\.mockResolvedValue\(false\)/g, 
  'propertiesRepository.findByIdAndOwner.mockResolvedValue(null)');

// Fix where clauses to include ownerId
content = content.replace(/where: \{ id: 'prop-123' \}/g, 
  'where: { id: \'prop-123\', ownerId: \'owner-123\' }');

// Fix operation names in error handler calls
content = content.replace(/operation: 'updateProperty'/g, 'operation: \'update\'');
content = content.replace(/operation: 'deleteProperty'/g, 'operation: \'delete\'');

// Fix alias method parameter order
content = content.replace(
  /await propertiesService\.create\('owner-123', propertyData\)/g,
  'await propertiesService.create(propertyData, \'owner-123\')'
);

content = content.replace(
  /await propertiesService\.update\('prop-123', 'owner-123', updateData\)/g,
  'await propertiesService.update(\'prop-123\', updateData, \'owner-123\')'
);

// Fix delete property tests to check for leases
content = content.replace(
  /propertiesRepository\.deleteById\.mockResolvedValue\(mockProperty\)/g,
  `propertiesRepository.prismaClient.lease.count.mockResolvedValue(0)
      propertiesRepository.deleteById.mockResolvedValue(mockProperty)`
);

// Add lease count check to delete tests
content = content.replace(
  /expect\(propertiesRepository\.exists\)\.toHaveBeenCalledWith\(\{[^}]+\}\)/g,
  `expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
        'prop-123',
        'owner-123',
        true
      )
      expect(propertiesRepository.prismaClient.lease.count).toHaveBeenCalledWith({
        where: {
          Unit: {
            propertyId: 'prop-123'
          },
          status: 'ACTIVE'
        }
      })`
);

fs.writeFileSync(testFile, content);
console.log('Tests fixed successfully!');