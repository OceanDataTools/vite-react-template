export function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  delay: number,
): (...args: TArgs) => Promise<TReturn> {
  let timer: ReturnType<typeof setTimeout>
  return (...args: TArgs) =>
    new Promise((resolve, reject) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        fn(...args).then(resolve).catch(reject)
      }, delay)
    })
}
