import axios, { AxiosInstance, AxiosError } from 'axios';
import { prisma } from '../../config/prisma';

/**
 * Normalization Interface
 * Represents the standard MomPlan program schema
 */
export interface NormalizedProgram {
  external_id: string;
  name: string;
  agency: string;
  description: string;
  url: string;
  category: string;
  status: 'active' | 'inactive';
}

/**
 * Provider Interface
 * All specific agency integrations (USDA, HUD, IRS, etc.) implement this.
 */
export interface GovApiProvider {
  name: string;
  baseUrl: string;
  fetchUpdates(): Promise<any[]>;
  normalize(rawData: any): NormalizedProgram | null;
}

/**
 * Scalable Government API Integration Layer
 * Handles caching, retries, and normalization of state/federal data
 */
export class GovApiIntegrationService {
  private client: AxiosInstance;
  private providers: Map<string, GovApiProvider> = new Map();
  // Simple in-memory cache for API responses to prevent rate-limiting (can be replaced by Redis)
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor() {
    this.client = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'MomPlan-Integration-Agent/1.0',
        'Accept': 'application/json',
      },
    });

    // Setup retry interceptor for resilient external connections
    this.setupRetryInterceptor();
  }

  private setupRetryInterceptor() {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any;
        if (!config || !config.retry) {
          return Promise.reject(error);
        }

        config.retryCount = config.retryCount || 0;

        if (config.retryCount >= config.retry) {
          return Promise.reject(error);
        }

        config.retryCount += 1;
        const delay = config.retryDelay || 1000 * config.retryCount;
        
        console.warn(`[GovApi] Retrying request to ${config.url} (Attempt ${config.retryCount}) in ${delay}ms...`);
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.client(config);
      }
    );
  }

  /**
   * Registers a new government agency data provider
   */
  registerProvider(provider: GovApiProvider) {
    this.providers.set(provider.name, provider);
    console.log(`[GovApi] Registered provider: ${provider.name}`);
  }

  /**
   * Generic fetch method with caching support
   */
  async fetchWithCache(url: string, ttlMs = 3600000) {
    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const response = await this.client.get(url, {
      // Custom config property for retries
      ...({ retry: 3, retryDelay: 2000 } as any),
    });

    this.cache.set(url, {
      data: response.data,
      expiresAt: Date.now() + ttlMs,
    });

    return response.data;
  }

  /**
   * Main synchronization job handler.
   * To be called via a cron job (e.g. node-cron or Agenda).
   */
  async syncAllPrograms() {
    console.log('[GovApi] Starting synchronization of all government programs...');
    
    const results = [];
    
    for (const [name, provider] of this.providers) {
      try {
        console.log(`[GovApi] Fetching from ${name}...`);
        const rawData = await provider.fetchUpdates();
        
        let successCount = 0;
        for (const rawItem of rawData) {
          const normalized = provider.normalize(rawItem);
          
          if (normalized) {
            // Future automation hook: Check for program changes before upserting
            // Example: if status changed from inactive to active, trigger an alert queue
            
            await prisma.program.upsert({
              where: { name: normalized.name }, // ideally a unique external_id mapping
              update: {
                description: normalized.description,
                category: normalized.category,
                // Do not override manual overrides if they exist in the future
              },
              create: {
                name: normalized.name,
                description: normalized.description,
                category: normalized.category,
                // Provide dummy state/zip arrays for structural compatibility
                state_eligibility: [],
                zip_eligibility: [],
                income_limit: 0,
              },
            });
            successCount++;
          }
        }
        
        results.push({ provider: name, status: 'success', synced: successCount });
      } catch (error: any) {
        console.error(`[GovApi] Failed to sync ${name}: ${error.message}`);
        results.push({ provider: name, status: 'error', error: error.message });
      }
    }
    
    console.log('[GovApi] Sync completed.', results);
    return results;
  }
}

// Export singleton instance
export const govApiIntegrationService = new GovApiIntegrationService();
