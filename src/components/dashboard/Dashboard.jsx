import React, { useState } from 'react'
import MissionHeader from './MissionHeader.jsx'
import GlobalMapPanel from './GlobalMapPanel.jsx'
import NewsPlayer from './NewsPlayer.jsx'
import { WebcamsPanel, FeedCoveragePanel, BreakingTicker, GlobalSituationHeader } from './BroadcastPanels.jsx'
import { CIIPanel, ConflictZonesPanel, CriticalAlertsPanel, IntelStatsStrip } from './IntelPanels.jsx'
import { CyberAttackMapPanel, ThreatAgentsPanel, CisaKevPanel, PhishingMalwarePanel } from './CyberPanels.jsx'
import { AircraftMetricsPanel, FlightDataPanel, GlobalFlightRadarPanel, LocalRadarPanel } from './AviationPanels.jsx'
import { MaritimeAisPanel, CablesPipelinesPanel, PowerGridPanel, SpacePanel } from './MaritimePanels.jsx'
import { EarthquakesPanel, WildfiresWeatherPanel } from './DisasterPanels.jsx'
import GlobalFooter from './GlobalFooter.jsx'
import { Panel, SectionDivider } from './ui.jsx'

const Row = ({ children, className = '' }) => (
  <div className={`grid gap-2 ${className}`}>{children}</div>
)

const Dashboard = ({ onOpenSearch }) => {
  const [defcon] = useState(5)

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center p-1.5 overflow-hidden">
      <div
        className="relative w-full flex flex-col bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg overflow-hidden"
        style={{ aspectRatio: '16 / 9', maxHeight: '97vh', maxWidth: 'calc(97vh * 16 / 9)' }}
      >
        <div className="absolute inset-0 grid-overlay opacity-25 pointer-events-none z-[400]" aria-hidden="true" />
        <div className="absolute inset-0 vignette pointer-events-none z-[400]" aria-hidden="true" />
        <div className="absolute inset-0 scanline-overlay pointer-events-none z-[600]" aria-hidden="true" />

        <MissionHeader defcon={defcon} onOpenSearch={onOpenSearch} />

        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: 'thin' }}>
          <GlobalSituationHeader />

          <GlobalMapPanel />

          <Row className="grid-cols-1 lg:grid-cols-3">
            <Panel title="Live News Channel" accent="var(--color-accent-crimson)" className="lg:col-span-2 min-h-[280px]" dense>
              <div className="h-full p-2.5"><NewsPlayer /></div>
            </Panel>
            <WebcamsPanel />
          </Row>

          <BreakingTicker />

          <Row className="grid-cols-1 lg:grid-cols-3">
            <FeedCoveragePanel />
          </Row>

          <SectionDivider label="Intelligence & Instability" accent="var(--color-accent-amber)" />
          <IntelStatsStrip />
          <Row className="grid-cols-1 lg:grid-cols-3">
            <CIIPanel />
            <ConflictZonesPanel />
            <CriticalAlertsPanel />
          </Row>

          <SectionDivider label="Cyber & Threat Intelligence" accent="var(--color-accent-crimson)" />
          <Row className="grid-cols-1 lg:grid-cols-3">
            <CyberAttackMapPanel />
            <ThreatAgentsPanel />
            <CisaKevPanel />
          </Row>
          <Row className="grid-cols-1 lg:grid-cols-3">
            <PhishingMalwarePanel />
          </Row>

          <SectionDivider label="Aviation" accent="var(--color-accent-violet)" />
          <Row className="grid-cols-1 lg:grid-cols-3">
            <AircraftMetricsPanel />
            <div className="lg:col-span-2"><GlobalFlightRadarPanel /></div>
          </Row>
          <Row className="grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2"><LocalRadarPanel /></div>
            <FlightDataPanel />
          </Row>

          <SectionDivider label="Maritime · Infrastructure · Space" accent="var(--color-accent-cyan)" />
          <Row className="grid-cols-1 lg:grid-cols-3">
            <MaritimeAisPanel />
            <CablesPipelinesPanel />
            <PowerGridPanel />
          </Row>
          <Row className="grid-cols-1 lg:grid-cols-3">
            <SpacePanel />
          </Row>

          <SectionDivider label="Disasters & Weather" accent="var(--color-accent-crimson)" />
          <Row className="grid-cols-1 lg:grid-cols-2">
            <EarthquakesPanel />
            <WildfiresWeatherPanel />
          </Row>

          <GlobalFooter />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
