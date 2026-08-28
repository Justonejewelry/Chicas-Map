/** Core platform basemap providers. City configs must not fork these URLs. */

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

export const ESRI_ATTR =
  'Tiles \u00a9 <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>';

export const ESRI_SAT_ATTR =
  'Tiles \u00a9 <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> \u2014 Maxar, Earthstar Geographics';

export const ESRI_STREET = `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`;
export const ESRI_SAT = `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
export const ESRI_LABELS = `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`;

export const ESRI_STREET_OPTS = {
  attribution: ESRI_ATTR,
  maxZoom: 19,
  maxNativeZoom: 19,
} as const;

export const ESRI_SAT_OPTS = {
  attribution: ESRI_SAT_ATTR,
  maxZoom: 19,
  maxNativeZoom: 19,
} as const;

export const ESRI_LABEL_OPTS = {
  attribution: ESRI_ATTR,
  maxZoom: 19,
  maxNativeZoom: 19,
  opacity: 0.85,
} as const;
