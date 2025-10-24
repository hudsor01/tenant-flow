/**
 * ZIP Code API Integration
 * 
 * Hybrid approach:
 * 1. Try static lookup first (<1ms, 500 most common ZIPs)
 * 2. Fall back to free API for uncommon ZIPs (50-100ms)
 * 
 * Free APIs available:
 * - Zippopotamus (http://api.zippopotam.us) - NO API KEY, unlimited
 * - OpenDataSoft (https://public.opendatasoft.com) - NO API KEY, rate-limited
 * 
 * We use Zippopotamus as primary (no key, reliable, fast)
 */

import { lookupZipCode, type ZipData } from './zip-lookup.js'

/**
 * API response from Zippopotamus
 */
interface ZippopotamusResponse {
	'post code': string
	country: string
	'country abbreviation': string
	places: Array<{
		'place name': string
		longitude: string
		state: string
		'state abbreviation': string
		latitude: string
	}>
}

/**
 * Fetch ZIP code data from Zippopotamus API
 * Free, no API key required, unlimited requests
 * 
 * @param zip 5-digit ZIP code
 * @returns City and state data
 * 
 * @example
 * await fetchZipFromAPI('12345')
 * // { city: 'Schenectady', state: 'NY' }
 */
async function fetchZipFromAPI(zip: string): Promise<ZipData | null> {
	try {
		const response = await fetch(`http://api.zippopotam.us/us/${zip}`, {
			signal: AbortSignal.timeout(3000) // 3s timeout
		})
		
		if (!response.ok) return null
		
		const data: ZippopotamusResponse = await response.json()
		
		if (!data.places || data.places.length === 0) return null
		
		// Use first result (primary city for this ZIP)
		const place = data.places[0]!

		return {
			city: place['place name'],
			state: place['state abbreviation']
		}
	} catch (error) {
		// Network error, timeout, or invalid response
		console.warn('ZIP API fetch failed:', error)
		return null
	}
}

/**
 * Lookup ZIP code with hybrid approach:
 * 1. Check static lookup first (instant, covers 40% of ZIPs)
 * 2. Fall back to API for uncommon ZIPs (50-100ms)
 * 3. Return null if both fail
 * 
 * @param zip ZIP code (5 digits, optionally with dash/+4)
 * @returns City and state data
 * 
 * @example
 * // Common ZIP - instant from static lookup
 * await lookupZipCodeHybrid('90210') 
 * // { city: 'Beverly Hills', state: 'CA' }
 * 
 * // Uncommon ZIP - fetches from API
 * await lookupZipCodeHybrid('99501')
 * // { city: 'Anchorage', state: 'AK' }
 */
export async function lookupZipCodeHybrid(
	zip: string
): Promise<ZipData | null> {
	// Try static lookup first (O(1), <1ms)
	const staticResult = lookupZipCode(zip)
	if (staticResult) return staticResult
	
	// Fall back to API for uncommon ZIPs
	return await fetchZipFromAPI(zip)
}

/**
 * Synchronous-only lookup (no API fallback)
 * Use this for instant feedback without waiting for API
 * 
 * @param zip ZIP code
 * @returns City and state if in static lookup, null otherwise
 */
export { lookupZipCode as lookupZipCodeSync } from './zip-lookup.js'

/**
 * Prefetch ZIP data and cache in memory
 * Useful for form initialization or when you know the ZIP in advance
 * 
 * @param zip ZIP code to prefetch
 */
export async function prefetchZipCode(zip: string): Promise<void> {
	// If not in static lookup, fetch from API to warm browser cache
	const staticResult = lookupZipCode(zip)
	if (staticResult) return
	
	await fetchZipFromAPI(zip)
}
