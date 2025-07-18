# Pipeline Data Flow

Data flow operations in the PIPELINE pillar.

## map

```typescript
const processed = pipeline.map(items, item => transform(item))
```

## filter

```typescript
const filtered = pipeline.filter(items, item => item.active)
```

## reduce

```typescript
const sum = pipeline.reduce(items, (acc, item) => acc + item.value, 0)
```

## validate

```typescript
const validated = pipeline.validate(data, schema)
```

## Next Steps

- [PIPELINE Pillar](/api/pipeline/)
- [Pipeline Composition](/api/pipeline/compose)
- [Examples](/examples/workflows)