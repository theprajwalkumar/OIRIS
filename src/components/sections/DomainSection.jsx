import React, { useEffect, useState } from 'react'
import { useFlights } from '../../context/FlightContext.jsx'
import { LocalRadarPanel, GlobalFlightRadarPanel, FlightDataPanel, FlightDetailPanel } from '../dashboard/AviationPanels.jsx'
import { MaritimeAisPanel, SpacePanel } from '../dashboard/MaritimePanels.jsx'

const Stat = ({ label, value, note }) => (
  <div>
    <div className="font-serif text-[38px] leading-none text-[var(--color-bone)]">{value}</div>
    <div className="mt-1 text-xs text-[var(--color-mute)]">{label}</div>
    {note && <div className="text-[11px] text-[var(--color-faint)]">{note}</div>}
  </div>
)

const DomainSection = () => {
  const { flights, source, lastUpdate, loading } = useFlights()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  const active = flights.filter((f) => !f.onGround).length
  const military = flights.filter((f) => f.military).length
  const countries = new Set(flights.map((f) => f.originCountry)).size

  return (
    <div>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat label="Aircraft airborne" value={active.toLocaleString()} note={source || 'adsb.lol'} />
        <Stat label="Military" value={military} note="ADS-B proxy" />
        <Stat label="On ground" value={(flights.length - active).toLocaleString()} />
        <Stat
          label="Origin countries"
          value={countries}
          note={lastUpdate ? `updated ${Math.max(0, Math.floor((now - lastUpdate) / 1000))}s ago` : loading ? 'syncing' : '—'}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><LocalRadarPanel /></div>
        <SpacePanel />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlobalFlightRadarPanel />
        <MaritimeAisPanel />
        <FlightDataPanel />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FlightDetailPanel />
      </div>
    </div>
  )
}

export default DomainSection