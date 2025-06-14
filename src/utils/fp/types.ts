export type UnaryFunction<T, R> = (arg: T) => R
export type Predicate<T> = UnaryFunction<T, boolean>
export type Comparator<T> = (a: T, b: T) => boolean

export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>
} : T

export type Path = readonly (string | number)[]

export type PickKeys<T, K extends keyof T> = Pick<T, K>
export type OmitKeys<T, K extends keyof T> = Omit<T, K>