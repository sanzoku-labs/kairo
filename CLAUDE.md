# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kairo is a functional, composable TypeScript library implementing a three-pillar declarative application platform. It uses Bun as the runtime and focuses on eliminating boilerplate through declarative patterns while maintaining high performance and type safety.

## Development Commands

### Essential Commands
- **Build**: `bun run build` - Build using tsup
- **Development**: `bun run dev` - Watch mode building  
- **Test**: `bun run test` - Run tests with Vitest
- **Test (watch)**: `bun run test:watch` - Watch mode testing
- **Test (coverage)**: `bun run test:coverage` - Generate coverage reports
- **Type checking**: `bun run typecheck` - Validate TypeScript
- **Linting**: `bun run lint` - Run ESLint validation
- **Formatting**: `bun run format` - Format with Prettier

### Documentation Commands
- **Docs (dev)**: `bun run docs:dev` - Local documentation server
- **Docs (build)**: `bun run docs:build` - Build documentation site
- **API docs**: `bun run docs:api` - Generate TypeDoc API documentation

## Architecture

### Three-Pillar System
The codebase is organized around three core pillars:

1. **INTERFACE Pillar** (`src/core/resource.ts`) - Declarative external system integration
   - Type-safe API resources with zero boilerplate service classes
   - Built-in error handling and response transformation

2. **PROCESS Pillar** (`src/core/pipeline.ts`, `src/core/rules.ts`) - Declarative business logic composition
   - Functional data transformation pipelines
   - Centralized business rules validation
   - Complex workflow orchestration (via extensions)

3. **DATA Pillar** (`src/core/repository.ts`, `src/core/native-schema.ts`) - Declarative data modeling
   - Native schema system (3x faster than Zod, zero dependencies)
   - Type-safe data access with relationship handling
   - Declarative data transformations

### Core Design Patterns
- **Result Pattern** (`src/core/result.ts`) - Error handling without exceptions
- **Functional Programming** (`src/utils/fp/`) - Extensive FP utilities
- **Extension System** (`src/extensions/`) - Tree-shakable advanced features
- **Type-First Development** - Comprehensive TypeScript inference throughout

## Key Directories

- **`src/core/`** - Core three-pillar implementation
- **`src/extensions/`** - Tree-shakable advanced features (caching, events, performance, plugins, transactions, workflows)
- **`src/utils/fp/`** - Functional programming utilities
- **`src/testing/`** - Comprehensive testing utilities
- **`docs/`** - VitePress documentation with API references
- **`examples/`** - TypeScript usage examples

## Entry Points

- **Core API**: `src/index.ts` - Main three-pillar API
- **Extensions**: `src/extensions.ts` - All extensions
- **Individual Extensions**: `src/extensions/{feature}.ts` for granular imports

## Development Notes

### Schema System
- Use **native schemas** (`src/core/native-schema.ts`) for new code - 3x faster than Zod with zero dependencies
- Legacy Zod schemas (`src/core/schema.ts`) are deprecated but maintained for compatibility

### Error Handling
- Always use the **Result pattern** (`src/core/result.ts`) - no exceptions
- Import error utilities from `src/core/errors.ts`

### Extension Development
- Extensions in `src/extensions/` are tree-shakable
- Each extension should have its own entry point
- Follow the plugin architecture pattern (`src/extensions/plugins/`)

### Testing
- Use Vitest for all tests
- Comprehensive testing utilities available in `src/testing/`
- Run `bun run test:coverage` to ensure adequate coverage

### Performance
- Core library has zero runtime dependencies (only Zod for legacy compatibility)
- Native schema system provides significant performance improvements
- Extensions are designed to be tree-shakable for optimal bundle sizes