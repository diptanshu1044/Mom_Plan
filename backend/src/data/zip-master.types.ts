export interface ZipMasterEntry {
  city: string;
  state: string;
  stateCode: string;
  counties: string[];
}

export type ZipMasterDataset = Record<string, ZipMasterEntry>;
