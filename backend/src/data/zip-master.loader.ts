import fs from 'fs';
import path from 'path';
import type { ZipMasterDataset, ZipMasterEntry } from './zip-master.types';
import { normalizeCityName } from '../utils/zip.utils';

const ZIP_MASTER_FILENAME = 'zip-master.json';

let dataset: ZipMasterDataset | null = null;
let cityIndex: Map<string, string[]> | null = null;
let loadError: string | null = null;

function resolveZipMasterPath(): string {
  const candidates = [
    path.resolve(process.cwd(), ZIP_MASTER_FILENAME),
    path.resolve(process.cwd(), 'backend', ZIP_MASTER_FILENAME),
    path.resolve(__dirname, '..', '..', ZIP_MASTER_FILENAME),
    path.resolve(__dirname, '..', '..', '..', ZIP_MASTER_FILENAME),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function buildCityIndex(data: ZipMasterDataset): Map<string, string[]> {
  const index = new Map<string, string[]>();

  for (const [zip, entry] of Object.entries(data)) {
    const key = `${entry.stateCode.toUpperCase()}|${normalizeCityName(entry.city)}`;
    const existing = index.get(key);
    if (existing) {
      if (!existing.includes(zip)) {
        existing.push(zip);
      }
    } else {
      index.set(key, [zip]);
    }
  }

  for (const zips of index.values()) {
    zips.sort();
  }

  return index;
}

export function getZipDatasetLoadError(): string | null {
  return loadError;
}

export function loadZipMasterDataset(): ZipMasterDataset {
  if (dataset) {
    return dataset;
  }

  const filePath = resolveZipMasterPath();

  try {
    if (!fs.existsSync(filePath)) {
      loadError = 'ZIP lookup data is unavailable. Please contact support.';
      throw new Error(loadError);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as ZipMasterDataset;

    if (!parsed || typeof parsed !== 'object') {
      loadError = 'ZIP lookup data is corrupted. Please contact support.';
      throw new Error(loadError);
    }

    dataset = parsed;
    cityIndex = buildCityIndex(parsed);
    loadError = null;
    return dataset;
  } catch (error) {
    if (!loadError) {
      loadError = 'ZIP lookup data could not be loaded. Please contact support.';
    }
    throw error;
  }
}

export function lookupZipEntry(zip5: string): ZipMasterEntry | null {
  try {
    const data = loadZipMasterDataset();
    return data[zip5] ?? null;
  } catch {
    return null;
  }
}

export function lookupZipsForCity(stateCode: string, city: string): string[] {
  try {
    const data = loadZipMasterDataset();
    if (!cityIndex) {
      cityIndex = buildCityIndex(data);
    }

    const key = `${stateCode.toUpperCase()}|${normalizeCityName(city)}`;
    return cityIndex.get(key) ?? [];
  } catch {
    return [];
  }
}
