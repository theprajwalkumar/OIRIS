export const generateEventId = () => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const formatTimestamp = (timestamp, options = {}) => {
  const { relative = false, short = false, timezone = 'UTC' } = options

  if (timestamp === null || timestamp === undefined || timestamp === '') return 'N/A'

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  if (isNaN(date.getTime())) return 'N/A'

  const time = date.getTime()

  if (relative) {
    const now = Date.now()
    const diff = Math.max(0, now - time)
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    try {
      return date.toISOString().split('T')[0]
    } catch {
      return 'N/A'
    }
  }

  if (short) {
    try {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone
      })
    } catch {
      return 'N/A'
    }
  }

  try {
    return date.toISOString().replace('T', ' ').replace('Z', ' UTC')
  } catch {
    return 'N/A'
  }
}

export const formatCoordinates = (lat, lng, precision = 4) => {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(precision)}°${latDir} ${Math.abs(lng).toFixed(precision)}°${lngDir}`
}

export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = (lng2 - lng1) * Math.PI / 180
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)
  const bearing = Math.atan2(y, x) * 180 / Math.PI
  return (bearing + 360) % 360
}

export const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export const throttle = (fn, limit) => {
  let inThrottle
  return (...args) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const lerp = (a, b, t) => a + (b - a) * t

export const getSeverityColor = (severity) => {
  const colors = {
    critical: '#ff3355',
    high: '#ffb800',
    medium: '#00d4ff',
    info: '#00ff88'
  }
  return colors[severity] || colors.info
}

export const getSeverityLabel = (severity) => {
  const labels = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    info: 'INFO'
  }
  return labels[severity] || 'UNKNOWN'
}

export const parseCSV = (text) => {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i]
      return obj
    }, {})
  })
}

export const downloadBlob = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const isValidCoordinate = (lat, lng) => {
  return typeof lat === 'number' && typeof lng === 'number' &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export const getCountryName = (code) => {
  const names = {
    'US': 'United States', 'CN': 'China', 'RU': 'Russia', 'IN': 'India',
    'BR': 'Brazil', 'AU': 'Australia', 'CA': 'Canada', 'FR': 'France',
    'DE': 'Germany', 'JP': 'Japan', 'GB': 'United Kingdom', 'KR': 'South Korea',
    'IR': 'Iran', 'SA': 'Saudi Arabia', 'TR': 'Turkey', 'IL': 'Israel',
    'SY': 'Syria', 'IQ': 'Iraq', 'AF': 'Afghanistan', 'PK': 'Pakistan',
    'UA': 'Ukraine', 'BY': 'Belarus', 'KP': 'North Korea', 'TW': 'Taiwan',
    'VN': 'Vietnam', 'TH': 'Thailand', 'MY': 'Malaysia', 'ID': 'Indonesia',
    'PH': 'Philippines', 'SG': 'Singapore', 'AE': 'UAE', 'QA': 'Qatar',
    'KW': 'Kuwait', 'BH': 'Bahrain', 'OM': 'Oman', 'YE': 'Yemen',
    'EG': 'Egypt', 'LY': 'Libya', 'DZ': 'Algeria', 'MA': 'Morocco',
    'TN': 'Tunisia', 'SD': 'Sudan', 'ET': 'Ethiopia', 'KE': 'Kenya',
    'NG': 'Nigeria', 'ZA': 'South Africa', 'AR': 'Argentina', 'CL': 'Chile',
    'CO': 'Colombia', 'PE': 'Peru', 'VE': 'Venezuela', 'MX': 'Mexico',
    'PL': 'Poland', 'RO': 'Romania', 'HU': 'Hungary', 'CZ': 'Czechia',
    'SK': 'Slovakia', 'HR': 'Croatia', 'RS': 'Serbia', 'BG': 'Bulgaria',
    'GR': 'Greece', 'PT': 'Portugal', 'ES': 'Spain', 'IT': 'Italy',
    'NL': 'Netherlands', 'BE': 'Belgium', 'AT': 'Austria', 'CH': 'Switzerland',
    'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland',
    'EE': 'Estonia', 'LV': 'Latvia', 'LT': 'Lithuania', 'IE': 'Ireland'
  }
  return names[code?.toUpperCase()] || code
}

export const getRandomInBounds = (bounds, count) => {
  const results = []
  for (let i = 0; i < count; i++) {
    const lat = bounds[0][0] + Math.random() * (bounds[1][0] - bounds[0][0])
    const lng = bounds[0][1] + Math.random() * (bounds[1][1] - bounds[0][1])
    results.push([lat, lng])
  }
  return results
}

export const parseISODate = (dateString) => {
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date.getTime()
}

export const generateGridPoints = (bounds, resolution) => {
  const points = []
  const latStep = (bounds[1][0] - bounds[0][0]) / resolution
  const lngStep = (bounds[1][1] - bounds[0][1]) / resolution
  
  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      points.push([
        bounds[0][0] + i * latStep,
        bounds[0][1] + j * lngStep
      ])
    }
  }
  return points
}