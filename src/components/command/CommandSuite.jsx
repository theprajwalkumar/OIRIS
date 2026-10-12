import React from 'react'
import { useOntology } from '../../context/OntologyContext.jsx'
import CommandSuiteNav from './CommandSuiteNav.jsx'
import ObjectExplorer from './ObjectExplorer.jsx'
import AIPAssistant from './AIPAssistant.jsx'
import AuditDrawer from './AuditDrawer.jsx'

/**
 * Defense & Intelligence Command Suite container.
 * Composes the persistent side-nav and the togglable Gotham/Maven/AIP modules.
 */
const CommandSuite = () => {
  const { suite, toggleSuite } = useOntology()

  return (
    <>
      {suite.nav && <CommandSuiteNav />}
      <ObjectExplorer open={suite.explorer} onClose={() => toggleSuite('explorer', false)} />
      <AIPAssistant open={suite.aip} onClose={() => toggleSuite('aip', false)} />
      <AuditDrawer open={suite.audit} onClose={() => toggleSuite('audit', false)} />
    </>
  )
}

export default CommandSuite
