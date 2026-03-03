import { getJsonLd } from '#lib/generate-metadata'

export default function SeoJsonLd() {
	const schemas = getJsonLd()

	return (
		<>
			{schemas.map((schema, index) => (
				<script
					key={`schema-${index}`}
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(schema).replace(/</g, '\\u003c')
					}}
				/>
			))}
		</>
	)
}
