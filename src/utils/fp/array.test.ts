import { describe, it, expect } from 'vitest'
import { map, filter, flatMap, uniq, groupBy } from './array'

describe('array', () => {
  describe('map', () => {
    it('should map over array elements', () => {
      const double = (x: number) => x * 2
      const doubled = map(double)([1, 2, 3, 4])
      expect(doubled).toEqual([2, 4, 6, 8])
    })

    it('should handle type transformations', () => {
      const toString = (x: number) => x.toString()
      const strings = map(toString)([1, 2, 3])
      expect(strings).toEqual(['1', '2', '3'])
    })

    it('should handle empty arrays', () => {
      const double = (x: number) => x * 2
      expect(map(double)([])).toEqual([])
    })
  })

  describe('filter', () => {
    it('should filter array elements', () => {
      const isEven = (x: number) => x % 2 === 0
      const evens = filter(isEven)([1, 2, 3, 4, 5, 6])
      expect(evens).toEqual([2, 4, 6])
    })

    it('should handle empty results', () => {
      const isNegative = (x: number) => x < 0
      expect(filter(isNegative)([1, 2, 3])).toEqual([])
    })

    it('should handle empty arrays', () => {
      const isEven = (x: number) => x % 2 === 0
      expect(filter(isEven)([])).toEqual([])
    })
  })

  describe('flatMap', () => {
    it('should flatten mapped results', () => {
      const duplicate = (x: number) => [x, x]
      const result = flatMap(duplicate)([1, 2, 3])
      expect(result).toEqual([1, 1, 2, 2, 3, 3])
    })

    it('should handle non-array returns as single-element arrays', () => {
      const maybeDouble = (x: number) => x % 2 === 0 ? [x, x] : x
      const result = flatMap(maybeDouble)([1, 2, 3, 4])
      expect(result).toEqual([1, 2, 2, 3, 4, 4])
    })

    it('should handle empty arrays in mapping', () => {
      const toEmpty = (_: number) => []
      const result = flatMap(toEmpty)([1, 2, 3])
      expect(result).toEqual([])
    })

    it('should handle empty input', () => {
      const duplicate = (x: number) => [x, x]
      expect(flatMap(duplicate)([])).toEqual([])
    })
  })

  describe('uniq', () => {
    it('should remove duplicate primitives', () => {
      expect(uniq([1, 2, 3, 2, 1, 4])).toEqual([1, 2, 3, 4])
      expect(uniq(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
    })

    it('should preserve order of first occurrence', () => {
      expect(uniq([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
    })

    it('should handle objects with deep equality', () => {
      const arr = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 1, name: 'John' },
        { id: 3, name: 'Bob' }
      ]
      const unique = uniq(arr)
      expect(unique).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 3, name: 'Bob' }
      ])
    })

    it('should handle arrays with deep equality', () => {
      expect(uniq([[1, 2], [3, 4], [1, 2], [5, 6]])).toEqual([
        [1, 2], [3, 4], [5, 6]
      ])
    })

    it('should handle empty arrays', () => {
      expect(uniq([])).toEqual([])
    })

    it('should handle arrays with no duplicates', () => {
      expect(uniq([1, 2, 3, 4])).toEqual([1, 2, 3, 4])
    })
  })

  describe('groupBy', () => {
    it('should group by key function', () => {
      const byLength = (s: string) => s.length.toString()
      const grouped = groupBy(byLength)(['one', 'two', 'three', 'four', 'five'])
      expect(grouped).toEqual({
        '3': ['one', 'two'],
        '5': ['three'],
        '4': ['four', 'five']
      })
    })

    it('should group objects by property', () => {
      const users = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 25 },
        { name: 'David', age: 30 }
      ]
      const byAge = (user: typeof users[0]) => user.age.toString()
      const grouped = groupBy(byAge)(users)
      
      expect(grouped).toEqual({
        '25': [
          { name: 'Alice', age: 25 },
          { name: 'Charlie', age: 25 }
        ],
        '30': [
          { name: 'Bob', age: 30 },
          { name: 'David', age: 30 }
        ]
      })
    })

    it('should handle empty arrays', () => {
      const byLength = (s: string) => s.length.toString()
      expect(groupBy(byLength)([])).toEqual({})
    })

    it('should preserve order within groups', () => {
      const byFirstLetter = (s: string) => s[0] || ''
      const grouped = groupBy(byFirstLetter)(['apple', 'apricot', 'banana', 'avocado'])
      expect(grouped).toEqual({
        'a': ['apple', 'apricot', 'avocado'],
        'b': ['banana']
      })
    })
  })
})