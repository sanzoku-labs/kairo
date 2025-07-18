# Parallel Processing

Parallel execution in the PIPELINE pillar.

## parallel

```typescript
const processed = pipeline.parallel([
  () => processA(),
  () => processB(),
  () => processC()
])
```

## Parallel Mapping

```typescript
const processed = pipeline.map(
  items,
  async item => await processItem(item),
  {
    parallel: true,
    concurrency: 5,
    batchSize: 100
  }
)
```

## Parallel Filtering

```typescript
const filtered = pipeline.filter(
  items,
  async item => await validateItem(item),
  {
    parallel: true,
    concurrency: 10
  }
)
```

## Next Steps

- [PIPELINE Pillar](/api/pipeline/)
- [Data Flow Operations](/api/pipeline/flow)
- [Examples](/examples/workflows)