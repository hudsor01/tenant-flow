import { getJsonLd } from '@/lib/generate-metadata'

export default function SeoJsonLd() {
	const json = getJsonLd()

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
		/>
	)
}
