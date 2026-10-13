/**
 * Normalize a Directus field value that is expected to hold a list of
 * strings. Depending on the database driver and field type, such values can
 * arrive as arrays (parsed JSON), JSON-encoded strings (raw text columns),
 * comma-separated strings or single values. Exact string matching must only
 * ever run on the parsed result, never on the raw value.
 */
export function toStringArray(value) {
	if (value == null) return [];
	if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '') return [];
		if (trimmed.startsWith('[')) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					return parsed.filter((item) => typeof item === 'string');
				}
			} catch {
				// Not valid JSON after all; treat it as a plain separated list below.
			}
		}
		return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
	}
	return [];
}
