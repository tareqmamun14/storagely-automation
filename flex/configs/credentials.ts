// Flex editor login — tareq@storagely.io
// Password can be set via FLEX_PASSWORD env var (from control panel)
// or hardcoded below for local use.

const HARDCODED_PASSWORD = '';  // ← paste your password here if you prefer

export const FLEX_EDITOR_CREDENTIALS = {
  email: 'tareq@storagely.io',
  password: process.env.FLEX_PASSWORD || HARDCODED_PASSWORD,
};
