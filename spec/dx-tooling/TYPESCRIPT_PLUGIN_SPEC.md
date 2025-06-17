# TypeScript Plugin Specification

**Document**: TypeScript Language Server Plugin  
**Version**: 1.0  
**Phase**: Stream 2 (DX Tooling Development)  
**Priority**: High

---

## 🎯 Objective

Create an intelligent TypeScript language server plugin that provides context-aware auto-completion, validation, and guidance for Kairo integration patterns, eliminating the guesswork in component connections.

### Success Criteria

- **Error Reduction**: 80% reduction in integration type errors
- **Discovery Speed**: Instant discovery of valid next steps
- **Adoption Rate**: 70% of Kairo developers use the plugin
- **Satisfaction**: 8+/10 developer experience rating
- **Performance**: Sub-100ms response time for suggestions

---

## 🔧 Core Features

### **1. Context-Aware Auto-Completion**

#### **Pipeline Context Awareness**

```typescript
// When typing after pipeline() call, show context-specific suggestions
pipeline('example')
  .input(UserSchema) // IDE shows:
  // ✅ .map() - Transform data (UserSchema → any)
  // ✅ .pipeline() - Call another operation (expects User input)
  // ✅ .validateAllRules() - Apply business rules
  // ✅ .tap() - Side effect without changing data
  // ❌ .input() - Already has input (grayed out)
  // ❌ .output() - Not valid at this position

  // After adding .pipeline(), show compatible operations
  .pipeline('example')
  .input(UserSchema)
  .pipeline(/* cursor here */)
// IDE shows:
// ✅ UserAPI.get.run - Compatible (expects User-like input)
// ✅ ProfileAPI.create.run - Compatible with transform
// ❌ TodoAPI.create.run - Incompatible input type (show why)
```

#### **Resource Method Suggestions**

```typescript
const UserAPI = resource('users', { ... })

pipeline('example')
  .input(UserIdSchema)
  .pipeline(UserAPI./* cursor here */)
  // IDE shows methods with compatibility info:
  // ✅ get.run - Perfect match (expects { id: string })
  // ⚠️ create.run - Needs transform (expects CreateUser)
  // ⚠️ list.run - Input will be ignored
```

#### **Schema-Based Suggestions**

```typescript
const userSchema = schema.object({
  name: schema.string(),
  email: schema.string().email()
})

// When accessing schema-validated data
pipeline('typed')
  .input(userSchema)
  .map(user => user./* cursor here */)
  // IDE shows:
  // name: string
  // email: string
  // ❌ id - Not available (explain why)
```

### **2. Real-Time Validation & Quick Fixes**

#### **Integration Validation**

```typescript
pipeline('validation-demo').input(UserSchema).validateAllRules(todoRules) // 🔴 Error: Schema mismatch
// Quick fix suggestions:
// 💡 Replace with userRules
// 💡 Add transform: User → Todo
// 💡 Create compatible rules for UserSchema
```

#### **Result Type Flow Validation**

```typescript
const result = pipeline('flow-check')
  .input(UserSchema)
  .pipeline(UserAPI.create.run)
  .map(user => user.name.toUpperCase()) // 🔴 Error: user might be Result<Error, User>

// Quick fix:
// 💡 Add .unwrap() before .map()
// 💡 Use .mapResult() instead of .map()
// 💡 Handle Result with .match()
```

#### **Resource Usage Validation**

```typescript
pipeline('resource-check').pipeline(UserAPI.get) // 🔴 Error: Missing .run()
// Quick fix: Add .run() method call
```

### **3. Intelligent Type Hints**

#### **Type Flow Visualization**

```typescript
pipeline('type-flow')
  .input(UserSchema) // 💡 Type: unknown → User
  .map(user => user.profile) // 💡 Type: User → Profile
  .pipeline(ProfileAPI.update.run) // 💡 Type: Profile → Result<HttpError, Profile>
// Hover shows complete type flow diagram
```

#### **Performance Hints**

```typescript
pipeline('performance')
  .pipeline(SlowAPI.call.run) // 💡 This operation averages 2.3s
  .pipeline(AnotherAPI.call.run) // 💡 Consider caching or parallel execution
// Suggestions:
// - Add .cache({ ttl: 300000 })
// - Use Promise.all() for parallel calls
```

### **4. Pattern Suggestions**

#### **Common Pattern Detection**

```typescript
// Detect common anti-patterns and suggest improvements
const user = await UserAPI.get.run({ id: '123' })
if (user.isOk()) {
  // 🟡 Pattern suggestion
  console.log(user.value.name)
}
// 💡 Suggestion: Use .match() for better error handling
// 💡 Quick fix: Convert to .match() pattern
```

#### **Integration Pattern Suggestions**

```typescript
pipeline('suggest-patterns')
  .input(UserSchema)
  .map(async user => {
    const profile = await ProfileAPI.get.run({ userId: user.id })
    return { user, profile }
  })
// 💡 Pattern suggestion: Consider using parallel execution
// 💡 Pattern suggestion: Add error handling for ProfileAPI call
```

---

## 🏗️ Technical Implementation

### **1. Language Server Plugin Architecture**

```typescript
// File: packages/kairo-typescript-plugin/src/index.ts
import * as ts from 'typescript/lib/tsserverlibrary'

export function init(modules: { typescript: typeof ts }) {
  function create(info: ts.server.PluginCreateInfo) {
    const proxy = Object.create(null) as ts.LanguageService
    const oldLS = info.languageService

    // Intercept completion requests
    proxy.getCompletionsAtPosition = (fileName, position, options) => {
      const baseCompletions = oldLS.getCompletionsAtPosition(fileName, position, options)
      const kairoCompletions = getKairoCompletions(fileName, position, info)

      return mergeCompletions(baseCompletions, kairoCompletions)
    }

    // Intercept diagnostics
    proxy.getSemanticDiagnostics = fileName => {
      const baseDiagnostics = oldLS.getSemanticDiagnostics(fileName)
      const kairoDiagnostics = getKairoDiagnostics(fileName, info)

      return [...baseDiagnostics, ...kairoDiagnostics]
    }

    return proxy
  }

  return { create }
}
```

### **2. Context Analysis Engine**

```typescript
// File: src/context-analyzer.ts
export class KairoContextAnalyzer {
  analyzeContext(sourceFile: ts.SourceFile, position: number): KairoContext {
    const node = this.findNodeAtPosition(sourceFile, position)
    const pipelineContext = this.analyzePipelineContext(node)
    const schemaContext = this.analyzeSchemaContext(node)
    const resourceContext = this.analyzeResourceContext(node)

    return {
      type: this.determineContextType(node),
      pipeline: pipelineContext,
      schema: schemaContext,
      resource: resourceContext,
      availableOperations: this.getAvailableOperations(pipelineContext),
      typeFlow: this.analyzeTypeFlow(pipelineContext),
    }
  }

  private analyzePipelineContext(node: ts.Node): PipelineContext | null {
    // Walk up AST to find pipeline call
    let current = node.parent
    while (current) {
      if (this.isPipelineCall(current)) {
        return {
          steps: this.extractPipelineSteps(current),
          currentInputType: this.inferCurrentType(current),
          errors: this.validatePipelineFlow(current),
        }
      }
      current = current.parent
    }
    return null
  }

  private getAvailableOperations(context: PipelineContext): Operation[] {
    if (!context) return []

    const operations: Operation[] = []

    // Add standard pipeline methods
    operations.push(
      { name: 'map', type: 'transform', compatible: true },
      { name: 'pipeline', type: 'call', compatible: true },
      { name: 'tap', type: 'sideEffect', compatible: true }
    )

    // Add conditional operations based on context
    if (context.currentInputType && this.hasSchema(context.currentInputType)) {
      operations.push({ name: 'validateAllRules', type: 'validation', compatible: true })
    }

    // Mark incompatible operations
    if (context.hasInput) {
      operations.push({
        name: 'input',
        type: 'input',
        compatible: false,
        reason: 'Already has input',
      })
    }

    return operations
  }
}
```

### **3. Completion Provider**

```typescript
// File: src/completion-provider.ts
export class KairoCompletionProvider {
  getCompletions(context: KairoContext, position: number): ts.CompletionEntry[] {
    const completions: ts.CompletionEntry[] = []

    switch (context.type) {
      case 'pipeline-method':
        completions.push(...this.getPipelineMethodCompletions(context))
        break
      case 'resource-method':
        completions.push(...this.getResourceMethodCompletions(context))
        break
      case 'schema-property':
        completions.push(...this.getSchemaPropertyCompletions(context))
        break
    }

    // Add pattern suggestions
    completions.push(...this.getPatternSuggestions(context))

    return completions
  }

  private getPipelineMethodCompletions(context: KairoContext): ts.CompletionEntry[] {
    return context.availableOperations
      .filter(op => op.compatible)
      .map(op => ({
        name: op.name,
        kind: ts.ScriptElementKind.method,
        kindModifiers: op.compatible ? '' : 'deprecated',
        sortText: op.compatible ? '1' : '9', // Compatible operations first
        insertText: this.generateInsertText(op),
        documentation: this.getOperationDocumentation(op),
      }))
  }

  private generateInsertText(operation: Operation): string {
    switch (operation.name) {
      case 'map':
        return 'map($1 => $2)'
      case 'pipeline':
        return 'pipeline($1.run)'
      case 'validateAllRules':
        return 'validateAllRules($1)'
      default:
        return `${operation.name}($1)`
    }
  }
}
```

### **4. Diagnostic Provider**

```typescript
// File: src/diagnostic-provider.ts
export class KairoDiagnosticProvider {
  getDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = []

    // Check for common Kairo patterns
    this.checkPipelinePatterns(sourceFile, diagnostics)
    this.checkResourceUsage(sourceFile, diagnostics)
    this.checkResultHandling(sourceFile, diagnostics)
    this.checkSchemaUsage(sourceFile, diagnostics)

    return diagnostics
  }

  private checkPipelinePatterns(sourceFile: ts.SourceFile, diagnostics: ts.Diagnostic[]) {
    ts.forEachChild(sourceFile, node => {
      if (this.isPipelineCall(node)) {
        // Check for schema mismatches
        const schemaMismatch = this.checkSchemaMismatch(node)
        if (schemaMismatch) {
          diagnostics.push({
            file: sourceFile,
            start: node.getStart(),
            length: node.getWidth(),
            messageText: `Schema mismatch: Expected ${schemaMismatch.expected}, got ${schemaMismatch.actual}`,
            category: ts.DiagnosticCategory.Error,
            code: 2001,
            source: 'kairo',
          })
        }

        // Check for missing .run() calls
        const missingRun = this.checkMissingRunCall(node)
        if (missingRun) {
          diagnostics.push({
            file: sourceFile,
            start: missingRun.start,
            length: missingRun.length,
            messageText: 'Resource method calls require .run()',
            category: ts.DiagnosticCategory.Error,
            code: 2002,
            source: 'kairo',
          })
        }
      }
    })
  }
}
```

### **5. Quick Fix Provider**

```typescript
// File: src/quick-fix-provider.ts
export class KairoQuickFixProvider {
  getCodeFixesAtPosition(
    fileName: string,
    start: number,
    end: number,
    errorCodes: readonly number[]
  ): ts.CodeFixAction[] {
    const fixes: ts.CodeFixAction[] = []

    for (const errorCode of errorCodes) {
      switch (errorCode) {
        case 2001: // Schema mismatch
          fixes.push(...this.getSchemaMismatchFixes(fileName, start, end))
          break
        case 2002: // Missing .run()
          fixes.push(...this.getMissingRunFixes(fileName, start, end))
          break
      }
    }

    return fixes
  }

  private getSchemaMismatchFixes(fileName: string, start: number, end: number): ts.CodeFixAction[] {
    return [
      {
        description: 'Add transform step to convert schemas',
        changes: [
          {
            fileName,
            textChanges: [
              {
                span: { start, length: end - start },
                newText: '.map(data => transformToExpectedSchema(data))\n  ',
              },
            ],
          },
        ],
      },
      {
        description: 'Replace with compatible schema',
        changes: [
          {
            fileName,
            textChanges: [
              {
                span: { start, length: end - start },
                newText: 'compatibleSchema',
              },
            ],
          },
        ],
      },
    ]
  }
}
```

---

## 📦 Package Structure

```
packages/kairo-typescript-plugin/
├── src/
│   ├── index.ts                    # Plugin entry point
│   ├── context-analyzer.ts         # Context analysis engine
│   ├── completion-provider.ts      # Auto-completion logic
│   ├── diagnostic-provider.ts      # Error detection
│   ├── quick-fix-provider.ts       # Code fixes
│   ├── pattern-detector.ts         # Pattern recognition
│   ├── type-flow-analyzer.ts       # Type flow analysis
│   └── utils/
│       ├── ast-utils.ts            # AST manipulation
│       ├── kairo-types.ts          # Kairo type definitions
│       └── performance-monitor.ts   # Performance tracking
├── test/
│   ├── completion.test.ts
│   ├── diagnostics.test.ts
│   └── quick-fixes.test.ts
├── package.json
└── tsconfig.json
```

---

## 🎯 VS Code Extension

### **Extension Features**

#### **1. Kairo Commands**

```typescript
// Commands palette integration
vscode.commands.registerCommand('kairo.generatePipeline', () => {
  // Launch pipeline generator wizard
})

vscode.commands.registerCommand('kairo.explainPattern', () => {
  // Show pattern explanation for current code
})

vscode.commands.registerCommand('kairo.optimizePerformance', () => {
  // Suggest performance optimizations
})
```

#### **2. Code Snippets**

```json
{
  "Kairo Pipeline": {
    "prefix": "pipeline",
    "body": [
      "const ${1:pipelineName} = pipeline('${2:name}')",
      "  .input(${3:InputSchema})",
      "  .${4:map}(${5:data => data})",
      "  $0"
    ],
    "description": "Create a new Kairo pipeline"
  },

  "Kairo Resource": {
    "prefix": "resource",
    "body": [
      "const ${1:ResourceAPI} = resource('${2:name}', {",
      "  ${3:get}: {",
      "    path: '/${2:name}/:id',",
      "    params: schema.object({ id: schema.string() }),",
      "    response: ${4:ResponseSchema}",
      "  }",
      "})"
    ],
    "description": "Create a new Kairo resource"
  }
}
```

#### **3. Hover Information**

```typescript
// Enhanced hover information for Kairo constructs
vscode.languages.registerHoverProvider('typescript', {
  provideHover(document, position) {
    const kairoInfo = analyzeKairoConstruct(document, position)

    if (kairoInfo) {
      return new vscode.Hover([
        `**Kairo ${kairoInfo.type}**`,
        `Type: ${kairoInfo.typeSignature}`,
        `Performance: ${kairoInfo.performance}`,
        kairoInfo.documentation,
      ])
    }
  },
})
```

---

## 🧪 Testing Strategy

### **Unit Tests**

- Context analysis accuracy
- Completion suggestion relevance
- Diagnostic detection precision
- Quick fix effectiveness

### **Integration Tests**

- VS Code extension functionality
- TypeScript language server integration
- Performance under load
- Real-world usage scenarios

### **User Acceptance Tests**

- Developer productivity improvement
- Error reduction measurement
- Feature discovery success
- Performance satisfaction

---

## 📊 Success Metrics

### **Plugin Performance**

- Response time: < 100ms for completions
- Memory usage: < 50MB additional
- CPU impact: < 5% during typing
- Accuracy: > 95% relevant suggestions

### **Developer Experience**

- Error reduction: 80% fewer integration mistakes
- Time to completion: 50% faster implementation
- Discovery rate: 90% find new patterns through plugin
- Satisfaction: 8+/10 developer rating

### **Adoption Metrics**

- Installation rate: 70% of Kairo users
- Daily active usage: 60% of installations
- Feature utilization: All major features used
- Community feedback: Positive reception

---

## ✅ Acceptance Criteria

### **Core Functionality**

- [ ] Context-aware auto-completion working
- [ ] Real-time validation with quick fixes
- [ ] Type flow analysis and hints
- [ ] Pattern suggestions and detection

### **VS Code Integration**

- [ ] Extension publishes successfully
- [ ] All features work in VS Code
- [ ] Performance meets requirements
- [ ] Documentation is comprehensive

### **Quality Standards**

- [ ] Test coverage > 90%
- [ ] Performance benchmarks met
- [ ] User acceptance tests pass
- [ ] Community feedback positive

---

**Next Document**: [CLI Tools Specification](./CLI_TOOLS_SPEC.md)
