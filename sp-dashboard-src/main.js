import './styles/base.css';
import './styles/layout.css';
import './styles/tabs.css';
import './styles/views.css';
import './styles/stats.css';
import './styles/charts.css';
import './styles/table.css';
import './styles/breakdown.css';

import { bootstrap } from './sp-integration.js';

bootstrap();

if (import.meta.env.DEV && !window.PluginAPI) {
  const { loadMockData } = await import('./dev/mock-data.js');
  loadMockData();
}
