/** Type declarations for the portable token store. */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WindowLike {
  addEventListener?(type: string, listener: (event: unknown) => void): void;
  removeEventListener?(type: string, listener: (event: unknown) => void): void;
}

export interface TokenStoreOptions {
  storageKey?: string;
  storage?: StorageLike;
  windowImpl?: WindowLike | null;
}

export interface TokenChange {
  external: boolean;
}

export interface TokenStore {
  storageKey: string;
  read(): string | null;
  write(value: string): void;
  clear(): void;
  subscribe(listener: (value: string | null, change: TokenChange) => void): () => void;
  dispose(): void;
}

export declare const DEFAULT_TOKEN_STORAGE_KEY: string;
export declare function createMemoryStorage(initial?: string | null): StorageLike;
export declare function createTokenStore(options?: TokenStoreOptions): TokenStore;
