// Normalized container format (lowercase fields for application use)
export interface NormalizedContainer {
  id: string;
  names: string[];
  image: string;
  imageID?: string;
  state: string;
  status: string;
  created: number;
  ports?: string[];
  labels?: Record<string, string>;
  // Additional fields for unified container view
  host: string;
}

// Normalized image format (lowercase fields for application use)
export interface NormalizedImage {
  id: string;
  repoTags: string[];
  repoDigests?: string[];
  created: number;
  size: number;
  virtualSize: number;
  labels?: Record<string, string>;
  // Additional fields for unified image view
  host: string;
}

export interface InspectedVolume {
  CreatedAt: string;
  Driver: string;
  Labels?: Record<string, string>;
  Mountpoint: string;
  Name: string;
  Options?: Record<string, string>;
  Scope: string;
}

// Normalized volume format (lowercase fields for application use)
export interface NormalizedVolume {
  name: string;
  driver: string;
  mountpoint: string;
  createdAt?: string;
  labels?: Record<string, string>;
  options?: Record<string, string>;
  scope: string;
  // Additional fields for unified volume view
  host: string;
}

export interface InspectedNetwork {
  Id: string;
  Name: string;
  Driver: string;
  Scope: string;
  Created: string;
  Internal: boolean;
  EnableIPv4: boolean;
  EnableIPv6: boolean;
  Attachable: boolean;
  Ingress: boolean;
  Labels: Record<string, string>;
  Options: Record<string, string>;
}
// Normalized network format (lowercase fields for application use)
export interface NormalizedNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  createdAt?: string;
  internal?: boolean;
  attachable?: boolean;
  ingress?: boolean;
  labels?: Record<string, string>;
  options?: Record<string, string>;
  // Additional fields for unified network view
  host: string;
}

// Terminal grid cell for layout positioning
export interface TerminalGridCell {
  terminalId: string | null;
  position: {
    row: number;
    col: number;
  };
}
