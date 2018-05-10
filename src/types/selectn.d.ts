declare module 'selectn' {
  function selectn<V> (
    path: string | string[],
    object?: Object,
  ): Function | V | undefined
  export = selectn
}
