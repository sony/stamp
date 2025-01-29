export function exponentialBackoff<T, E = Error>(maxRetries: number, interval: number, fn: () => Promise<T>, shouldRetry: (error: E) => boolean) {
  let retries = 0;
  function retry() {
    return new Promise<T>((resolve, reject) => {
      fn()
        .then(resolve)
        .catch((error) => {
          if (retries < maxRetries && shouldRetry(error)) {
            setTimeout(() => {
              retries++;
              retry().then(resolve).catch(reject);
            }, interval * Math.pow(2, retries));
          } else {
            reject(error);
          }
        });
    });
  }
  return retry();
}
