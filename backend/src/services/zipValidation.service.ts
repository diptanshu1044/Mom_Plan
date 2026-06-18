import { BadRequestError } from '../utils/errors';

import { env } from '../config/env';

const ZIPPOTAM_BASE_URL = 'https://api.zippopotam.us/us';

export function isZipValidationEnabled(): boolean {
  return env.NODE_ENV === 'production';
}

export type ZipValidationErrorCode =
  | 'INVALID_FORMAT'
  | 'NOT_FOUND'
  | 'STATE_MISMATCH'
  | 'NETWORK_ERROR';

export interface ZipValidationResult {
  valid: boolean;
  city?: string;
  state?: string;
  zip?: string;
  error?: string;
  errorCode?: ZipValidationErrorCode;
}

interface ZippopotamPlace {
  'place name': string;
  state: string;
  'state abbreviation': string;
}

interface ZippopotamResponse {
  'post code': string;
  country: string;
  places: ZippopotamPlace[];
}

export function extractZip5(zip: string): string | null {
  const match = zip.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : null;
}

export function isValidZipFormat(zip: string): boolean {
  return extractZip5(zip) !== null;
}

function normalizeState(state: string): string {
  return state.trim().toUpperCase();
}

export class ZipValidationService {
  async lookupZip(zip5: string): Promise<ZippopotamResponse> {
    const response = await fetch(`${ZIPPOTAM_BASE_URL}/${zip5}`, {
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      throw Object.assign(new Error('ZIP not found'), { code: 'NOT_FOUND' as const });
    }

    if (!response.ok) {
      throw Object.assign(new Error(`ZIP lookup failed (${response.status})`), {
        code: 'NETWORK_ERROR' as const,
      });
    }

    return (await response.json()) as ZippopotamResponse;
  }

  resolvePlaceForState(data: ZippopotamResponse, state: string): ZippopotamPlace | null {
    const normalizedState = normalizeState(state);
    return (
      data.places.find((place) => normalizeState(place['state abbreviation']) === normalizedState) ??
      null
    );
  }

  async validateZip(zip: string, state: string): Promise<ZipValidationResult> {
    if (!isZipValidationEnabled()) {
      const zip5 = extractZip5(zip);
      return {
        valid: true,
        zip: zip5 ?? undefined,
        state: state ? normalizeState(state) : undefined,
      };
    }

    const zip5 = extractZip5(zip);
    if (!zip5) {
      return {
        valid: false,
        error: 'Please enter a valid US ZIP code.',
        errorCode: 'INVALID_FORMAT',
      };
    }

    const normalizedState = normalizeState(state);
    if (!normalizedState || normalizedState.length !== 2) {
      return {
        valid: false,
        error: 'Please select a valid US state.',
        errorCode: 'INVALID_FORMAT',
      };
    }

    try {
      const data = await this.lookupZip(zip5);
      const place = this.resolvePlaceForState(data, normalizedState);

      if (!place) {
        return {
          valid: false,
          zip: zip5,
          error: 'This ZIP code does not belong to the selected state.',
          errorCode: 'STATE_MISMATCH',
        };
      }

      return {
        valid: true,
        city: place['place name'],
        state: place['state abbreviation'],
        zip: zip5,
      };
    } catch (error: any) {
      if (error?.code === 'NOT_FOUND') {
        return {
          valid: false,
          zip: zip5,
          error: 'ZIP code could not be verified.',
          errorCode: 'NOT_FOUND',
        };
      }

      return {
        valid: false,
        zip: zip5,
        error: 'Unable to verify ZIP code right now. Please try again.',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  async assertZipValid(zip: string, state: string): Promise<ZipValidationResult> {
    const result = await this.validateZip(zip, state);
    if (!result.valid) {
      throw new BadRequestError(result.error || 'Invalid ZIP code.');
    }
    return result;
  }
}

export const zipValidationService = new ZipValidationService();
