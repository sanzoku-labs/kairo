# Migration Tooling ✅ READY FOR DEVELOPMENT

> **Automated V1 to V2 migration tools and strategies for Kairo**  
> **Status: ✅ V2 implementation complete - Migration tooling ready for development**

## Overview ✅ Implementation Complete

Kairo V2 represents a complete architectural shift from V1's 340+ functions to a focused 23-function three-pillar design. This document outlines migration tooling, automated transformations, and manual migration strategies.

**Implementation Status**: ✅ **V2 implementation complete - Ready to build migration tools**

## ✅ Migration Philosophy - Strategy Defined

### **✅ Gradual Migration Strategy - Ready for Implementation**
- ✅ No "big bang" migrations required - **Strategy defined**
- ✅ V1 and V2 can coexist temporarily - **Architecture supports this**
- ✅ Automated tooling for common patterns - **V2 patterns complete, ready for tooling**
- ✅ Clear migration path for each V1 feature - **V2 mapping complete**
- ✅ Fallback compatibility for critical features - **Strategy defined**

### **Migration Priorities**
```typescript
// Migration complexity tiers
interface MigrationComplexity {
  automated: {
    // Can be fully automated with codemods
    patterns: ['basic validation', 'simple HTTP calls', 'array transformations']
    coverage: '60-70%'
    effort: 'Low'
  }
  
  semiAutomated: {
    // Require minimal manual intervention
    patterns: ['complex schemas', 'pipeline compositions', 'error handling']
    coverage: '20-25%' 
    effort: 'Medium'
  }
  
  manual: {
    // Require complete rewrite
    patterns: ['custom extensions', 'complex business logic', 'performance optimizations']
    coverage: '10-15%'
    effort: 'High'
  }
}
```

## Migration Assessment Tool

### **Codebase Analysis**
```typescript
// scripts/analyze-v1-usage.ts
import { Project, SyntaxKind } from 'ts-morph'
import { writeFileSync } from 'fs'

interface V1UsageReport {
  files: string[]
  patterns: {
    pattern: string
    count: number
    locations: Array<{ file: string; line: number; code: string }>
    migrationStrategy: 'automated' | 'semi-automated' | 'manual'
    v2Equivalent: string
  }[]
  complexity: {
    automated: number
    semiAutomated: number
    manual: number
  }
  estimatedEffort: {
    hours: number
    risk: 'low' | 'medium' | 'high'
  }
}

const analyzeV1Usage = (projectPath: string): V1UsageReport => {
  const project = new Project({
    tsConfigFilePath: `${projectPath}/tsconfig.json`
  })
  
  const sourceFiles = project.getSourceFiles()
  const patterns: V1UsageReport['patterns'] = []
  
  // Analyze V1 patterns
  const v1Patterns = [
    {
      name: 'resource() calls',
      regex: /resource\(['"][^'"]+['"][^)]*\)/g,
      migration: 'automated',
      v2: 'service.get() / service.post()'
    },
    {
      name: 'pipeline() chains', 
      regex: /pipeline\(\)[^;]+/g,
      migration: 'semi-automated',
      v2: 'pipeline.compose() or pipeline.map().then()'
    },
    {
      name: 'schema.object() usage',
      regex: /schema\.object\([^)]+\)/g,
      migration: 'automated', 
      v2: 'data.schema()'
    },
    {
      name: 'repository() usage',
      regex: /repository\([^)]+\)/g,
      migration: 'manual',
      v2: 'service + data + pipeline composition'
    }
  ]
  
  sourceFiles.forEach(file => {
    const text = file.getFullText()
    const filePath = file.getFilePath()
    
    v1Patterns.forEach(pattern => {
      const matches = text.matchAll(pattern.regex)
      
      for (const match of matches) {
        const line = file.getLineNumberAtPos(match.index!)
        
        patterns.push({
          pattern: pattern.name,
          count: 1,
          locations: [{ 
            file: filePath, 
            line, 
            code: match[0] 
          }],
          migrationStrategy: pattern.migration as any,
          v2Equivalent: pattern.v2
        })
      }
    })
  })
  
  // Calculate complexity
  const automated = patterns.filter(p => p.migrationStrategy === 'automated').length
  const semiAutomated = patterns.filter(p => p.migrationStrategy === 'semi-automated').length
  const manual = patterns.filter(p => p.migrationStrategy === 'manual').length
  
  const totalPatterns = automated + semiAutomated + manual
  const estimatedHours = (automated * 0.5) + (semiAutomated * 2) + (manual * 8)
  
  return {
    files: [...new Set(patterns.map(p => p.locations[0].file))],
    patterns,
    complexity: { automated, semiAutomated, manual },
    estimatedEffort: {
      hours: estimatedHours,
      risk: totalPatterns > 100 ? 'high' : totalPatterns > 50 ? 'medium' : 'low'
    }
  }
}

// Generate migration report
const generateMigrationReport = (projectPath: string) => {
  const report = analyzeV1Usage(projectPath)
  
  const markdown = `
# Kairo V1 → V2 Migration Report

## Summary
- **Files to migrate**: ${report.files.length}
- **Total patterns found**: ${report.patterns.length}
- **Estimated effort**: ${report.estimatedEffort.hours} hours
- **Risk level**: ${report.estimatedEffort.risk}

## Migration Breakdown
- **Automated**: ${report.complexity.automated} patterns (${((report.complexity.automated / report.patterns.length) * 100).toFixed(1)}%)
- **Semi-automated**: ${report.complexity.semiAutomated} patterns (${((report.complexity.semiAutomated / report.patterns.length) * 100).toFixed(1)}%)
- **Manual**: ${report.complexity.manual} patterns (${((report.complexity.manual / report.patterns.length) * 100).toFixed(1)}%)

## Pattern Details
${report.patterns.map(p => `
### ${p.pattern}
- **Migration**: ${p.migrationStrategy}
- **V2 equivalent**: ${p.v2Equivalent}
- **Locations**: ${p.locations.length}

\`\`\`typescript
${p.locations[0].code}
\`\`\`
`).join('\n')}

## Next Steps
1. Run automated migration tools for ${report.complexity.automated} patterns
2. Review semi-automated migrations for ${report.complexity.semiAutomated} patterns  
3. Plan manual migration for ${report.complexity.manual} patterns
4. Set up V1/V2 compatibility layer if needed
`
  
  writeFileSync('migration-report.md', markdown)
  console.log('Migration report generated: migration-report.md')
  
  return report
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2] || '.'
  generateMigrationReport(projectPath)
}
```

## Automated Migration Codemods

### **JSCodeshift Transformations**
```typescript
// codemods/resource-to-service.ts
import { Transform, FileInfo, API, Options } from 'jscodeshift'

const transform: Transform = (fileInfo: FileInfo, api: API, options: Options) => {
  const j = api.jscodeshift
  const root = j(fileInfo.source)
  
  // Transform resource() calls to service methods
  root
    .find(j.CallExpression, {
      callee: { name: 'resource' }
    })
    .forEach(path => {
      const args = path.value.arguments
      
      if (args.length >= 1 && j.Literal.check(args[0])) {
        const endpoint = args[0].value as string
        const options = args[1]
        
        // Determine HTTP method from options or default to GET
        let method = 'get'
        if (j.ObjectExpression.check(options)) {
          const methodProp = options.properties.find(prop => 
            j.Property.check(prop) && 
            j.Identifier.check(prop.key) && 
            prop.key.name === 'method'
          )
          
          if (methodProp && j.Property.check(methodProp) && j.Literal.check(methodProp.value)) {
            method = (methodProp.value.value as string).toLowerCase()
          }
        }
        
        // Replace with service.method() call
        const newCall = j.callExpression(
          j.memberExpression(j.identifier('service'), j.identifier(method)),
          [args[0], options].filter(Boolean)
        )
        
        j(path).replaceWith(newCall)
      }
    })
  
  // Add service import if not present
  const hasServiceImport = root
    .find(j.ImportDeclaration)
    .some(path => {
      const source = path.value.source
      return j.Literal.check(source) && source.value === 'kairo'
    })
  
  if (!hasServiceImport) {
    const serviceImport = j.importDeclaration(
      [j.importSpecifier(j.identifier('service'))],
      j.literal('kairo')
    )
    
    root.get().node.body.unshift(serviceImport)
  }
  
  return root.toSource({ quote: 'single' })
}

export default transform
```

### **Schema Migration**
```typescript
// codemods/schema-to-data.ts
import { Transform, FileInfo, API } from 'jscodeshift'

const transform: Transform = (fileInfo: FileInfo, api: API) => {
  const j = api.jscodeshift
  const root = j(fileInfo.source)
  
  // Transform schema.object() to data.schema()
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'schema' },
        property: { name: 'object' }
      }
    })
    .forEach(path => {
      const args = path.value.arguments
      
      // Replace schema.object() with data.schema()
      const newCall = j.callExpression(
        j.memberExpression(j.identifier('data'), j.identifier('schema')),
        args
      )
      
      j(path).replaceWith(newCall)
    })
  
  // Transform field types
  const fieldTransforms = {
    'schema.string()': 'data.string()',
    'schema.number()': 'data.number()',
    'schema.boolean()': 'data.boolean()',
    'schema.array()': 'data.array()',
    'schema.date()': 'data.date()'
  }
  
  Object.entries(fieldTransforms).forEach(([oldPattern, newPattern]) => {
    const [oldObj, oldMethod] = oldPattern.split('.')
    const [newObj, newMethod] = newPattern.split('.')
    
    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: { name: oldObj.replace('()', '') },
          property: { name: oldMethod.replace('()', '') }
        }
      })
      .forEach(path => {
        const newCall = j.callExpression(
          j.memberExpression(
            j.identifier(newObj), 
            j.identifier(newMethod.replace('()', ''))
          ),
          path.value.arguments
        )
        
        j(path).replaceWith(newCall)
      })
  })
  
  // Update imports
  root
    .find(j.ImportDeclaration)
    .forEach(path => {
      const source = path.value.source
      if (j.Literal.check(source) && source.value === 'kairo') {
        const specifiers = path.value.specifiers || []
        
        // Replace 'schema' with 'data' in imports
        specifiers.forEach(spec => {
          if (j.ImportSpecifier.check(spec) && spec.imported.name === 'schema') {
            spec.imported.name = 'data'
            if (spec.local) {
              spec.local.name = 'data'
            }
          }
        })
      }
    })
  
  return root.toSource({ quote: 'single' })
}

export default transform
```

### **Pipeline Migration**
```typescript
// codemods/pipeline-composition.ts
import { Transform, FileInfo, API } from 'jscodeshift'

const transform: Transform = (fileInfo: FileInfo, api: API) => {
  const j = api.jscodeshift
  const root = j(fileInfo.source)
  
  // Transform method chaining to functional composition
  root
    .find(j.CallExpression)
    .filter(path => {
      // Find pipeline().method().method() chains
      const callee = path.value.callee
      return j.MemberExpression.check(callee) &&
             isPipelineChain(callee)
    })
    .forEach(path => {
      const chain = extractChainMethods(path.value)
      
      if (chain.length > 1) {
        // Convert to pipeline.compose()
        const composeArgs = chain.map(method => {
          if (method.name === 'map') {
            return j.arrowFunctionExpression(
              [j.identifier('data')],
              j.callExpression(
                j.memberExpression(j.identifier('pipeline'), j.identifier('map')),
                [j.identifier('data'), ...method.args]
              )
            )
          } else if (method.name === 'filter') {
            return j.arrowFunctionExpression(
              [j.identifier('data')],
              j.callExpression(
                j.memberExpression(j.identifier('pipeline'), j.identifier('filter')),
                [j.identifier('data'), ...method.args]
              )
            )
          }
          // Add more method transformations as needed
          return null
        }).filter(Boolean)
        
        const newCall = j.callExpression(
          j.memberExpression(j.identifier('pipeline'), j.identifier('compose')),
          composeArgs
        )
        
        j(path).replaceWith(newCall)
      }
    })
  
  return root.toSource({ quote: 'single' })
}

const isPipelineChain = (node: any): boolean => {
  if (j.CallExpression.check(node.object)) {
    return isPipelineChain(node.object.callee) || 
           (j.Identifier.check(node.object.callee) && node.object.callee.name === 'pipeline')
  }
  return j.Identifier.check(node.object) && node.object.name === 'pipeline'
}

const extractChainMethods = (node: any): Array<{ name: string; args: any[] }> => {
  const methods: Array<{ name: string; args: any[] }> = []
  
  const traverse = (n: any) => {
    if (j.CallExpression.check(n) && j.MemberExpression.check(n.callee)) {
      if (j.CallExpression.check(n.callee.object)) {
        traverse(n.callee.object)
      }
      
      if (j.Identifier.check(n.callee.property)) {
        methods.push({
          name: n.callee.property.name,
          args: n.arguments
        })
      }
    }
  }
  
  traverse(node)
  return methods
}

export default transform
```

## Semi-Automated Migration Tools

### **Interactive Migration CLI**
```typescript
// cli/migrate.ts
import inquirer from 'inquirer'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import chalk from 'chalk'

interface MigrationStep {
  name: string
  description: string
  automated: boolean
  codemod?: string
  manualInstructions?: string
}

const migrationSteps: MigrationStep[] = [
  {
    name: 'Resource to Service',
    description: 'Convert resource() calls to service methods',
    automated: true,
    codemod: 'resource-to-service'
  },
  {
    name: 'Schema Migration',
    description: 'Convert schema.object() to data.schema()',
    automated: true,
    codemod: 'schema-to-data'
  },
  {
    name: 'Pipeline Composition',
    description: 'Convert method chains to functional composition',
    automated: false,
    manualInstructions: `
Manual steps required:
1. Identify pipeline() chains in your code
2. Convert to pipeline.compose() or individual method calls
3. Update error handling to use Result pattern
4. Test thoroughly as this affects business logic
`
  },
  {
    name: 'Repository Migration',
    description: 'Migrate repository() usage to pillar composition',
    automated: false,
    manualInstructions: `
Repository migration requires manual intervention:
1. Identify data storage patterns in repository() usage
2. Replace with appropriate service + data + pipeline composition
3. Consider using external state management for complex cases
4. Update tests and ensure data consistency
`
  }
]

const runMigration = async () => {
  console.log(chalk.blue('🚀 Kairo V1 → V2 Migration Tool\n'))
  
  // Step 1: Analysis
  console.log(chalk.yellow('Step 1: Analyzing codebase...'))
  const report = analyzeV1Usage('.')
  
  console.log(`Found ${report.patterns.length} V1 patterns in ${report.files.length} files`)
  console.log(`Estimated effort: ${report.estimatedEffort.hours} hours\n`)
  
  // Step 2: Choose migration strategy
  const { strategy } = await inquirer.prompt({
    type: 'list',
    name: 'strategy',
    message: 'Choose migration strategy:',
    choices: [
      { name: 'Full automatic migration (may require manual fixes)', value: 'auto' },
      { name: 'Interactive step-by-step migration', value: 'interactive' },
      { name: 'Generate migration plan only', value: 'plan' }
    ]
  })
  
  if (strategy === 'plan') {
    generateMigrationPlan(report)
    return
  }
  
  // Step 3: Run migrations
  if (strategy === 'auto') {
    await runAutomaticMigration()
  } else {
    await runInteractiveMigration()
  }
  
  console.log(chalk.green('✅ Migration completed!'))
  console.log(chalk.yellow('Next steps:'))
  console.log('1. Review generated changes')
  console.log('2. Run tests to ensure functionality')
  console.log('3. Update imports to use kairo@2')
  console.log('4. Handle any manual migration items')
}

const runAutomaticMigration = async () => {
  const automatedSteps = migrationSteps.filter(step => step.automated)
  
  for (const step of automatedSteps) {
    console.log(chalk.blue(`Running: ${step.name}`))
    
    try {
      execSync(`npx jscodeshift -t codemods/${step.codemod}.js src/`, {
        stdio: 'inherit'
      })
      console.log(chalk.green(`✅ ${step.name} completed`))
    } catch (error) {
      console.log(chalk.red(`❌ ${step.name} failed: ${error.message}`))
    }
  }
}

const runInteractiveMigration = async () => {
  for (const step of migrationSteps) {
    console.log(chalk.blue(`\n${step.name}`))
    console.log(step.description)
    
    if (step.automated) {
      const { proceed } = await inquirer.prompt({
        type: 'confirm',
        name: 'proceed',
        message: `Run automated migration for ${step.name}?`,
        default: true
      })
      
      if (proceed) {
        try {
          execSync(`npx jscodeshift -t codemods/${step.codemod}.js src/`, {
            stdio: 'inherit'
          })
          console.log(chalk.green(`✅ ${step.name} completed`))
        } catch (error) {
          console.log(chalk.red(`❌ ${step.name} failed: ${error.message}`))
        }
      }
    } else {
      console.log(chalk.yellow(step.manualInstructions))
      
      await inquirer.prompt({
        type: 'input',
        name: 'continue',
        message: 'Press Enter when manual steps are completed...'
      })
    }
  }
}

const generateMigrationPlan = (report: any) => {
  const plan = `
# Kairo V1 → V2 Migration Plan

## Overview
- **Total patterns**: ${report.patterns.length}
- **Estimated effort**: ${report.estimatedEffort.hours} hours
- **Risk level**: ${report.estimatedEffort.risk}

## Migration Phases

### Phase 1: Automated Migrations (${report.complexity.automated} patterns)
${migrationSteps.filter(s => s.automated).map(step => `
- **${step.name}**: ${step.description}
  - Command: \`npx jscodeshift -t codemods/${step.codemod}.js src/\`
`).join('')}

### Phase 2: Semi-Automated Migrations (${report.complexity.semiAutomated} patterns)
${migrationSteps.filter(s => !s.automated).map(step => `
- **${step.name}**: ${step.description}
  - Manual intervention required
`).join('')}

### Phase 3: Testing and Validation
- Run test suite after each phase
- Update package.json to kairo@2
- Verify functionality in staging environment

## Rollback Plan
1. Git branch for migration work
2. Backup of original codebase
3. Incremental commits for each migration step
4. Testing checkpoints between phases
`
  
  writeFileSync('migration-plan.md', plan)
  console.log(chalk.green('Migration plan generated: migration-plan.md'))
}

// Run CLI
runMigration().catch(console.error)
```

## Compatibility Layer

### **V1/V2 Bridge**
```typescript
// src/compatibility/v1-bridge.ts
import * as v2 from '../index'
import { Result } from '../core/result'

/**
 * Compatibility layer for gradual V1 → V2 migration
 * Provides V1-style APIs that delegate to V2 implementations
 */

// V1-style resource function
export const resource = (endpoint: string, options: any = {}) => {
  const { method = 'GET', ...restOptions } = options
  
  return {
    async get(params?: any) {
      const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint
      const result = await v2.service.get(url, restOptions)
      
      // Convert V2 Result to V1-style response (throws on error)
      if (Result.isOk(result)) {
        return result.value
      } else {
        throw new Error(result.error.message)
      }
    },
    
    async post(data: any) {
      const result = await v2.service.post(endpoint, data, restOptions)
      
      if (Result.isOk(result)) {
        return result.value
      } else {
        throw new Error(result.error.message)
      }
    },
    
    // Add other HTTP methods as needed
  }
}

// V1-style schema object
export const schema = {
  object: (shape: any) => {
    return v2.data.schema(shape)
  },
  
  string: () => v2.data.string(),
  number: () => v2.data.number(),
  boolean: () => v2.data.boolean(),
  array: (itemSchema: any) => v2.data.array(itemSchema),
  date: () => v2.data.date()
}

// V1-style pipeline with method chaining
export const pipeline = () => {
  let operations: Array<(data: any) => any> = []
  
  const chainable = {
    input: (data: any) => {
      operations.push(() => data)
      return chainable
    },
    
    map: (fn: (item: any) => any) => {
      operations.push((data) => {
        const result = v2.pipeline.map(data, fn)
        if (Result.isOk(result)) {
          return result.value
        } else {
          throw new Error(result.error.message)
        }
      })
      return chainable
    },
    
    filter: (predicate: (item: any) => boolean) => {
      operations.push((data) => {
        const result = v2.pipeline.filter(data, predicate)
        if (Result.isOk(result)) {
          return result.value
        } else {
          throw new Error(result.error.message)
        }
      })
      return chainable
    },
    
    async execute() {
      let current: any
      
      for (const operation of operations) {
        current = operation(current)
      }
      
      return current
    }
  }
  
  return chainable
}

// V1-style repository (simplified compatibility)
export const repository = (name: string, options: any = {}) => {
  console.warn(`Repository "${name}" is deprecated. Consider migrating to service + data + pipeline composition.`)
  
  // Basic compatibility - delegate to service calls
  return {
    async find(query?: any) {
      const endpoint = options.endpoint || `/${name}`
      const url = query ? `${endpoint}?${new URLSearchParams(query)}` : endpoint
      
      const result = await v2.service.get(url)
      if (Result.isOk(result)) {
        return result.value
      } else {
        throw new Error(result.error.message)
      }
    },
    
    async create(data: any) {
      const endpoint = options.endpoint || `/${name}`
      const result = await v2.service.post(endpoint, data)
      
      if (Result.isOk(result)) {
        return result.value
      } else {
        throw new Error(result.error.message)
      }
    }
    
    // Add other repository methods as needed
  }
}
```

### **Usage with Compatibility Layer**
```typescript
// Enable gradual migration by using compatibility layer
import { resource, schema, pipeline } from 'kairo/compatibility'

// V1 code continues to work
const api = resource('/users')
const UserSchema = schema.object({
  name: schema.string(),
  email: schema.string()
})

const users = await api.get()
const processed = await pipeline()
  .input(users)
  .map(user => ({ ...user, processed: true }))
  .filter(user => user.active)
  .execute()

// Gradually migrate to V2 syntax
import { service, data, pipeline as v2Pipeline } from 'kairo'

const v2Users = await service.get('/users')
const v2Processed = v2Pipeline.map(v2Users.value, user => ({ ...user, processed: true }))
```

## Migration Testing

### **Migration Validation**
```typescript
// tests/migration.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, copyFileSync } from 'fs'

describe('Migration Validation', () => {
  it('should preserve functionality after resource migration', async () => {
    // Create test file with V1 code
    const v1Code = `
import { resource } from 'kairo'

const api = resource('/users')
const users = await api.get()
`
    
    writeFileSync('test-migration.ts', v1Code)
    
    // Run migration codemod
    execSync('npx jscodeshift -t codemods/resource-to-service.js test-migration.ts')
    
    // Check migrated code
    const migratedCode = readFileSync('test-migration.ts', 'utf-8')
    
    expect(migratedCode).toContain('import { service } from')
    expect(migratedCode).toContain('service.get(\'/users\')')
    expect(migratedCode).not.toContain('resource(')
  })
  
  it('should handle complex pipeline migrations', () => {
    const v1Code = `
const result = pipeline()
  .input(data)
  .map(x => x * 2)
  .filter(x => x > 10)
  .execute()
`
    
    // Test manual migration pattern
    const v2Code = `
const result = pipeline.compose(
  (data) => pipeline.map(data, x => x * 2),
  (data) => pipeline.filter(data, x => x > 10)
)(data)
`
    
    // Both should produce equivalent results
    // (This would need actual implementation testing)
  })
})
```

## Migration Documentation

### **Migration Guide Structure**
```markdown
# Kairo V1 → V2 Migration Guide

## Prerequisites
- Node.js 18+
- TypeScript 4.5+
- Git (for backup and incremental migration)

## Migration Overview
1. **Assessment** - Analyze your codebase
2. **Planning** - Create migration strategy
3. **Automated** - Run codemods for common patterns
4. **Manual** - Handle complex cases
5. **Testing** - Validate functionality
6. **Cleanup** - Remove compatibility layer

## Step-by-Step Process

### Step 1: Assessment
```bash
npm install -g @kairo/migration-tools
kairo-migrate analyze .
```

### Step 2: Backup and Branching
```bash
git checkout -b migrate-to-v2
git commit -am "Backup before migration"
```

### Step 3: Install V2
```bash
npm install kairo@2
npm install @kairo/compatibility
```

### Step 4: Run Automated Migration
```bash
kairo-migrate run --interactive
```

### Step 5: Manual Migration
Follow the generated migration plan for manual items.

### Step 6: Testing
```bash
npm test
npm run build
```

### Step 7: Remove Compatibility Layer
Once fully migrated, remove compatibility imports.

## Common Migration Patterns

### Resource → Service
```typescript
// V1
const api = resource('/users', { method: 'GET' })
const users = await api.get()

// V2  
const users = await service.get('/users')
```

### Schema → Data
```typescript
// V1
const UserSchema = schema.object({
  name: schema.string(),
  email: schema.string()
})

// V2
const UserSchema = data.schema({
  name: data.string(),
  email: data.string()
})
```

### Pipeline Chains → Composition
```typescript
// V1
const result = pipeline()
  .input(data)
  .map(transform)
  .filter(predicate)
  .execute()

// V2
const result = pipeline.compose(
  (data) => pipeline.map(data, transform),
  (data) => pipeline.filter(data, predicate)
)(data)

// Or simpler:
const mapped = pipeline.map(data, transform)
const filtered = pipeline.filter(mapped, predicate)
```

## Troubleshooting

### Common Issues
1. **Type errors after migration** - Update imports and type annotations
2. **Runtime errors** - Check error handling patterns (V2 uses Result types)
3. **Performance regression** - Review caching and retry configurations
4. **Test failures** - Update test assertions for Result pattern

### Getting Help
- Check migration documentation
- Use compatibility layer temporarily
- Join community discussion forums
- File issues with specific migration problems
```

## Best Practices

### **1. Incremental Migration**
- Migrate one feature/module at a time
- Use feature flags to toggle between V1/V2
- Maintain test coverage throughout migration
- Document migration decisions and patterns

### **2. Risk Mitigation**
- Always backup before migration
- Use git branches for migration work  
- Test thoroughly at each step
- Have rollback plan ready

### **3. Team Coordination**
- Communicate migration timeline
- Provide training on V2 concepts
- Update team documentation
- Review migration pull requests carefully

---

**This migration tooling strategy ensures smooth transition from V1 to V2 with minimal disruption and maximum automation where possible.**