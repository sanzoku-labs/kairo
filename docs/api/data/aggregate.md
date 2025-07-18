# DATA Aggregation

Data aggregation and grouping methods in the DATA pillar.

## aggregate

```typescript
const analytics = data.aggregate(users, {
  groupBy: ['department', 'level'],
  sum: ['salary'],
  avg: ['age', 'experience'],
  min: ['startDate'],
  max: ['endDate'],
  count: ['total']
})
```

## groupby

```typescript
const grouped = data.groupBy(users, 'department')
// Or multiple keys
const grouped = data.groupBy(users, ['department', 'level'])
```

## Advanced Aggregation

```typescript
const analytics = data.aggregate(sales, {
  groupBy: ['region', 'quarter'],
  sum: ['revenue', 'units'],
  avg: ['orderValue'],
  custom: {
    growthRate: (group) => calculateGrowth(group)
  }
})
```

## Next Steps

- [DATA Pillar Overview](/api/data/)
- [DATA Transformation](/api/data/transform)
- [Result Pattern](/api/result)