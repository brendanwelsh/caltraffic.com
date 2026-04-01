import { z } from 'zod';

// ─── Normalized output types (what the frontend uses) ───

export const CameraSchema = z.object({
  id: z.string(),
  district: z.number().min(1).max(12),
  route: z.string(),
  routeType: z.enum(['I', 'US', 'SR']),
  direction: z.string(),
  county: z.string(),
  city: z.string(),
  location: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  postmile: z.number(),
  elevation: z.number().nullable(),
  imageDescription: z.string().nullable(),
  imageUrl: z.string().url(),
  historicalImages: z.array(z.string().url()),
  streamUrl: z.string().url().nullable(),
  inService: z.boolean(),
  lastUpdated: z.string(),
  isStale: z.boolean(),
  hasVideo: z.boolean(),
});

export const CMSSchema = z.object({
  id: z.string(),
  district: z.number().min(1).max(12),
  route: z.string(),
  routeType: z.enum(['I', 'US', 'SR']),
  direction: z.string(),
  county: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  postmile: z.number(),
  location: z.string(),
  inService: z.boolean(),
  phase1Lines: z.array(z.string()),
  phase2Lines: z.array(z.string()).nullable(),
  lastUpdated: z.string(),
});

export const IncidentSchema = z.object({
  id: z.string(),
  type: z.string(),
  location: z.string(),
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  severity: z.string(),
  dispatchCenter: z.string(),
  logEntries: z.array(z.object({
    time: z.string(),
    text: z.string(),
  })),
  timestamp: z.string(),
});

export const WeatherAlertSchema = z.object({
  id: z.string(),
  event: z.string(),
  severity: z.enum(['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']),
  headline: z.string(),
  description: z.string(),
  affectedAreas: z.array(z.string()),
  onset: z.string(),
  expires: z.string(),
});

export const ChainControlSchema = z.object({
  id: z.string(),
  district: z.number().min(1).max(12),
  route: z.string(),
  routeType: z.enum(['I', 'US', 'SR']),
  location: z.string(),
  level: z.enum(['R1', 'R2', 'R3']),
  status: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  postmile: z.number(),
});

export const LaneClosureSchema = z.object({
  id: z.string(),
  district: z.number().min(1).max(12),
  route: z.string(),
  routeType: z.enum(['I', 'US', 'SR']),
  direction: z.string(),
  county: z.string(),
  location: z.string(),
  lanesAffected: z.string(),
  closureType: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  postmile: z.number(),
});

export const RWISSchema = z.object({
  id: z.string(),
  district: z.number(),
  route: z.string(),
  location: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  airTemp: z.number().nullable(),
  surfaceTemp: z.number().nullable(),
  humidity: z.number().nullable(),
  windSpeed: z.number().nullable(),
  windDirection: z.string().nullable(),
  visibility: z.number().nullable(),
  precipitationType: z.string().nullable(),
});

export const TravelTimeSchema = z.object({
  id: z.string(),
  district: z.number(),
  route: z.string(),
  corridor: z.string(),
  currentTime: z.number(),
  typicalTime: z.number(),
  delay: z.number(),
});

// ─── Raw CWWP2 API types (what Caltrans sends) ───

const Cwwp2LocationSchema = z.object({
  locationName: z.string().optional().default(''),
  nearbyPlace: z.string().optional().default(''),
  district: z.string(),
  county: z.string().optional().default(''),
  route: z.object({ '@_value': z.string() }).or(z.string()).optional(),
  direction: z.object({ '@_value': z.string() }).or(z.string()).optional(),
  latitude: z.string().optional().default('0'),
  longitude: z.string().optional().default('0'),
  postmile: z.object({ '@_value': z.string() }).or(z.string()).optional(),
});

export const RawCameraSchema = z.object({
  cctv: z.object({
    index: z.string(),
    location: Cwwp2LocationSchema,
    inService: z.string(),
    imageData: z.object({
      static: z.object({
        currentImageURL: z.string(),
        currentImageUpdateFrequency: z.string().optional(),
      }).passthrough(),
      streamingVideoURL: z.string().optional(),
    }).passthrough(),
  }).passthrough(),
});

export const RawCMSSchema = z.object({
  cms: z.object({
    index: z.string(),
    location: Cwwp2LocationSchema,
    inService: z.string(),
    recordTimestamp: z.object({
      recordEpoch: z.string().optional(),
    }).optional(),
    message: z.object({
      phase1: z.object({
        phase1Line1: z.string().optional().default(''),
        phase1Line2: z.string().optional().default(''),
        phase1Line3: z.string().optional().default(''),
        phase1Line4: z.string().optional().default(''),
      }).optional(),
      phase2: z.object({
        phase2Line1: z.string().optional().default(''),
        phase2Line2: z.string().optional().default(''),
        phase2Line3: z.string().optional().default(''),
        phase2Line4: z.string().optional().default(''),
      }).optional(),
    }).passthrough(),
  }).passthrough(),
});

// ─── Inferred TypeScript types ───

export type Camera = z.infer<typeof CameraSchema>;
export type CMS = z.infer<typeof CMSSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type WeatherAlert = z.infer<typeof WeatherAlertSchema>;
export type ChainControl = z.infer<typeof ChainControlSchema>;
export type LaneClosure = z.infer<typeof LaneClosureSchema>;
export type RWIS = z.infer<typeof RWISSchema>;
export type TravelTime = z.infer<typeof TravelTimeSchema>;
export type RawCamera = z.infer<typeof RawCameraSchema>;
export type RawCMS = z.infer<typeof RawCMSSchema>;
