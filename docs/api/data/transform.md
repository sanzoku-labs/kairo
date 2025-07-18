# DATA Transformation

Data transformation and conversion methods in the DATA pillar.

## transform

```typescript
const transformed = data.transform(rawData, {
  mapping: {
    user_name: 'name',
    user_email: 'email'
  },
  compute: {
    displayName: item => item.name.toUpperCase(),
    isActive: item => item.status === 'active'
  }
})
```

## convert

```typescript
const converted = data.convert(stringData, {
  age: 'number',
  active: 'boolean'
})
```

## clone

```typescript
const cloned = data.clone(originalData)
```

## merge

```typescript
const merged = data.merge(target, source)
```

## Next Steps

- [DATA Pillar Overview](/api/data/)
- [DATA Aggregation](/api/data/aggregate)
- [Result Pattern](/api/result)