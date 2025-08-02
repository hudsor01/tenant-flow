#!/usr/bin/env node

/**
 * Code Quality Analyzer
 * 
 * Performs detailed analysis of code quality metrics for the consolidation effort.
 * Focuses on TypeScript type safety, maintainability, and technical debt.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CodeQualityAnalyzer {
  constructor() {
    this.backendSrcPath = path.join(process.cwd(), 'apps/backend/src');
    this.frontendSrcPath = path.join(process.cwd(), 'apps/frontend/src');
    this.sharedSrcPath = path.join(process.cwd(), 'packages/shared/src');
    
    this.qualityMetrics = {
      timestamp: new Date().toISOString(),
      typeScript: {},
      codeSmells: {},
      technicalDebt: {},
      maintainability: {},
      testCoverage: {},
      dependencies: {}
    };
  }

  /**
   * Analyze TypeScript type safety and quality
   */
  analyzeTypeScript() {
    console.log('🔧 Analyzing TypeScript quality...');
    
    const typeScriptMetrics = {
      strictMode: this.checkTypeScriptStrict(),
      anyUsage: this.countAnyUsage(),
      typeErrors: this.getTypeErrors(),
      interfaceCompliance: this.analyzeInterfaceCompliance(),
      genericsUsage: this.analyzeGenericsUsage(),
      typeComplexity: this.calculateTypeComplexity()
    };

    this.qualityMetrics.typeScript = typeScriptMetrics;
    
    console.log(`   Any types found: ${typeScriptMetrics.anyUsage.total}`);
    console.log(`   Type errors: ${typeScriptMetrics.typeErrors.length}`);
    console.log(`   Strict mode: ${typeScriptMetrics.strictMode ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Detect code smells and anti-patterns
   */
  detectCodeSmells() {
    console.log('👃 Detecting code smells...');
    
    const codeSmells = {
      longMethods: this.findLongMethods(),
      largeFunctions: this.findLargeFunctions(), 
      duplicatedCode: this.findDuplicatedCode(),
      complexConditions: this.findComplexConditions(),
      magicNumbers: this.findMagicNumbers(),
      todoComments: this.findTodoComments(),
      console_logs: this.findConsoleUsage(),
      unusedImports: this.findUnusedImports()
    };

    this.qualityMetrics.codeSmells = codeSmells;
    
    console.log(`   Long methods: ${codeSmells.longMethods.length}`);
    console.log(`   Duplicated blocks: ${codeSmells.duplicatedCode.length}`);
    console.log(`   TODO comments: ${codeSmells.todoComments.length}`);
    console.log(`   Console usage: ${codeSmells.console_logs.length}`);
  }

  /**
   * Calculate technical debt metrics
   */
  calculateTechnicalDebt() {
    console.log('📊 Calculating technical debt...');
    
    const technicalDebt = {
      debtIndex: this.calculateDebtIndex(),
      refactoringOpportunities: this.identifyRefactoringOpportunities(),
      securityVulnerabilities: this.scanSecurityIssues(),
      performanceIssues: this.identifyPerformanceIssues(),
      dependencyVulnerabilities: this.checkDependencyVulnerabilities()
    };

    this.qualityMetrics.technicalDebt = technicalDebt;
    
    console.log(`   Debt index: ${technicalDebt.debtIndex}/100`);
    console.log(`   Refactoring opportunities: ${technicalDebt.refactoringOpportunities.length}`);
    console.log(`   Performance issues: ${technicalDebt.performanceIssues.length}`);
  }

  /**
   * Analyze maintainability metrics
   */
  analyzeMaintainability() {
    console.log('🛠️  Analyzing maintainability...');
    
    const maintainability = {
      cohesion: this.calculateCohesion(),
      coupling: this.calculateCoupling(),
      complexity: this.calculateComplexityMetrics(),
      readability: this.calculateReadabilityScore(),
      documentationCoverage: this.calculateDocumentationCoverage()
    };

    this.qualityMetrics.maintainability = maintainability;
    
    console.log(`   Cohesion score: ${maintainability.cohesion}/100`);
    console.log(`   Coupling score: ${maintainability.coupling}/100`);
    console.log(`   Readability: ${maintainability.readability}/100`);
  }

  /**
   * Assess test coverage and quality
   */
  assessTestCoverage() {
    console.log('🧪 Assessing test coverage...');
    
    const testCoverage = {
      unitTests: this.countUnitTests(),
      integrationTests: this.countIntegrationTests(),
      e2eTests: this.countE2ETests(),
      coverage: this.getCoverageMetrics(),
      testQuality: this.assessTestQuality()
    };

    this.qualityMetrics.testCoverage = testCoverage;
    
    console.log(`   Unit tests: ${testCoverage.unitTests.count}`);
    console.log(`   Integration tests: ${testCoverage.integrationTests.count}`);
    console.log(`   E2E tests: ${testCoverage.e2eTests.count}`);
  }

  /**
   * Analyze dependency health
   */
  analyzeDependencies() {
    console.log('📦 Analyzing dependencies...');
    
    const dependencies = {
      outdated: this.findOutdatedDependencies(),
      unused: this.findUnusedDependencies(),
      duplicates: this.findDuplicateDependencies(),
      security: this.checkDependencySecurity(),
      sizes: this.analyzeDependencySizes()
    };

    this.qualityMetrics.dependencies = dependencies;
    
    console.log(`   Outdated packages: ${dependencies.outdated.length}`);
    console.log(`   Unused dependencies: ${dependencies.unused.length}`);
    console.log(`   Duplicate packages: ${dependencies.duplicates.length}`);
  }

  // TypeScript Analysis Methods
  checkTypeScriptStrict() {
    try {
      const backendConfig = path.join(this.backendSrcPath, '../tsconfig.json');
      const frontendConfig = path.join(this.frontendSrcPath, '../tsconfig.json');
      
      const configs = [backendConfig, frontendConfig].filter(fs.existsSync);
      let strictEnabled = true;
      
      configs.forEach(configPath => {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.compilerOptions?.strict) {
          strictEnabled = false;
        }
      });
      
      return strictEnabled;
    } catch (error) {
      return false;
    }
  }

  countAnyUsage() {
    const anyUsage = { total: 0, files: [] };
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const anyMatches = content.match(/:\s*any\b/g) || [];
        
        if (anyMatches.length > 0) {
          anyUsage.total += anyMatches.length;
          anyUsage.files.push({
            file: path.relative(process.cwd(), filePath),
            count: anyMatches.length
          });
        }
      }
    });
    
    return anyUsage;
  }

  getTypeErrors() {
    try {
      // Run TypeScript compiler to get type errors
      const result = execSync('npx tsc --noEmit --pretty false', {
        cwd: this.backendSrcPath,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      return [];
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const errors = [];
      
      output.split('\n').forEach(line => {
        if (line.includes('error TS')) {
          errors.push(line.trim());
        }
      });
      
      return errors;
    }
  }

  analyzeInterfaceCompliance() {
    const compliance = { total: 0, violations: [] };
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for untyped function parameters
        const untypedParams = content.match(/function\s+\w+\s*\([^)]*\w+\s*[,)]/g) || [];
        compliance.total += untypedParams.length;
        
        if (untypedParams.length > 0) {
          compliance.violations.push({
            file: path.relative(process.cwd(), filePath),
            type: 'untyped_parameters',
            count: untypedParams.length
          });
        }
      }
    });
    
    return compliance;
  }

  analyzeGenericsUsage() {
    const generics = { total: 0, files: [] };
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const genericMatches = content.match(/<[A-Z][^>]*>/g) || [];
        
        if (genericMatches.length > 0) {
          generics.total += genericMatches.length;
          generics.files.push({
            file: path.relative(process.cwd(), filePath),
            count: genericMatches.length
          });
        }
      }
    });
    
    return generics;
  }

  calculateTypeComplexity() {
    let totalComplexity = 0;
    let fileCount = 0;
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Simple complexity calculation based on type constructs
        const interfaces = (content.match(/interface\s+\w+/g) || []).length;
        const types = (content.match(/type\s+\w+/g) || []).length;
        const generics = (content.match(/<[^>]+>/g) || []).length;
        const unions = (content.match(/\|\s*\w+/g) || []).length;
        
        const fileComplexity = interfaces * 2 + types * 1.5 + generics * 3 + unions * 1;
        totalComplexity += fileComplexity;
        fileCount++;
      }
    });
    
    return {
      total: totalComplexity,
      average: fileCount > 0 ? Math.round(totalComplexity / fileCount) : 0,
      fileCount
    };
  }

  // Code Smell Detection Methods
  findLongMethods() {
    const longMethods = [];
    const maxLines = 50; // Methods longer than 50 lines
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        let inMethod = false;
        let methodStart = 0;
        let braceCount = 0;
        let methodName = '';
        
        lines.forEach((line, index) => {
          // Detect method start
          const methodMatch = line.match(/(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/);
          if (methodMatch && !inMethod) {
            inMethod = true;
            methodStart = index;
            methodName = methodMatch[2];
            braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
          } else if (inMethod) {
            braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            
            if (braceCount <= 0) {
              const methodLength = index - methodStart + 1;
              if (methodLength > maxLines) {
                longMethods.push({
                  file: path.relative(process.cwd(), filePath),
                  method: methodName,
                  lines: methodLength,
                  startLine: methodStart + 1
                });
              }
              inMethod = false;
            }
          }
        });
      }
    });
    
    return longMethods;
  }

  findLargeFunctions() {
    // Similar to long methods but for function expressions
    return this.findLongMethods(); // Simplified for now
  }

  findDuplicatedCode() {
    const duplicates = [];
    const minLines = 5; // Minimum lines to consider duplication
    const codeBlocks = new Map();
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Create sliding window of code blocks
        for (let i = 0; i <= lines.length - minLines; i++) {
          const block = lines.slice(i, i + minLines).join('\n');
          const blockKey = this.normalizeCode(block);
          
          if (!codeBlocks.has(blockKey)) {
            codeBlocks.set(blockKey, []);
          }
          
          codeBlocks.get(blockKey).push({
            file: path.relative(process.cwd(), filePath),
            startLine: i + 1,
            block: block
          });
        }
      }
    });
    
    // Find blocks that appear multiple times
    codeBlocks.forEach((occurrences, block) => {
      if (occurrences.length > 1) {
        duplicates.push({
          code: block.substring(0, 100) + '...',
          occurrences: occurrences.length,
          locations: occurrences
        });
      }
    });
    
    return duplicates;
  }

  findComplexConditions() {
    const complexConditions = [];
    const maxComplexity = 3; // More than 3 logical operators
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const logicalOps = (line.match(/&&|\|\|/g) || []).length;
          if (logicalOps > maxComplexity) {
            complexConditions.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              complexity: logicalOps,
              code: line.trim()
            });
          }
        });
      }
    });
    
    return complexConditions;
  }

  findMagicNumbers() {
    const magicNumbers = [];
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Find numbers that aren't 0, 1, or clearly constants
          const numbers = line.match(/\b(?!0\b|1\b)\d{2,}\b/g) || [];
          if (numbers.length > 0) {
            magicNumbers.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              numbers: numbers,
              code: line.trim()
            });
          }
        });
      }
    });
    
    return magicNumbers;
  }

  findTodoComments() {
    const todos = [];
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (/\b(TODO|FIXME|XXX|HACK)\b/i.test(line)) {
            todos.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              type: (line.match(/\b(TODO|FIXME|XXX|HACK)\b/i) || [])[0],
              comment: line.trim()
            });
          }
        });
      }
    });
    
    return todos;
  }

  findConsoleUsage() {
    const consoleUsage = [];
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (/console\.(log|warn|error|debug)/.test(line)) {
            consoleUsage.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              type: (line.match(/console\.(\w+)/) || [])[1],
              code: line.trim()
            });
          }
        });
      }
    });
    
    return consoleUsage;
  }

  findUnusedImports() {
    const unusedImports = [];
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const imports = [];
        const usages = new Set();
        
        lines.forEach((line, index) => {
          // Extract imports
          const importMatch = line.match(/import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from/);
          if (importMatch) {
            if (importMatch[1]) {
              // Named imports
              importMatch[1].split(',').forEach(imp => {
                const name = imp.trim().split(' as ')[0].trim();
                imports.push({ name, line: index + 1 });
              });
            } else if (importMatch[2] || importMatch[3]) {
              // Default or namespace import
              const name = importMatch[2] || importMatch[3];
              imports.push({ name, line: index + 1 });
            }
          }
          
          // Track usage (simplified)
          imports.forEach(imp => {
            if (line.includes(imp.name) && !line.includes('import')) {
              usages.add(imp.name);
            }
          });
        });
        
        imports.forEach(imp => {
          if (!usages.has(imp.name)) {
            unusedImports.push({
              file: path.relative(process.cwd(), filePath),
              line: imp.line,
              import: imp.name
            });
          }
        });
      }
    });
    
    return unusedImports;
  }

  // Technical Debt Calculation Methods
  calculateDebtIndex() {
    const factors = [
      this.qualityMetrics.codeSmells?.longMethods?.length || 0,
      this.qualityMetrics.codeSmells?.duplicatedCode?.length || 0,
      this.qualityMetrics.codeSmells?.complexConditions?.length || 0,
      this.qualityMetrics.typeScript?.anyUsage?.total || 0,
      this.qualityMetrics.typeScript?.typeErrors?.length || 0
    ];
    
    const totalIssues = factors.reduce((sum, factor) => sum + factor, 0);
    const maxIssues = 100; // Arbitrary maximum for scoring
    
    return Math.max(0, 100 - Math.round((totalIssues / maxIssues) * 100));
  }

  identifyRefactoringOpportunities() {
    const opportunities = [];
    
    // Long methods
    if (this.qualityMetrics.codeSmells?.longMethods?.length > 0) {
      opportunities.push({
        type: 'Extract Method',
        priority: 'High',
        count: this.qualityMetrics.codeSmells.longMethods.length,
        description: 'Break down long methods into smaller, focused functions'
      });
    }
    
    // Duplicated code
    if (this.qualityMetrics.codeSmells?.duplicatedCode?.length > 0) {
      opportunities.push({
        type: 'Extract Common Code',
        priority: 'High',
        count: this.qualityMetrics.codeSmells.duplicatedCode.length,
        description: 'Move duplicated code to shared utilities or base classes'
      });
    }
    
    // Type safety
    if (this.qualityMetrics.typeScript?.anyUsage?.total > 10) {
      opportunities.push({
        type: 'Improve Type Safety',
        priority: 'Medium',
        count: this.qualityMetrics.typeScript.anyUsage.total,
        description: 'Replace any types with proper interfaces and types'
      });
    }
    
    return opportunities;
  }

  scanSecurityIssues() {
    const securityIssues = [];
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for potential security issues
        const patterns = [
          { pattern: /eval\s*\(/, type: 'Code Injection', severity: 'High' },
          { pattern: /document\.write\s*\(/, type: 'XSS Risk', severity: 'Medium' },
          { pattern: /innerHTML\s*=/, type: 'XSS Risk', severity: 'Medium' },
          { pattern: /password\s*=\s*['"][^'"]*['"]/, type: 'Hardcoded Password', severity: 'High' },
          { pattern: /api[_-]?key\s*=\s*['"][^'"]*['"]/, type: 'Hardcoded API Key', severity: 'High' }
        ];
        
        patterns.forEach(({ pattern, type, severity }) => {
          const matches = content.match(pattern);
          if (matches) {
            securityIssues.push({
              file: path.relative(process.cwd(), filePath),
              type,
              severity,
              pattern: pattern.toString()
            });
          }
        });
      }
    });
    
    return securityIssues;
  }

  identifyPerformanceIssues() {
    const performanceIssues = [];
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Check for potential performance issues
          if (line.includes('findMany') && !line.includes('take') && !line.includes('limit')) {
            performanceIssues.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              type: 'Unbounded Query',
              description: 'Database query without pagination',
              code: line.trim()
            });
          }
          
          if (line.includes('forEach') && line.includes('await')) {
            performanceIssues.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              type: 'Sequential Async',
              description: 'Async operations in forEach (use Promise.all instead)',
              code: line.trim()
            });
          }
        });
      }
    });
    
    return performanceIssues;
  }

  checkDependencyVulnerabilities() {
    try {
      const result = execSync('npm audit --json', { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      const audit = JSON.parse(result);
      
      return {
        vulnerabilities: audit.metadata?.vulnerabilities || {},
        total: audit.metadata?.total || 0
      };
    } catch (error) {
      return { vulnerabilities: {}, total: 0, error: error.message };
    }
  }

  // Maintainability Calculation Methods
  calculateCohesion() {
    // Simplified cohesion calculation based on method-to-field ratios
    let totalCohesion = 0;
    let classCount = 0;
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        const classes = content.match(/class\s+\w+/g) || [];
        classes.forEach(() => {
          // Simple heuristic: count methods vs properties
          const methods = (content.match(/\w+\s*\([^)]*\)\s*[:{]/g) || []).length;
          const properties = (content.match(/private|public|protected\s+\w+:/g) || []).length;
          
          const cohesion = properties > 0 ? Math.min(100, (methods / properties) * 20) : 50;
          totalCohesion += cohesion;
          classCount++;
        });
      }
    });
    
    return classCount > 0 ? Math.round(totalCohesion / classCount) : 75;
  }

  calculateCoupling() {
    let totalImports = 0;
    let fileCount = 0;
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const imports = (content.match(/import\s+.*from\s+['"][^'"]*['"]/g) || []).length;
        
        totalImports += imports;
        fileCount++;
      }
    });
    
    const avgImports = fileCount > 0 ? totalImports / fileCount : 0;
    return Math.max(0, 100 - Math.round(avgImports * 5)); // Lower coupling is better
  }

  calculateComplexityMetrics() {
    let totalComplexity = 0;
    let functionCount = 0;
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Count complexity indicators
        const functions = content.match(/(function|async\s+function|\w+\s*\([^)]*\)\s*[:{])/g) || [];
        functions.forEach(() => {
          const conditions = (content.match(/if\s*\(|while\s*\(|for\s*\(|switch\s*\(/g) || []).length;
          const logicalOps = (content.match(/&&|\|\|/g) || []).length;
          const complexity = 1 + conditions + logicalOps; // Base complexity + decision points
          
          totalComplexity += complexity;
          functionCount++;
        });
      }
    });
    
    return {
      total: totalComplexity,
      average: functionCount > 0 ? Math.round(totalComplexity / functionCount) : 0,
      functions: functionCount
    };
  }

  calculateReadabilityScore() {
    let readabilityScore = 100;
    
    // Deduct points for readability issues
    const longMethods = this.qualityMetrics.codeSmells?.longMethods?.length || 0;
    const complexConditions = this.qualityMetrics.codeSmells?.complexConditions?.length || 0;
    const magicNumbers = this.qualityMetrics.codeSmells?.magicNumbers?.length || 0;
    
    readabilityScore -= longMethods * 2;
    readabilityScore -= complexConditions * 3;
    readabilityScore -= magicNumbers * 1;
    
    return Math.max(0, readabilityScore);
  }

  calculateDocumentationCoverage() {
    let documentedFunctions = 0;
    let totalFunctions = 0;
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check for function/method definitions
          if (/(async\s+)?\w+\s*\([^)]*\)\s*[:{]/.test(line)) {
            totalFunctions++;
            
            // Check if previous lines contain JSDoc
            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
              if (lines[j].includes('/**') || lines[j].includes('*')) {
                documentedFunctions++;
                break;
              }
              if (lines[j].trim() && !lines[j].includes('//')) {
                break; // Stop if we hit non-comment code
              }
            }
          }
        }
      }
    });
    
    return {
      documented: documentedFunctions,
      total: totalFunctions,
      percentage: totalFunctions > 0 ? Math.round((documentedFunctions / totalFunctions) * 100) : 0
    };
  }

  // Test Coverage Methods
  countUnitTests() {
    const unitTests = { count: 0, files: [] };
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.includes('.test.') || filePath.includes('.spec.')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const tests = (content.match(/it\s*\(|test\s*\(/g) || []).length;
        
        unitTests.count += tests;
        unitTests.files.push({
          file: path.relative(process.cwd(), filePath),
          tests
        });
      }
    });
    
    return unitTests;
  }

  countIntegrationTests() {
    // Look for integration test patterns
    const integrationTests = { count: 0, files: [] };
    
    const testDirs = [
      path.join(process.cwd(), 'tests'),
      path.join(process.cwd(), 'test')
    ];
    
    testDirs.forEach(testDir => {
      if (fs.existsSync(testDir)) {
        this.walkDirectory(testDir, (filePath) => {
          if (filePath.includes('integration') || filePath.includes('.integration.')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const tests = (content.match(/it\s*\(|test\s*\(/g) || []).length;
            
            integrationTests.count += tests;
            integrationTests.files.push({
              file: path.relative(process.cwd(), filePath),
              tests
            });
          }
        });
      }
    });
    
    return integrationTests;
  }

  countE2ETests() {
    const e2eTests = { count: 0, files: [] };
    
    const e2eDir = path.join(process.cwd(), 'tests/e2e');
    if (fs.existsSync(e2eDir)) {
      this.walkDirectory(e2eDir, (filePath) => {
        if (filePath.endsWith('.spec.ts')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const tests = (content.match(/test\s*\(/g) || []).length;
          
          e2eTests.count += tests;
          e2eTests.files.push({
            file: path.relative(process.cwd(), filePath),
            tests
          });
        }
      });
    }
    
    return e2eTests;
  }

  getCoverageMetrics() {
    try {
      const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      }
    } catch (error) {
      // Return estimated coverage
    }
    
    return {
      estimated: true,
      total: {
        lines: { pct: 65 },
        statements: { pct: 70 },
        functions: { pct: 60 },
        branches: { pct: 55 }
      }
    };
  }

  assessTestQuality() {
    let totalAssertions = 0;
    let totalTests = 0;
    
    this.walkDirectory(this.backendSrcPath, (filePath) => {
      if (filePath.includes('.test.') || filePath.includes('.spec.')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        const tests = (content.match(/it\s*\(|test\s*\(/g) || []).length;
        const assertions = (content.match(/expect\s*\(|assert\./g) || []).length;
        
        totalTests += tests;
        totalAssertions += assertions;
      }
    });
    
    return {
      totalTests,
      totalAssertions,
      averageAssertions: totalTests > 0 ? Math.round(totalAssertions / totalTests) : 0
    };
  }

  // Dependency Analysis Methods
  findOutdatedDependencies() {
    try {
      const result = execSync('npm outdated --json', { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      const outdated = JSON.parse(result);
      
      return Object.keys(outdated).map(pkg => ({
        package: pkg,
        current: outdated[pkg].current,
        wanted: outdated[pkg].wanted,
        latest: outdated[pkg].latest
      }));
    } catch (error) {
      return [];
    }
  }

  findUnusedDependencies() {
    // Simplified check - in practice, you'd use tools like depcheck
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      const usedDeps = new Set();
      
      // Check imports in source files
      this.walkDirectory(this.backendSrcPath, (filePath) => {
        if (filePath.endsWith('.ts')) {
          const content = fs.readFileSync(filePath, 'utf8');
          dependencies.forEach(dep => {
            if (content.includes(`from '${dep}'`) || content.includes(`require('${dep}')`)) {
              usedDeps.add(dep);
            }
          });
        }
      });
      
      return dependencies.filter(dep => !usedDeps.has(dep));
    } catch (error) {
      return [];
    }
  }

  findDuplicateDependencies() {
    // Check for packages that appear in multiple package.json files
    const duplicates = [];
    const allDeps = new Map();
    
    const packageFiles = [
      path.join(process.cwd(), 'package.json'),
      path.join(process.cwd(), 'apps/backend/package.json'),
      path.join(process.cwd(), 'apps/frontend/package.json')
    ];
    
    packageFiles.forEach(pkgFile => {
      if (fs.existsSync(pkgFile)) {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        Object.keys(deps).forEach(dep => {
          if (!allDeps.has(dep)) {
            allDeps.set(dep, []);
          }
          allDeps.get(dep).push({
            file: path.relative(process.cwd(), pkgFile),
            version: deps[dep]
          });
        });
      }
    });
    
    allDeps.forEach((locations, dep) => {
      if (locations.length > 1) {
        duplicates.push({
          package: dep,
          locations
        });
      }
    });
    
    return duplicates;
  }

  checkDependencySecurity() {
    return this.checkDependencyVulnerabilities();
  }

  analyzeDependencySizes() {
    // Simplified analysis - would need actual bundler analysis for accuracy
    return {
      estimated: true,
      note: 'Use webpack-bundle-analyzer for detailed size analysis'
    };
  }

  // Utility Methods
  walkDirectory(dir, callback) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
        this.walkDirectory(itemPath, callback);
      } else if (stats.isFile()) {
        callback(itemPath);
      }
    });
  }

  normalizeCode(code) {
    return code
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .trim();
  }

  /**
   * Generate comprehensive quality report
   */
  generateReport() {
    console.log('\n📋 CODE QUALITY ANALYSIS REPORT');
    console.log('=' .repeat(60));

    // TypeScript Quality
    console.log('\n🔧 TypeScript Quality:');
    console.log(`   Strict mode: ${this.qualityMetrics.typeScript.strictMode ? 'Enabled' : 'Disabled'}`);
    console.log(`   Any types: ${this.qualityMetrics.typeScript.anyUsage.total}`);
    console.log(`   Type errors: ${this.qualityMetrics.typeScript.typeErrors.length}`);
    console.log(`   Type complexity: ${this.qualityMetrics.typeScript.typeComplexity.average}/file`);

    // Code Smells
    console.log('\n👃 Code Smells:');
    console.log(`   Long methods: ${this.qualityMetrics.codeSmells.longMethods.length}`);
    console.log(`   Duplicated code blocks: ${this.qualityMetrics.codeSmells.duplicatedCode.length}`);
    console.log(`   Complex conditions: ${this.qualityMetrics.codeSmells.complexConditions.length}`);
    console.log(`   Magic numbers: ${this.qualityMetrics.codeSmells.magicNumbers.length}`);
    console.log(`   TODO comments: ${this.qualityMetrics.codeSmells.todoComments.length}`);
    console.log(`   Console usage: ${this.qualityMetrics.codeSmells.console_logs.length}`);

    // Technical Debt
    console.log('\n📊 Technical Debt:');
    console.log(`   Debt index: ${this.qualityMetrics.technicalDebt.debtIndex}/100`);
    console.log(`   Refactoring opportunities: ${this.qualityMetrics.technicalDebt.refactoringOpportunities.length}`);
    console.log(`   Performance issues: ${this.qualityMetrics.technicalDebt.performanceIssues.length}`);
    console.log(`   Security issues: ${this.qualityMetrics.technicalDebt.securityVulnerabilities.length}`);

    // Maintainability
    console.log('\n🛠️  Maintainability:');
    console.log(`   Cohesion: ${this.qualityMetrics.maintainability.cohesion}/100`);
    console.log(`   Coupling: ${this.qualityMetrics.maintainability.coupling}/100`);
    console.log(`   Readability: ${this.qualityMetrics.maintainability.readability}/100`);
    console.log(`   Documentation: ${this.qualityMetrics.maintainability.documentationCoverage.percentage}%`);

    // Test Coverage
    console.log('\n🧪 Test Coverage:');
    console.log(`   Unit tests: ${this.qualityMetrics.testCoverage.unitTests.count}`);
    console.log(`   Integration tests: ${this.qualityMetrics.testCoverage.integrationTests.count}`);
    console.log(`   E2E tests: ${this.qualityMetrics.testCoverage.e2eTests.count}`);

    // Dependencies
    console.log('\n📦 Dependencies:');
    console.log(`   Outdated: ${this.qualityMetrics.dependencies.outdated.length}`);
    console.log(`   Unused: ${this.qualityMetrics.dependencies.unused.length}`);
    console.log(`   Duplicates: ${this.qualityMetrics.dependencies.duplicates.length}`);

    // Overall Assessment
    const overallScore = this.calculateOverallQualityScore();
    console.log('\n🎯 Overall Quality Score:');
    console.log(`   Score: ${overallScore}/100`);
    console.log(`   Grade: ${this.getQualityGrade(overallScore)}`);

    this.generateRecommendations();
  }

  calculateOverallQualityScore() {
    const weights = {
      typeScript: 0.25,
      maintainability: 0.25,
      technicalDebt: 0.25,
      testCoverage: 0.15,
      dependencies: 0.10
    };

    const scores = {
      typeScript: this.calculateTypeScriptScore(),
      maintainability: this.calculateMaintainabilityScore(),
      technicalDebt: this.qualityMetrics.technicalDebt.debtIndex,
      testCoverage: this.calculateTestCoverageScore(),
      dependencies: this.calculateDependencyScore()
    };

    let totalScore = 0;
    Object.keys(weights).forEach(key => {
      totalScore += scores[key] * weights[key];
    });

    return Math.round(totalScore);
  }

  calculateTypeScriptScore() {
    let score = 100;
    
    // Deduct for issues
    score -= Math.min(30, this.qualityMetrics.typeScript.anyUsage.total * 2);
    score -= Math.min(40, this.qualityMetrics.typeScript.typeErrors.length * 5);
    if (!this.qualityMetrics.typeScript.strictMode) score -= 20;
    
    return Math.max(0, score);
  }

  calculateMaintainabilityScore() {
    return Math.round((
      this.qualityMetrics.maintainability.cohesion +
      this.qualityMetrics.maintainability.coupling +
      this.qualityMetrics.maintainability.readability
    ) / 3);
  }

  calculateTestCoverageScore() {
    const coverage = this.qualityMetrics.testCoverage.coverage;
    if (coverage.estimated) {
      return 65; // Estimated average
    }
    
    return Math.round((
      coverage.total.lines.pct +
      coverage.total.statements.pct +
      coverage.total.functions.pct +
      coverage.total.branches.pct
    ) / 4);
  }

  calculateDependencyScore() {
    let score = 100;
    
    score -= this.qualityMetrics.dependencies.outdated.length * 2;
    score -= this.qualityMetrics.dependencies.unused.length * 3;
    score -= this.qualityMetrics.dependencies.duplicates.length * 5;
    
    return Math.max(0, score);
  }

  getQualityGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  generateRecommendations() {
    console.log('\n💡 Quality Improvement Recommendations:');
    
    const recommendations = [];
    
    // TypeScript recommendations
    if (this.qualityMetrics.typeScript.anyUsage.total > 5) {
      recommendations.push('Replace any types with proper interfaces and types');
    }
    if (!this.qualityMetrics.typeScript.strictMode) {
      recommendations.push('Enable TypeScript strict mode for better type safety');
    }
    
    // Code smell recommendations
    if (this.qualityMetrics.codeSmells.longMethods.length > 0) {
      recommendations.push('Break down long methods into smaller, focused functions');
    }
    if (this.qualityMetrics.codeSmells.duplicatedCode.length > 5) {
      recommendations.push('Extract duplicated code into shared utilities');
    }
    
    // Technical debt recommendations
    if (this.qualityMetrics.technicalDebt.debtIndex < 70) {
      recommendations.push('Address high-priority technical debt items');
    }
    
    // Test coverage recommendations
    if (this.qualityMetrics.testCoverage.unitTests.count < 50) {
      recommendations.push('Increase unit test coverage');
    }
    
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  /**
   * Save quality metrics to file
   */
  saveMetrics() {
    const metricsFile = path.join(process.cwd(), 'code-quality-metrics.json');
    fs.writeFileSync(metricsFile, JSON.stringify(this.qualityMetrics, null, 2));
    console.log(`\n📁 Quality metrics saved to ${metricsFile}`);
    return metricsFile;
  }

  /**
   * Run comprehensive quality analysis
   */
  async runAnalysis() {
    console.log('🚀 Starting Code Quality Analysis...\n');
    
    this.analyzeTypeScript();
    this.detectCodeSmells();
    this.calculateTechnicalDebt();
    this.analyzeMaintainability();
    this.assessTestCoverage();
    this.analyzeDependencies();
    
    const metricsFile = this.saveMetrics();
    this.generateReport();
    
    return {
      metrics: this.qualityMetrics,
      metricsFile
    };
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new CodeQualityAnalyzer();
  analyzer.runAnalysis()
    .then(result => {
      console.log('\n✅ Code quality analysis complete!');
      console.log(`📁 Results saved to: ${result.metricsFile}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    });
}

module.exports = { CodeQualityAnalyzer };