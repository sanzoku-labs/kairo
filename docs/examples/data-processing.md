# Data Processing Examples

Examples of data processing with the DATA pillar.

## Basic Data Processing

```typescript
import { data, pipeline, Result } from '@sanzoku-labs/kairo'

// Transform raw data
const processUserData = (rawData: any[]) => {
  return pipeline.compose([
    // Validate each item
    data => pipeline.map(data, item => data.validate(item, UserSchema)),
    
    // Filter valid items
    data => pipeline.filter(data, Result.isOk),
    
    // Extract values
    data => pipeline.map(data, result => result.value),
    
    // Transform for display
    data => pipeline.map(data, user => ({
      ...user,
      displayName: user.name.toUpperCase(),
      isActive: user.status === 'active'
    }))
  ])(rawData)
}
```

## Data Aggregation

```typescript
const generateAnalytics = (users: User[]) => {
  return data.aggregate(users, {
    groupBy: ['department', 'level'],
    sum: ['salary'],
    avg: ['age', 'experience'],
    count: ['total']
  })
}
```

## Data Transformation

```typescript
const normalizeApiData = (apiResponse: any) => {
  return data.transform(apiResponse, {
    mapping: {
      user_id: 'id',
      user_name: 'name',
      user_email: 'email'
    },
    compute: {
      fullName: item => `${item.firstName} ${item.lastName}`,
      isAdult: item => item.age >= 18
    }
  })
}
```

## Next Steps

- [DATA Pillar](/api/data/)
- [Pipeline Examples](/examples/workflows)
- [Common Patterns](/examples/common-patterns)