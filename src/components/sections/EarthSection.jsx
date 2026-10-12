import React from 'react'
import { EarthquakesPanel, WildfiresWeatherPanel } from '../dashboard/DisasterPanels.jsx'
import NewsPlayer from '../dashboard/NewsPlayer.jsx'
import { WebcamsPanel, BreakingTicker } from '../dashboard/BroadcastPanels.jsx'

const EarthSection = () => (
  <div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <EarthquakesPanel />
      <WildfiresWeatherPanel />
    </div>

    <h3 className="mb-4 mt-10 font-serif text-2xl text-[var(--color-bone)]">Live desk</h3>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="min-h-[300px] lg:col-span-2"><NewsPlayer /></div>
      <WebcamsPanel />
    </div>
    <div className="mt-4"><BreakingTicker /></div>
  </div>
)

export default EarthSection