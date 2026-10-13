import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Handsontable v15+ requires registering modules and importing a theme's CSS.
// Imported before the app styles so that App.scss can override the grid styles.
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/styles/handsontable.css'
import 'handsontable/styles/ht-theme-main.css'

import App from './App'

registerAllModules()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
