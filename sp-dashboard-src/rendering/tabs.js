import { TAB_IDS } from '../constants.js';

export const switchTab = (tabId) => {
  TAB_IDS.forEach(id => {
    document.getElementById(`view-${id}`).classList.add('hidden');
    document.getElementById(`tab-btn-${id}`).classList.remove('active');
  });
  document.getElementById(`view-${tabId}`).classList.remove('hidden');
  document.getElementById(`tab-btn-${tabId}`).classList.add('active');
};

export const initTabHandlers = () => {
  TAB_IDS.forEach(id => {
    const btn = document.getElementById(`tab-btn-${id}`);
    if (btn) btn.addEventListener('click', () => switchTab(id));
  });
};
