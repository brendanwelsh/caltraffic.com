/**
 * Pre-built Custom Views that ship with the app.
 * Uses matchTerms + district to resolve camera IDs at runtime,
 * so they keep working even if Caltrans reorganizes camera IDs.
 */

export interface DefaultViewCamera {
  matchTerms: string[];
  district: number;
}

export interface DefaultView {
  id: string;
  name: string;
  description: string;
  preset: string; // layout preset ID
  slots: { cameras: DefaultViewCamera[]; timer: number }[];
}

export const DEFAULT_VIEWS: DefaultView[] = [
  {
    id: 'sierra-storm',
    name: 'Sierra Storm Watch',
    description: 'Monitor conditions on the Sierra passes during storms',
    preset: '2x2',
    slots: [
      { cameras: [{ matchTerms: ['Donner Summit'], district: 3 }], timer: 0 },
      { cameras: [{ matchTerms: ['Echo Summit'], district: 3 }], timer: 0 },
      { cameras: [{ matchTerms: ['Old Ag Sta'], district: 3 }], timer: 0 },
      { cameras: [{ matchTerms: ['Kingvale'], district: 3 }], timer: 0 },
    ],
  },
  {
    id: 'bay-area-commute',
    name: 'Bay Area Commute',
    description: 'Key chokepoints for Bay Area commuters',
    preset: '2x2',
    slots: [
      { cameras: [{ matchTerms: ['Bay Bridge SAS Tower'], district: 4 }], timer: 0 },
      { cameras: [{ matchTerms: ['Ashby Avenue'], district: 4 }], timer: 0 },
      { cameras: [{ matchTerms: ['JCT-84'], district: 4 }], timer: 0 },
      { cameras: [{ matchTerms: ['Granite Creek'], district: 4 }], timer: 0 },
    ],
  },
  {
    id: 'socal-bottlenecks',
    name: 'SoCal Bottlenecks',
    description: 'The worst traffic spots in Southern California',
    preset: '2x2',
    slots: [
      { cameras: [{ matchTerms: ['Mulholland'], district: 7 }], timer: 0 },
      { cameras: [{ matchTerms: ['Alameda St'], district: 7 }], timer: 0 },
      { cameras: [{ matchTerms: ['Colorado'], district: 7 }], timer: 0 },
      { cameras: [{ matchTerms: ['Carmel Valley Road'], district: 11 }], timer: 0 },
    ],
  },
  {
    id: 'coastal-pch',
    name: 'Coastal PCH',
    description: 'Pacific Coast Highway cameras from Half Moon Bay to Laguna Beach',
    preset: '1+3',
    slots: [
      { cameras: [{ matchTerms: ['Mcclure'], district: 7 }], timer: 0 },
      { cameras: [{ matchTerms: ['Ruisseau'], district: 4 }], timer: 0 },
      { cameras: [{ matchTerms: ['Blue Bird'], district: 12 }], timer: 0 },
      { cameras: [{ matchTerms: ['Cassidy Street'], district: 11 }], timer: 0 },
    ],
  },
  {
    id: 'socal-landmarks',
    name: 'SoCal Landmarks',
    description: 'Iconic Southern California locations',
    preset: '2x2',
    slots: [
      { cameras: [{ matchTerms: ['Hollywood Blvd'], district: 7 }], timer: 0 },
      { cameras: [{ matchTerms: ['Disneyland'], district: 12 }], timer: 0 },
      { cameras: [{ matchTerms: ['Coronado'], district: 11 }], timer: 0 },
      { cameras: [{ matchTerms: ['Ocean Blvd'], district: 7 }], timer: 0 },
    ],
  },
];
