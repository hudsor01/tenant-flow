import { useCallback, useEffect, useState } from 'react'

export function useMediaQuery(query: string) {
	const getMatch = useCallback(() => {
		if (
			typeof window === 'undefined' ||
			typeof window.matchMedia === 'undefined'
		) {
			return false
		}
		return window.matchMedia(query).matches
	}, [query])

	const [value, setValue] = useState<boolean>(getMatch)

	useEffect(() => {
		const mediaQueryList = window.matchMedia(query)

		const onChange = (event: MediaQueryListEvent) => setValue(event.matches)
		setValue(mediaQueryList.matches)

		mediaQueryList.addEventListener('change', onChange)
		return () => mediaQueryList.removeEventListener('change', onChange)
	}, [query])

	return value
}
