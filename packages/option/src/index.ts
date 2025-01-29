interface IOption<T> {
  isSome(): this is Some<T>;
  isNone(): this is None<T>;
  // Don't implement unwrap() becasuse it's unsafe.
  unwrapOr(defaultValue: T): T;
  map<U>(callback: (value: T) => U): Option<U>;
  match<U>(some: (value: T) => U, none: () => U): U;
}

/**
 * Represents an optional value that can either be Some<T> or None<T>.
 * @typeparam T The type of the value wrapped in the Option.
 */
export type Option<T> = Some<T> | None<T>;

export class Some<T> implements IOption<T> {
  readonly value: T;
  constructor(value: T) {
    this.value = value;
  }

  isSome(): this is Some<T> {
    return true;
  }

  isNone(): this is None<T> {
    return false;
  }

  unwrapOr(): T {
    return this.value;
  }

  map<U>(callback: (value: T) => U): Option<U> {
    return some(callback(this.value));
  }

  match<U>(some: (value: T) => U): U {
    return some(this.value);
  }
}

export class None<T> implements IOption<T> {
  isSome(): this is Some<T> {
    return false;
  }

  isNone(): this is None<T> {
    return true;
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  map<U>(): Option<U> {
    return none;
  }

  match<U>(some: (value: T) => U, none: () => U): U {
    return none();
  }
}

/**
 * Creates a new Some instance with the specified value.
 *
 * @template T The type of the value.
 * @param value The value to wrap in a Some instance.
 * @returns A new Some instance.
 */
export function some<T>(value: T): Some<T> {
  return new Some(value);
}

/**
 * Represents an option that has no value.
 */
export const none: Option<never> = new None();
