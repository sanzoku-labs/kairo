#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

// Read the full TypeDoc output
const fullDoc = readFileSync('kairo-api-claude.md', 'utf8');

// Extract just the essential information
const lines = fullDoc.split('\n');
let output = [];
let currentSection = '';
let inCodeBlock = false;

// Add header
output.push('# Kairo API Reference for Claude Code\n');
output.push('> Concise API surface for @sanzoku-labs/kairo v1.0.1\n');

// Process the document
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track code blocks
  if (line.startsWith('```')) {
    inCodeBlock = !inCodeBlock;
  }
  
  // Keep function signatures and key interfaces
  if (line.match(/^### [a-zA-Z]/)) {
    currentSection = line.replace('### ', '');
    output.push(`\n## ${currentSection}`);
  }
  
  // Keep TypeScript function signatures
  if (line.startsWith('```ts') || line.startsWith('```typescript')) {
    output.push(line);
    // Get the next few lines that contain the function signature
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('```')) {
      if (lines[j].includes('function') || lines[j].includes(':') || lines[j].includes('=>')) {
        output.push(lines[j]);
      }
      j++;
    }
    output.push('```\n');
    i = j; // Skip to after the code block
  }
  
  // Keep brief descriptions (first paragraph after a function)
  if (line.trim() && !line.startsWith('#') && !line.startsWith('```') && 
      !line.startsWith('|') && !line.startsWith('-') && 
      !line.startsWith('*') && !line.startsWith(' ') &&
      !line.startsWith('[') && !line.startsWith('Type Parameters') &&
      !line.startsWith('Parameters') && !line.startsWith('Returns') &&
      !line.startsWith('Example') && !line.startsWith('Defined in') &&
      line.length < 200) {
    output.push(line);
  }
}

// Add quick reference sections
output.push('\n---\n');
output.push('## Quick Reference\n');
output.push('### SERVICE Pillar');
output.push('- `service.get(url, options)` - HTTP GET requests');
output.push('- `service.post(url, options)` - HTTP POST requests');
output.push('- `service.put(url, options)` - HTTP PUT requests');
output.push('- `service.patch(url, options)` - HTTP PATCH requests');
output.push('- `service.delete(url, options)` - HTTP DELETE requests\n');

output.push('### DATA Pillar');
output.push('- `data.schema(definition)` - Create validation schemas');
output.push('- `data.validate(data, schema)` - Validate against schema');
output.push('- `data.transform(data, options)` - Transform data structures');
output.push('- `data.aggregate(data, options)` - Aggregate data with grouping');
output.push('- `data.serialize(data, options)` - Serialize to various formats');
output.push('- `data.deserialize(data, options)` - Deserialize from formats\n');

output.push('### PIPELINE Pillar');
output.push('- `pipeline.map(items, fn, options)` - Transform items');
output.push('- `pipeline.filter(items, predicate, options)` - Filter items');
output.push('- `pipeline.reduce(items, fn, initial, options)` - Reduce items');
output.push('- `pipeline.compose(functions)` - Compose functions');
output.push('- `pipeline.chain(operations)` - Chain operations');
output.push('- `pipeline.branch(data, branches, options)` - Conditional execution\n');

output.push('### RESULT Pattern');
output.push('- `Result.Ok(value)` - Success result');
output.push('- `Result.Err(error)` - Error result');
output.push('- `Result.isOk(result)` - Check if success');
output.push('- `Result.isErr(result)` - Check if error');
output.push('- `Result.match(result, {Ok: fn, Err: fn})` - Pattern matching\n');

output.push('### Key Patterns');
output.push('- All methods return `Result<Error, Data>`');
output.push('- All methods use configuration objects (no method chaining)');
output.push('- Replace `fetch/axios` → `service` methods');
output.push('- Replace `try/catch` → `Result` pattern');
output.push('- Replace `zod/joi` → `data.schema/validate`');
output.push('- Replace `lodash` → `pipeline` utilities');

// Write the concise version
writeFileSync('kairo-api-claude-concise.md', output.join('\n'));

// eslint-disable-next-line no-undef
console.log(`✅ Created concise API reference: ${output.length} lines (vs ${lines.length} original)`);