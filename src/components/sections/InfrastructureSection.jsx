import React from 'react'
import { CablesPipelinesPanel, PowerGridPanel } from '../dashboard/MaritimePanels.jsx'

const InfrastructureSection = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <CablesPipelinesPanel />
    <PowerGridPanel />
  </div>
)

export default InfrastructureSection