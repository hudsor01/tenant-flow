import * as React from 'react'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

interface DeviceInfo {
	isMobile: boolean
	isTablet: boolean
	isDesktop: boolean
	isTouchDevice: boolean
	isStandalone: boolean
	orientation: 'portrait' | 'landscape'
	viewportWidth: number
	viewportHeight: number
	devicePixelRatio: number
	isLowEndDevice: boolean
}

interface MobileCapabilities {
	hasVibration: boolean
	hasGeolocation: boolean
	hasCamera: boolean
	hasShare: boolean
	hasInstallPrompt: boolean
	hasBackgroundSync: boolean
}

export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
		undefined
	)

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
		}
		mql.addEventListener('change', onChange)
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
		return () => mql.removeEventListener('change', onChange)
	}, [])

	return !!isMobile
}

export function useDeviceInfo(): DeviceInfo {
	const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(() => {
		if (typeof window === 'undefined') {
			return {
				isMobile: false,
				isTablet: false,
				isDesktop: true,
				isTouchDevice: false,
				isStandalone: false,
				orientation: 'landscape',
				viewportWidth: 1024,
				viewportHeight: 768,
				devicePixelRatio: 1,
				isLowEndDevice: false
			}
		}

		const width = window.innerWidth
		const height = window.innerHeight
		
		return {
			isMobile: width < MOBILE_BREAKPOINT,
			isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
			isDesktop: width >= TABLET_BREAKPOINT,
			isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
			isStandalone: window.matchMedia('(display-mode: standalone)').matches,
			orientation: width > height ? 'landscape' : 'portrait',
			viewportWidth: width,
			viewportHeight: height,
			devicePixelRatio: window.devicePixelRatio || 1,
			isLowEndDevice: navigator.hardwareConcurrency <= 2
		}
	})

	React.useEffect(() => {
		const updateDeviceInfo = () => {
			const width = window.innerWidth
			const height = window.innerHeight
			
			setDeviceInfo({
				isMobile: width < MOBILE_BREAKPOINT,
				isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
				isDesktop: width >= TABLET_BREAKPOINT,
				isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
				isStandalone: window.matchMedia('(display-mode: standalone)').matches,
				orientation: width > height ? 'landscape' : 'portrait',
				viewportWidth: width,
				viewportHeight: height,
				devicePixelRatio: window.devicePixelRatio || 1,
				isLowEndDevice: navigator.hardwareConcurrency <= 2
			})
		}

		// Listen to multiple events for comprehensive device detection
		const events = ['resize', 'orientationchange']
		events.forEach(event => window.addEventListener(event, updateDeviceInfo))
		
		// Listen for display mode changes (PWA)
		const standaloneQuery = window.matchMedia('(display-mode: standalone)')
		const handleStandaloneChange = () => updateDeviceInfo()
		standaloneQuery.addEventListener('change', handleStandaloneChange)

		return () => {
			events.forEach(event => window.removeEventListener(event, updateDeviceInfo))
			standaloneQuery.removeEventListener('change', handleStandaloneChange)
		}
	}, [])

	return deviceInfo
}

export function useMobileCapabilities(): MobileCapabilities {
	const [capabilities, setCapabilities] = React.useState<MobileCapabilities>(() => ({
		hasVibration: false,
		hasGeolocation: false,
		hasCamera: false,
		hasShare: false,
		hasInstallPrompt: false,
		hasBackgroundSync: false
	}))

	React.useEffect(() => {
		const checkCapabilities = async () => {
			const newCapabilities: MobileCapabilities = {
				hasVibration: 'vibrate' in navigator,
				hasGeolocation: 'geolocation' in navigator,
				hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
				hasShare: 'share' in navigator,
				hasInstallPrompt: false,
				hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
			}

			setCapabilities(newCapabilities)
		}

		void checkCapabilities()

		// Listen for install prompt
		const handleBeforeInstallPrompt = () => {
			setCapabilities(prev => ({ ...prev, hasInstallPrompt: true }))
		}

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		
		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		}
	}, [])

	return capabilities
}

export function useOrientation() {
	const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>(() => {
		if (typeof window === 'undefined') return 'landscape'
		return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
	})

	React.useEffect(() => {
		const updateOrientation = () => {
			setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait')
		}

		const events = ['resize', 'orientationchange']
		events.forEach(event => window.addEventListener(event, updateOrientation))

		return () => {
			events.forEach(event => window.removeEventListener(event, updateOrientation))
		}
	}, [])

	return orientation
}

export function useThumbZone() {
	const deviceInfo = useDeviceInfo()
	
	return React.useMemo(() => {
		if (!deviceInfo.isMobile) return null
		
		// Calculate thumb-reachable zones for mobile devices
		const { viewportWidth, viewportHeight } = deviceInfo
		
		return {
			// Easy reach zones (thumb-friendly)
			easyReach: {
				bottom: Math.min(200, viewportHeight * 0.35),
				sides: Math.min(100, viewportWidth * 0.15)
			},
			// Hard reach zones (requires hand repositioning)
			hardReach: {
				top: Math.max(100, viewportHeight * 0.25),
				center: {
					x: viewportWidth * 0.3,
					width: viewportWidth * 0.4
				}
			}
		}
	}, [deviceInfo])
}
