# Pipeline Composition

Composition operations in the PIPELINE pillar.

## compose

```typescript
const processor = pipeline.compose([
  data => pipeline.validate(data, schema),
  data => pipeline.filter(data, item => item.active),
  data => pipeline.map(data, item => transform(item))
])
```

## chain

```typescript
const result = pipeline.chain(data, [
  data => processStep1(data),
  data => processStep2(data),
  data => processStep3(data)
])
```

## Next Steps

- [PIPELINE Pillar](/api/pipeline/)
- [Data Flow Operations](/api/pipeline/flow)
- [Examples](/examples/workflows)