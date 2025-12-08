import * as React from 'react'

export function useMediaQuery(query: string) {
	const getMatch = React.useCallback(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
			return false
		}
		return window.matchMedia(query).matches
	}, [query])

	const [value, setValue] = React.useState<boolean>(getMatch)

	React.useEffect(() => {
		const mediaQueryList = window.matchMedia(query)

		const onChange = (event: MediaQueryListEvent) => setValue(event.matches)
		setValue(mediaQueryList.matches)

		mediaQueryList.addEventListener('change', onChange)
		return () => mediaQueryList.removeEventListener('change', onChange)
	}, [query])

	return value
}
