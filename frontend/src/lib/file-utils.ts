export const formatBytes = (
  bytes: number,
  decimals = 2,
  size?: 'bytes' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'
) => {
  const k = 1000
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${size || sizes[i]}`
}

export const formatFileSize = (size: number) => {
  const thresh = 1024
  if (Math.abs(size) < thresh) {
    return `${size} B`
  }
  const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  let u = -1
  do {
    size /= thresh
    ++u
  } while (Math.abs(size) >= thresh && u < units.length - 1)
  return `${size.toFixed(1)} ${units[u]}`
}