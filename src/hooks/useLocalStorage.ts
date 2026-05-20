import { useState, useRef } from "react"

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValueState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const valueRef = useRef(value)
  valueRef.current = value

  const set = (v: T | ((prev: T) => T)) => {
    const newValue = typeof v === "function" ? (v as (prev: T) => T)(valueRef.current) : v
    setValueState(newValue)
    try {
      localStorage.setItem(key, JSON.stringify(newValue))
    } catch {
      // storage unavailable — ignore
    }
  }

  return [value, set]
}
