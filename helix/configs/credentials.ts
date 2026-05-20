// Helix editor login — tareq@storagely.io
// Password can be set via HELIX_PASSWORD env var (from control panel)
// or hardcoded below for local use.

const HARDCODED_PASSWORD = '';  // ← paste your password here if you prefer

export const HELIX_EDITOR_CREDENTIALS = {
  email: 'tareq@storagely.io',
  password: process.env.HELIX_PASSWORD || HARDCODED_PASSWORD,
};
