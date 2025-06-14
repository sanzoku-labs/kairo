# Kairo Framework - Brief de développement

## 🎯 Vision et objectif

Kairo est une librairie TypeScript fonctionnelle et composable qui élimine la "glue code" dans les applications frontend/fullstack modernes. Elle fournit des primitives puissantes pour structurer la logique applicative de manière cohérente, typée et testable.

**Philosophie :** Framework-agnostic, composable, avec un focus sur le plaisir de développer et la maintenabilité.

---

## 🔧 Primitives principales à implémenter

### 1. `Result<Err, Ok>` - Gestion d'erreurs typée

```typescript
// API souhaitée
Result.Ok(value)
Result.Err(error)

// Méthodes
.map(fn)
.flatMap(fn) 
.mapError(fn)
.match({ Ok: (value) => ..., Err: (error) => ... })
```

**Objectif :** Remplacer les `try/catch` par un système d'erreurs prévisible et composable.

### 2. `pipeline(name: string)` - Flux de logique composable

```typescript
// Exemple d'usage cible
const login = pipeline('login')
  .input(LoginSchema)
  .fetch('/api/login')
  .validate(UserSchema)
  .map(user => user.name)
  .trace()

await login.run({ email: 'test@test.com', password: '1234' })
```

**Méthodes essentielles :**
- `.input(schema)` : validation des entrées
- `.fetch(url)` : appel HTTP avec gestion d'erreur
- `.validate(schema)` : validation des sorties
- `.map(fn)` / `.mapError(fn)` : transformations
- `.trace(label?)` : logging pour debug
- `.run(input?) => Promise<Result>`

### 3. `schema` - Wrapper Zod simplifié

```typescript
// Réutilise Zod mais avec une API plus fluide
schema.object({ email: z.string().email() })
schema.string()
schema.array(UserSchema)
```

---

## 🏗️ Architecture technique

### Stack de développement
- **Runtime :** Bun
- **Build :** Tsup (ESM/CJS + .d.ts)
- **Tests :** Vitest
- **Validation :** Zod (dépendance)
- **TypeScript :** Mode strict
- **Aucune dépendance UI/framework**

### Structure de projet suggérée
```
lucid/
├── src/
│   ├── core/
│   │   ├── result.ts
│   │   ├── pipeline.ts
│   │   └── schema.ts
│   ├── utils/
│   └── index.ts
├── tests/
├── examples/
└── docs/
```

---

## 🎯 Problèmes à résoudre

1. **Glue code excessive** : Éliminer le besoin de connecter manuellement fetch + validation + state + error handling
2. **Gestion d'erreurs chaotique** : Remplacer les try/catch imprévisibles par un système typé
3. **Debugging difficile** : Fournir de la traçabilité avec `.trace()`
4. **Code non réutilisable** : Permettre aux pipelines de fonctionner côté client, serveur, tests
5. **Testabilité complexe** : Rendre chaque pipeline facilement testable avec `.run(mockInput)`

---

## 📋 Spécifications détaillées

### Result<Err, Ok>

```typescript
interface Result<E, T> {
  readonly tag: 'Ok' | 'Err'
  
  map<U>(fn: (value: T) => U): Result<E, U>
  flatMap<U>(fn: (value: T) => Result<E, U>): Result<E, U>
  mapError<F>(fn: (error: E) => F): Result<F, T>
  match<U>(handlers: { Ok: (value: T) => U, Err: (error: E) => U }): U
}

// Constructeurs statiques
Result.Ok<T>(value: T): Result<never, T>
Result.Err<E>(error: E): Result<E, never>
```

### Pipeline

```typescript
interface Pipeline<Input, Output> {
  input<I>(schema: Schema<I>): Pipeline<I, Output>
  fetch(url: string | ((input: Input) => string)): Pipeline<Input, any>
  validate<O>(schema: Schema<O>): Pipeline<Input, O>
  map<U>(fn: (value: Output) => U): Pipeline<Input, U>
  mapError<E>(fn: (error: any) => E): Pipeline<Input, Output>
  trace(label?: string): Pipeline<Input, Output>
  run(input?: Input): Promise<Result<any, Output>>
}

function pipeline<T = unknown>(name: string): Pipeline<T, T>
```

### Schema (wrapper Zod)

```typescript
interface Schema<T> {
  parse(input: unknown): Result<ValidationError, T>
  safeParse(input: unknown): { success: boolean, data?: T, error?: any }
}

const schema = {
  object: <T>(shape: ZodRawShape) => Schema<z.infer<z.ZodObject<T>>>,
  string: () => Schema<string>,
  number: () => Schema<number>,
  array: <T>(item: Schema<T>) => Schema<T[]>
}
```

---

## 💡 Extensions futures (v2+)

Une fois les primitives de base solides, prévoir :

- `resource()` : Déclaration d'APIs REST typées
- `form()` : Gestion de formulaires avec validation
- `task()` : État async (pending/success/error)
- `signal()` : Primitive d'état réactif
- `withCache(ttl)` : Cache déclaratif par pipeline

---

## ✅ Critères de succès

1. **API intuitive** : Un développeur doit comprendre l'usage en 5 minutes
2. **TypeScript first** : Inférence de types parfaite, pas de `any`
3. **Performance** : Lazy evaluation, tree-shaking, pas de runtime lourd
4. **Framework agnostic** : Fonctionne avec React, Vue, Node, Bun...
5. **Testabilité** : Chaque pipeline est facilement mockable et testable
6. **Debugging** : `.trace()` fournit des logs utiles et structurés

---

## 🚀 Prochaines étapes

1. Implémenter `Result<Err, Ok>` avec tests complets
2. Créer `pipeline()` avec `.input()`, `.map()`, `.run()`
3. Ajouter `.fetch()` avec gestion d'erreurs HTTP
4. Implémenter `.validate()` avec wrapper Zod
5. Ajouter `.trace()` avec logging configurable
6. Créer des exemples concrets (login, CRUD, etc.)
7. Documentation et guides de migration

---

## 🎨 Style de code et conventions

### Philosophie du code
- **Fonctionnel et immutable** : Pas de mutations, retourner de nouveaux objets
- **Lisible avant tout** : Code auto-documenté, noms explicites
- **TypeScript idiomatique** : Exploiter pleinement le système de types
- **Minimal et élégant** : Éviter la sur-ingénierie

### Conventions de nommage
```typescript
// Classes/Types : PascalCase
interface Pipeline<Input, Output>
class ValidationError

// Fonctions/variables : camelCase
function pipeline(name: string)
const userSchema = schema.object(...)

// Constants : SCREAMING_SNAKE_CASE pour les vraies constantes
const DEFAULT_TIMEOUT = 5000

// Types génériques : lettres simples, explicites si nécessaire
Result<Err, Ok>  // ou Result<E, T>
Pipeline<Input, Output>
```

### Structure des fonctions
```typescript
// Préférer les arrow functions pour les utilitaires
const isOk = <T>(result: Result<any, T>): result is OkResult<T> => 
  result.tag === 'Ok'

// Functions déclarées pour les APIs principales  
function pipeline<T>(name: string): Pipeline<T, T> {
  // implémentation
}

// Méthodes chainables avec return this pattern
map<U>(fn: (value: T) => U): Pipeline<Input, U> {
  return new Pipeline(/* ... */)
}
```

### Gestion d'erreurs
```typescript
// Jamais de throw dans l'API publique, toujours Result<Err, Ok>
// throw uniquement pour les erreurs de programmation (mauvais usage)

// OK
function parse(input: unknown): Result<ValidationError, User>

// PAS OK  
function parse(input: unknown): User // peut throw
```

### Documentation inline
```typescript
/**
 * Creates a composable pipeline for handling application logic
 * 
 * @param name - Human-readable name for debugging and tracing
 * @example
 * ```ts
 * const login = pipeline('login')
 *   .input(LoginSchema)
 *   .fetch('/api/login')
 *   .validate(UserSchema)
 * ```
 */
function pipeline<T>(name: string): Pipeline<T, T>
```

### Imports/Exports
```typescript
// index.ts - API publique claire
export { pipeline } from './core/pipeline'
export { Result } from './core/result' 
export { schema } from './core/schema'
export type { Pipeline } from './core/pipeline'

// Pas de export * - être explicite
// Pas de default exports - préférer named exports
```

### Configuration TypeScript
```json
// tsconfig.json strict settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true
  }
}
```

---

## 🧪 Standards de tests

### Structure des tests
```typescript
// Grouper par fonctionnalité, pas par méthode
describe('Result', () => {
  describe('when creating Ok result', () => {
    it('should preserve value through map operations', () => {
      // Arrange, Act, Assert pattern
    })
  })
  
  describe('when creating Err result', () => {
    it('should short-circuit map operations', () => {})
  })
})
```

### Couverture de tests requise
- **100% des branches** pour les primitives core (Result, Pipeline)
- **Edge cases obligatoires** : valeurs null/undefined, erreurs réseau, schemas invalides
- **Tests d'intégration** : pipeline complet de bout en bout
- **Tests de performance** : pas de régressions sur les gros datasets

---

## 🏗️ Architecture interne détaillée

### Structure des classes/types
```typescript
// Préférer les discriminated unions aux classes quand possible
type Result<E, T> = 
  | { tag: 'Ok'; value: T }
  | { tag: 'Err'; error: E }

// Classes uniquement si nécessaire (pour les méthodes)
class Pipeline<Input, Output> {
  private readonly steps: Step[]
  private readonly name: string
  
  // Toujours immutable - retourner de nouvelles instances
  map<U>(fn: (value: Output) => U): Pipeline<Input, U> {
    return new Pipeline([...this.steps, new MapStep(fn)], this.name)
  }
}
```

### Gestion des dépendances
```typescript
// Injection de dépendances pour testabilité
interface HttpClient {
  fetch(url: string): Promise<Response>
}

// Default implementation utilise fetch natif
const defaultHttpClient: HttpClient = {
  fetch: globalThis.fetch.bind(globalThis)
}

// Permettre override pour tests
function pipeline(name: string, deps?: { httpClient?: HttpClient })
```

### Pattern d'erreurs
```typescript
// Classes d'erreur spécifiques et sérialisables
abstract class KairoError extends Error {
  abstract readonly code: string
  abstract readonly context: Record<string, unknown>
}

class ValidationError extends KairoError {
  readonly code = 'VALIDATION_ERROR'
  constructor(
    public readonly field: string,
    public readonly expected: string,
    public readonly actual: unknown
  ) {
    super(`Validation failed for field '${field}': expected ${expected}`)
  }
  
  get context() {
    return { field: this.field, expected: this.expected, actual: this.actual }
  }
}
```

---

## 🚀 Performance et optimisations

### Lazy evaluation
```typescript
// Les pipelines ne s'exécutent que lors de .run()
// Pas de computation pendant la construction
const pipeline = pipeline('heavy')
  .map(expensiveOperation)  // <- ne s'exécute pas ici
  .validate(heavySchema)    // <- ne s'exécute pas ici

await pipeline.run(data)    // <- tout s'exécute ici
```

### Tree-shaking
```typescript
// Chaque méthode dans son propre fichier si nécessaire
// Éviter les barrel exports qui cassent le tree-shaking
export { map } from './pipeline/map'
export { validate } from './pipeline/validate'
```

### Bundle size
- **Target < 10kb gzipped** pour les primitives core
- **Aucune dépendance runtime** sauf Zod
- **Code splitting** : chaque extension (cache, signals) séparément importable

---

## 🔧 Configuration de build

### Tsup configuration
```typescript
// tsup.config.ts
export default {
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: true
}
```

### Package.json structure
```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs", 
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "sideEffects": false
}
```

---

## 🐛 Debugging et logging

### .trace() implementation
```typescript
interface TraceEntry {
  timestamp: number
  pipelineName: string
  stepName: string
  success: boolean
  duration?: number
  input?: unknown
  output?: unknown
  error?: KairoError
}

// Configurable via environnement
const isTraceEnabled = () => 
  globalThis.process?.env?.LUCID_TRACE === 'true' ||
  globalThis.localStorage?.getItem('lucid:trace') === 'true'
```

---

## ⚠️ Contraintes importantes

### Environnements supportés
- **Node.js 18+**
- **Browsers modernes** (ES2022)
- **Bun, Deno** compatible
- **React Native** (pas de dépendance Node-specific)

### Rétrocompatibilité
- **Semantic versioning strict**
- **Pas de breaking changes** dans les patch/minor
- **Deprecation warnings** avant suppression d'APIs

### Limitations assumées
- **Pas de validation runtime** des types génériques (impossible en TS)
- **Pas de support IE** ou très vieux navigateurs
- **Pas de polyfills** inclus (responsabilité du consommateur)

---

## 💭 Notes importantes

- **Priorité à la simplicité** : Chaque API doit être évidente
- **Composition over configuration** : Pas de magie, juste des fonctions composables  
- **Fail fast** : Erreurs claires et typées dès que possible
- **Zero dependency** (sauf Zod) : Garder le bundle léger
- **Interopérabilité** : Doit s'intégrer facilement dans du code existant
