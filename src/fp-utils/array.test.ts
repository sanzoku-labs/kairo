import { describe, it, expect } from 'vitest'
import { map, filter, flatMap, uniq, groupBy } from './array'

describe('array', () => {
  describe('map', () => {
    it('should transform each element using the provided function', () => {
      const double = (x: number) => x * 2
      const mapDouble = map(double)

      expect(mapDouble([1, 2, 3])).toEqual([2, 4, 6])
      expect(mapDouble([])).toEqual([])
    })

    it('should work with different types', () => {
      const toString = (x: number) => x.toString()
      const mapToString = map(toString)

      expect(mapToString([1, 2, 3])).toEqual(['1', '2', '3'])
    })

    it('should preserve array immutability', () => {
      const original = [1, 2, 3]
      const mapDouble = map((x: number) => x * 2)
      const result = mapDouble(original)

      expect(original).toEqual([1, 2, 3])
      expect(result).toEqual([2, 4, 6])
      expect(result).not.toBe(original)
    })
  })

  describe('filter', () => {
    it('should keep elements that satisfy the predicate', () => {
      const isEven = (x: number) => x % 2 === 0
      const filterEven = filter(isEven)

      expect(filterEven([1, 2, 3, 4, 5, 6])).toEqual([2, 4, 6])
      expect(filterEven([])).toEqual([])
    })

    it('should work with string predicates', () => {
      const isLong = (str: string) => str.length > 3
      const filterLong = filter(isLong)

      expect(filterLong(['hi', 'hello', 'hey', 'world'])).toEqual(['hello', 'world'])
    })

    it('should preserve array immutability', () => {
      const original = [1, 2, 3, 4]
      const filterEven = filter((x: number) => x % 2 === 0)
      const result = filterEven(original)

      expect(original).toEqual([1, 2, 3, 4])
      expect(result).toEqual([2, 4])
      expect(result).not.toBe(original)
    })
  })

  describe('flatMap', () => {
    it('should transform and flatten single values', () => {
      const double = (x: number) => x * 2
      const flatMapDouble = flatMap(double)

      expect(flatMapDouble([1, 2, 3])).toEqual([2, 4, 6])
    })

    it('should transform and flatten arrays', () => {
      const duplicate = (x: number) => [x, x]
      const flatMapDuplicate = flatMap(duplicate)

      expect(flatMapDuplicate([1, 2, 3])).toEqual([1, 1, 2, 2, 3, 3])
    })

    it('should handle mixed single values and arrays', () => {
      const expandIfEven = (x: number) => (x % 2 === 0 ? [x, x * 2] : x)
      const flatMapExpand = flatMap(expandIfEven)

      expect(flatMapExpand([1, 2, 3, 4])).toEqual([1, 2, 4, 3, 4, 8])
    })

    it('should work with empty arrays', () => {
      const duplicate = (x: number) => [x, x]
      const flatMapDuplicate = flatMap(duplicate)

      expect(flatMapDuplicate([])).toEqual([])
    })
  })

  describe('uniq', () => {
    it('should remove duplicate primitive values', () => {
      expect(uniq([1, 2, 3, 2, 1, 4])).toEqual([1, 2, 3, 4])
      expect(uniq(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('should preserve order of first occurrence', () => {
      expect(uniq([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
    })

    it('should handle empty arrays', () => {
      expect(uniq([])).toEqual([])
    })

    it('should handle arrays with no duplicates', () => {
      expect(uniq([1, 2, 3])).toEqual([1, 2, 3])
    })

    it('should work with objects using deep equality', () => {
      const obj1 = { id: 1, name: 'John' }
      const obj2 = { id: 2, name: 'Jane' }
      const obj3 = { id: 1, name: 'John' } // Same as obj1

      expect(uniq([obj1, obj2, obj3])).toEqual([obj1, obj2])
    })
  })

  describe('groupBy', () => {
    it('should group elements by the result of the key function', () => {
      const byLength = (str: string) => str.length.toString()
      const groupByLength = groupBy(byLength)

      const result = groupByLength(['a', 'bb', 'ccc', 'dd', 'e'])
      expect(result).toEqual({
        '1': ['a', 'e'],
        '2': ['bb', 'dd'],
        '3': ['ccc'],
      })
    })

    it('should work with objects', () => {
      const users = [
        { name: 'Alice', age: 25, department: 'engineering' },
        { name: 'Bob', age: 30, department: 'marketing' },
        { name: 'Charlie', age: 25, department: 'engineering' },
        { name: 'Diana', age: 28, department: 'marketing' },
      ]

      const byDepartment = (user: (typeof users)[0]) => user.department
      const groupByDepartment = groupBy(byDepartment)

      const result = groupByDepartment(users)
      expect(result).toEqual({
        engineering: [
          { name: 'Alice', age: 25, department: 'engineering' },
          { name: 'Charlie', age: 25, department: 'engineering' },
        ],
        marketing: [
          { name: 'Bob', age: 30, department: 'marketing' },
          { name: 'Diana', age: 28, department: 'marketing' },
        ],
      })
    })

    it('should handle empty arrays', () => {
      const byLength = (str: string) => str.length.toString()
      const groupByLength = groupBy(byLength)

      expect(groupByLength([])).toEqual({})
    })

    it('should handle single element arrays', () => {
      const byLength = (str: string) => str.length.toString()
      const groupByLength = groupBy(byLength)

      expect(groupByLength(['hello'])).toEqual({
        '5': ['hello'],
      })
    })
  })
})
