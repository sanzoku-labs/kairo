# DATA Serialization

Data serialization and deserialization methods in the DATA pillar.

## serialize

```typescript
// Serialize to JSON
const jsonResult = data.serialize(userData, { format: 'json', pretty: true })

// Serialize to CSV
const csvResult = data.serialize(users, { format: 'csv', headers: true })

// Serialize to XML
const xmlResult = data.serialize(data, { format: 'xml', rootElement: 'users' })
```

## deserialize

```typescript
// Deserialize from JSON
const jsonData = data.deserialize(jsonString, { format: 'json' })

// Deserialize from CSV
const csvData = data.deserialize(csvString, { format: 'csv', headers: true })

// Deserialize from XML
const xmlData = data.deserialize(xmlString, { format: 'xml' })
```

## Supported Formats

- **JSON** - JavaScript Object Notation
- **CSV** - Comma-separated values
- **XML** - eXtensible Markup Language
- **YAML** - YAML Ain't Markup Language
- **MessagePack** - Efficient binary serialization

## Next Steps

- [DATA Pillar Overview](/api/data/)
- [DATA Transformation](/api/data/transform)
- [Result Pattern](/api/result)