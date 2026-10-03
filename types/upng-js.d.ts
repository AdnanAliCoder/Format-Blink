declare module 'upng-js' {
  interface UPNG {
    encode(buffers: ArrayBuffer[], width: number, height: number, colors?: number): ArrayBuffer;
  }

  const UPNG: UPNG;
  export = UPNG;
}
