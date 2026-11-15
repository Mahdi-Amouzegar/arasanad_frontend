/** Type declarations for the extensible login-provider registry. */

export type ProviderKind = 'bot' | 'widget' | 'code' | 'qr' | 'oauth';

export interface ProviderDescriptor {
  id: string;
  label: string;
  kind: ProviderKind;
  description?: string;
  authMethod?: string;
  trusted?: boolean;
  enabled?: boolean;
  priority?: number;
  icon?: string;
  /** Free-form extension point for provider-specific settings. */
  [key: string]: unknown;
}

export interface AuthProviderDescriptor extends ProviderDescriptor {
  enabled: boolean;
  priority: number;
  authMethod: string;
  trusted: boolean;
  icon: string;
  description: string;
}

export interface ProviderRegistry {
  register(provider: ProviderDescriptor): Readonly<AuthProviderDescriptor>;
  unregister(id: string): boolean;
  get(id: string): Readonly<AuthProviderDescriptor> | null;
  has(id: string): boolean;
  list(options?: { enabledOnly?: boolean }): Array<Readonly<AuthProviderDescriptor>>;
  reset(): void;
}

export declare const PROVIDER_KIND: Readonly<Record<string, ProviderKind>>;
export declare const BUILTIN_AUTH_PROVIDERS: readonly Readonly<AuthProviderDescriptor>[];
export declare const GOOGLE_PROVIDER_TEMPLATE: Readonly<AuthProviderDescriptor>;
export declare const authProviderRegistry: ProviderRegistry;

export declare function defineProvider(descriptor: ProviderDescriptor): Readonly<AuthProviderDescriptor>;
export declare function createProviderRegistry(initial?: readonly ProviderDescriptor[]): ProviderRegistry;
export declare function registerAuthProvider(provider: ProviderDescriptor): Readonly<AuthProviderDescriptor>;
export declare function listAuthProviders(options?: { enabledOnly?: boolean }): Array<Readonly<AuthProviderDescriptor>>;
export declare function getAuthProvider(id: string): Readonly<AuthProviderDescriptor> | null;
export declare function resetAuthProvidersForTests(): void;
