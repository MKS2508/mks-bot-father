/**
 * Result Type for error handling.
 */

export type Result<T, E = Error> = Ok<T> | Err<E>

export interface Ok<T> {
  readonly _tag: 'Ok'
  readonly ok: T
}

export interface Err<E> {
  readonly _tag: 'Err'
  readonly error: E
}

export function ok<T>(value: T): Ok<T> {
  return { _tag: 'Ok', ok: value }
}

export function err<E>(error: E): Err<E> {
  return { _tag: 'Err', error }
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result._tag === 'Ok'
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result._tag === 'Err'
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) return result.ok
  throw result.error
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) return result.ok
  return defaultValue
}

export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
  if (isOk(result)) return result.ok
  return fn(result.error)
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (isOk(result)) {
    try {
      return ok(fn(result.ok))
    } catch (error) {
      return err(error as E)
    }
  }
  return result
}

export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error))
  }
  return result
}

export function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  if (isOk(result)) {
    return fn(result.ok)
  }
  return result
}

export function tap<T, E>(result: Result<T, E>, fn: (value: T) => void): Result<T, E> {
  if (isOk(result)) {
    fn(result.ok)
  }
  return result
}

export function tapErr<T, E>(result: Result<T, E>, fn: (error: E) => void): Result<T, E> {
  if (isErr(result)) {
    fn(result.error)
  }
  return result
}

export function match<T, E, U>(
  result: Result<T, E>,
  patterns: { ok: (value: T) => U; err: (error: E) => U }
): U {
  if (isOk(result)) {
    return patterns.ok(result.ok)
  }
  return patterns.err(result.error)
}

export async function collect<T, E>(results: Array<Result<T, E>>): Promise<Result<T[], E>> {
  const values: T[] = []
  for (const result of results) {
    if (isErr(result)) return result
    values.push(result.ok)
  }
  return ok(values)
}

export async function all<T, E>(
  results: Array<Result<T, E>>
): Promise<Result<T[], E>> {
  return collect(results)
}

export function fail<E>(error: E): Result<never, E> {
  return err(error)
}
