# Cross-Pillar Integration

Examples of combining all three pillars for complete workflows.

## Full Stack Example

```typescript
import { service, data, pipeline, Result } from '@sanzoku-labs/kairo'

// Define schemas
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  active: { type: 'boolean' }
})

// Complete user processing workflow
const processUsers = async () => {
  // SERVICE: Fetch users from API
  const usersResult = await service.get('/api/users', {
    timeout: 5000,
    retry: { attempts: 3 },
    validate: data.schema({
      users: { type: 'array', items: UserSchema }
    })
  })
  
  if (Result.isErr(usersResult)) {
    return usersResult
  }
  
  // PIPELINE: Process users
  const processed = pipeline.compose([
    // Filter active users
    users => pipeline.filter(users, user => user.active),
    
    // DATA: Transform for display
    users => pipeline.map(users, user => data.transform(user, {
      mapping: { user_name: 'name' },
      compute: { displayName: u => u.name.toUpperCase() }
    })),
    
    // DATA: Aggregate analytics
    users => data.aggregate(users, {
      groupBy: ['department'],
      count: ['total'],
      avg: ['age']
    })
  ])
  
  return processed(usersResult.value.users)
}
```

## Real-time Data Pipeline

```typescript
const realTimeDataPipeline = async (dataStream: any[]) => {
  return pipeline.compose([
    // SERVICE: Validate against external API
    async data => {
      const validationResults = await Promise.all(
        data.map(item => service.post('/api/validate', {
          body: item,
          timeout: 1000
        }))
      )
      
      return validationResults.filter(Result.isOk).map(r => r.value)
    },
    
    // DATA: Process and transform
    data => pipeline.map(data, item => data.transform(item, {
      mapping: { raw_data: 'data' },
      compute: { processed_at: () => Date.now() }
    })),
    
    // PIPELINE: Aggregate by time windows
    data => data.aggregate(data, {
      groupBy: ['timestamp'],
      sum: ['value'],
      count: ['events']
    })
  ])(dataStream)
}
```

## Next Steps

- [API Client Examples](/examples/api-client)
- [Data Processing](/examples/data-processing)
- [Complex Workflows](/examples/workflows)