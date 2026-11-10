// Probe stub for #lib/supabase/client (component-probes.mjs maps the specifier here).
// No network: every auth call resolves to { data: null, error: null }.
const empty = async () => ({ data: null, error: null });

export function createClient() {
	return {
		auth: {
			getUser: empty,
			mfa: { challenge: empty, verify: empty, listFactors: empty },
		},
	};
}
