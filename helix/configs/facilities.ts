export interface HelixFacility {
  id: string;
  name: string;
  client: string;
  url: string;
  expectedTitle: RegExp;
  expectedHeading: RegExp;
  hasUnits: boolean;
  hasReviews: boolean;
  hasAmenities: boolean;
}

export const FACILITIES: HelixFacility[] = [
  {
    id: 'safeguard-bridgeview-harlem',
    name: 'Safeguard — Bridgeview, IL (Harlem Ave)',
    client: 'safeguard',
    url: 'https://safeguard.test.getstoragely.com/storage-units/illinois/bridgeview/harlem-avenue',
    expectedTitle: /self storage.*bridgeview|bridgeview.*storage/i,
    expectedHeading: /safeguard.*self storage/i,
    hasUnits: true,
    hasReviews: true,
    hasAmenities: true,
  },
];

export function getFacility(id: string): HelixFacility {
  const f = FACILITIES.find(fac => fac.id === id);
  if (!f) throw new Error(`Facility not found: ${id}. Available: ${FACILITIES.map(fac => fac.id).join(', ')}`);
  return f;
}

export function getAllFacilities(): HelixFacility[] {
  return FACILITIES;
}
