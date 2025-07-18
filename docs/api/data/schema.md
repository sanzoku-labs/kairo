# DATA Schema & Validation

Detailed documentation for schema creation and data validation in the DATA pillar.

## schema

```typescript
const UserSchema = data.schema({
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', min: 2, max: 100 },
  email: { type: 'string', format: 'email' },
  age: { type: 'number', min: 0, max: 150 },
  active: { type: 'boolean' }
})
```

## validate

```typescript
const result = data.validate(userData, UserSchema)

if (Result.isOk(result)) {
  console.log('Valid user:', result.value)
} else {
  console.error('Validation failed:', result.error)
}
```

## Next Steps

- [DATA Pillar Overview](/api/data/)
- [Schema System](/api/schema)
- [Result Pattern](/api/result)