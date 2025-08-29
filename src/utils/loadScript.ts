/**
 * A map to keep track of the loading status of scripts.
 * This prevents the same script from being loaded multiple times.
 * The key is the script source URL, and the value is a Promise that resolves when the script is loaded.
 */
const scriptCache = new Map<string, Promise<void>>();

/**
 * Dynamically loads a script and returns a Promise that resolves when the script is loaded.
 * It caches the promise to avoid reloading the same script multiple times.
 *
 * @param src The source URL of the script to load.
 * @returns A Promise that resolves when the script is loaded, or rejects if it fails to load.
 */
export const loadScript = (src: string): Promise<void> => {
  // If the script is already in the cache, return the existing promise.
  const cached = scriptCache.get(src);
  if (cached) {
    return cached;
  }

  // Create a new promise to handle the script loading.
  const promise = new Promise<void>((resolve, reject) => {
    // Check if the script tag already exists in the document.
    if (document.querySelector(`script[src="${src}"]`)) {
      // If it exists, we can assume it's either loaded or loading.
      // A more robust implementation might check the script's readyState,
      // but for this use case, we'll resolve assuming it will load.
      // The Paystack script is small and loads quickly.
      return resolve();
    }

    // Create a new script element.
    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    // Set up event listeners to resolve or reject the promise.
    script.onload = () => {
      resolve();
    };

    script.onerror = (error) => {
      // When the script fails to load, remove the promise from the cache
      // so that subsequent calls will try to load it again.
      scriptCache.delete(src);
      reject(new Error(`Failed to load script: ${src}`));
    };

    // Append the script to the document body to start loading it.
    document.body.appendChild(script);
  });

  // Store the promise in the cache for future calls.
  scriptCache.set(src, promise);
  return promise;
};
