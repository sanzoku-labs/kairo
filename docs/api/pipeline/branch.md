# Pipeline Branching

Branching logic in the PIPELINE pillar.

## branch

```typescript
const result = pipeline.branch(
  inputData,
  [
    {
      condition: data => data.type === 'premium',
      pipeline: premiumProcessor
    },
    {
      condition: data => data.type === 'standard',
      pipeline: standardProcessor
    }
  ],
  {
    fallback: defaultProcessor,
    parallel: false
  }
)
```

## Conditional Processing

```typescript
const conditionalProcess = (data: any) => {
  if (data.urgent) {
    return urgentProcessor(data)
  } else {
    return standardProcessor(data)
  }
}
```

## Next Steps

- [PIPELINE Pillar](/api/pipeline/)
- [Pipeline Composition](/api/pipeline/compose)
- [Examples](/examples/workflows)