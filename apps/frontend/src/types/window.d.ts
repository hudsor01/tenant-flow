declare global {
  interface Window {
    React?: typeof import('react')
    __REACT_BOOTSTRAP_READY__?: boolean
    __REACT_ERROR_BOUNDARY__?: (error: Error, errorInfo: { phase: string }) => void
    __loadReactPolyfillIfNeeded__?: () => void
  }
}

export {}