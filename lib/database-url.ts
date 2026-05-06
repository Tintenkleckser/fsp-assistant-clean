const databaseUrlOverrideKeys = [
  'SUPABASE_DATABASE_URL',
  'DATABASE_URL_OVERRIDE',
  'POSTGRES_PRISMA_URL'
];

function isPostgresUrl(value: string) {
  return value.startsWith('postgresql://') || value.startsWith('postgres://');
}

function normalizeDatabaseUrl(value: string | undefined) {
  let normalized = value?.trim() ?? '';

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  const envAssignment = normalized.match(/^[A-Z0-9_]+\s*=\s*(.+)$/);

  if (envAssignment) {
    normalized = envAssignment[1].trim();
  }

  return normalized;
}

function getConfiguredDatabaseUrl() {
  for (const key of databaseUrlOverrideKeys) {
    const value = normalizeDatabaseUrl(process.env[key]);

    if (value && isPostgresUrl(value)) {
      return { key, value };
    }
  }

  const value = normalizeDatabaseUrl(process.env.DATABASE_URL);
  return { key: 'DATABASE_URL', value };
}

export function configureDatabaseUrl() {
  const configured = getConfiguredDatabaseUrl();

  if (configured.value) {
    process.env.DATABASE_URL = configured.value;
  }

  return configured;
}

export function inspectDatabaseUrl() {
  const configured = configureDatabaseUrl();
  const raw = process.env[configured.key] ?? '';
  const trimmed = configured.value;
  let host: string | null = null;
  let username: string | null = null;

  try {
    const parsed = new URL(trimmed);
    host = parsed.host;
    username = parsed.username;
  } catch {
    host = null;
    username = null;
  }

  return {
    source: configured.key,
    overridePresent: databaseUrlOverrideKeys.some((key) => Boolean(process.env[key])),
    present: raw.length > 0,
    length: raw.length,
    trimmedLength: trimmed.length,
    startsWithPostgres: isPostgresUrl(trimmed),
    startsWithHttps: trimmed.startsWith('https://'),
    startsWithKeyName: trimmed.startsWith('DATABASE_URL='),
    startsWithQuote: trimmed.startsWith('"') || trimmed.startsWith("'"),
    hasLeadingOrTrailingWhitespace: raw !== raw.trim(),
    normalizedFromAssignment: raw.trim() !== trimmed,
    host,
    username
  };
}
