import React, { useCallback, useMemo, useRef, useState } from 'react'
import LeftRail from '../shell/LeftRail.jsx'
import AppTopBar from '../shell/AppTopBar.jsx'
import { Section } from '../sections/Section.jsx'
import { useScrollSpy } from '../../hooks/useScrollSpy.js'
import { SECTION_IDS, railIdFor } from '../../config/sections.js'

// Temporary: existing panels remain mounted inside the new section chrome
// until phases 3-4 replace each section's contents.
import Stage from './Stage.jsx'
import NewsPlayer from './NewsPlayer.jsx'
import { WebcamsPanel, BreakingTicker } from './BroadcastPanels.jsx'
import InstabilitySection from '../sections/InstabilitySection.jsx'
import MarketsSection from '../sections/MarketsSection.jsx'
import CyberSection from '../sections/CyberSection.jsx'
import { AircraftMetricsPanel, FlightDataPanel, FlightDetailPanel, GlobalFlightRadarPanel, LocalRadarPanel } from './AviationPanels.jsx'
import { MaritimeAisPanel, CablesPipelinesPanel, PowerGridPanel, SpacePanel } from './MaritimePanels.jsx'
import { EarthquakesPanel, WildfiresWeatherPanel } from './DisasterPanels.jsx'
import GlobalFooter from './GlobalFooter.jsx'

const Dashboard = () => {
  const scrollRef = useRef(null)
  const [range, setRange] = useState('24h')

  const ids = useMemo(() => SECTION_IDS, [])
  const activeSection = useScrollSpy(ids, scrollRef)
  const activeRail = railIdFor(activeSection)

  const jump = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="h-screen w-screen bg-[var(--color-ink)]">
      <LeftRail activeId={activeRail} onJump={jump} />

      <div className="flex h-screen flex-col pl-16">
        <AppTopBar range={range} onRange={setRange} />

        <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 pb-24 md:px-10">
            <Section
              id="situation"
              title="Situation"
              description="Live global picture: active conflicts, cyber activity, maritime movement and natural events on a single rotating globe."
            >
              <Stage />
            </Section>

            <Section
              id="instability"
              title="Instability and conflict"
              description="Regional instability index with 24-hour movement, active conflict zones, and how much signal we are receiving."
              status="12 feeds nominal"
            >
              <InstabilitySection />
            </Section>

            <Section
              id="markets"
              title="Markets and economy"
              description="India and world markets side by side, with 24-hour movement."
            >
              <MarketsSection />
            </Section>

            <Section
              id="cyber"
              title="Cyber and threat intelligence"
              description="Attack flows between origin and target countries, tracked threat families, and known exploited vulnerabilities."
            >
              <CyberSection />
            </Section>

            <Section
              id="domain"
              title="Air, sea and space"
              description="Live aviation over our airspace, maritime chokepoint pressure, and orbital passes overhead."
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <AircraftMetricsPanel />
                <div className="lg:col-span-2"><GlobalFlightRadarPanel /></div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2"><LocalRadarPanel /></div>
                <FlightDataPanel />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <MaritimeAisPanel />
                <SpacePanel />
                <FlightDetailPanel />
              </div>
            </Section>

            <Section
              id="infrastructure"
              title="Infrastructure"
              description="Submarine cable health and power and internet outage pressure by region."
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <CablesPipelinesPanel />
                <PowerGridPanel />
              </div>
            </Section>

            <Section
              id="earth"
              title="Earth and weather"
              description="Seismic activity, wildfires and anomalies, plus the live news desk."
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <EarthquakesPanel />
                <WildfiresWeatherPanel />
              </div>

              <h3 className="mt-10 mb-4 font-serif text-2xl text-[var(--color-bone)]">Live desk</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 min-h-[280px]"><NewsPlayer /></div>
                <WebcamsPanel />
              </div>
              <div className="mt-4"><BreakingTicker /></div>
            </Section>

            <GlobalFooter />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
