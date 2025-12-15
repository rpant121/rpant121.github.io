import { ENERGY_ICONS, STATUS_ICON_URLS, ABILITY_BADGE } from '../core/constants.js';
import { energyIconUrl } from './render.js';

export function showPopup(msg, duration = 1800) {
  const popupEl = globalThis.popupEl || document.getElementById('popup');
  if (!popupEl) return;

  if (globalThis.popupTimeout) {
    clearTimeout(globalThis.popupTimeout);
    globalThis.popupTimeout = null;
  }

  popupEl.textContent = msg;
  popupEl.classList.add('show');

  globalThis.popupTimeout = setTimeout(() => {
    popupEl.classList.remove('show');
    globalThis.popupTimeout = null;
  }, duration);
}

export function closeAttackMenu() {
  const openAttackMenu = globalThis.openAttackMenu;
  if (openAttackMenu) {
    const menuOpenSlots = document.querySelectorAll('.card-slot.menu-open');
    menuOpenSlots.forEach(slot => slot.classList.remove('menu-open'));

    if (openAttackMenu._escapeHandler) {
      document.removeEventListener('keydown', openAttackMenu._escapeHandler);
    }

    if (openAttackMenu._clickOutsideHandler) {
      document.removeEventListener('click', openAttackMenu._clickOutsideHandler, true);
    }

    if (openAttackMenu._backdrop) {
      openAttackMenu._backdrop.remove();
    }

    if (openAttackMenu.parentElement) {
      openAttackMenu.parentElement.removeChild(openAttackMenu);
    }
  }
  globalThis.openAttackMenu = null;
  if (typeof globalThis.setMenuJustClosed === 'function') {
    globalThis.setMenuJustClosed(true);
    setTimeout(() => {
      if (typeof globalThis.setMenuJustClosed === 'function') {
        globalThis.setMenuJustClosed(false);
      }
    }, 100);
  }
}

export async function openToolModal(set, num, src) {
  const toolBackdrop = globalThis.toolBackdrop || document.getElementById('toolBackdrop');
  const toolImg = globalThis.toolImg || document.getElementById('toolImg');
  const toolTitle = globalThis.toolTitle || document.getElementById('toolTitle');
  const toolMeta = globalThis.toolMeta || document.getElementById('toolMeta');
  const toolText = globalThis.toolText || document.getElementById('toolText');
  
  if (!toolBackdrop) return;
  
  if (toolImg) toolImg.src = src || '';
  if (toolTitle) toolTitle.textContent = 'Tool';
  if (toolMeta) toolMeta.textContent = '';
  if (toolText) toolText.textContent = '';
  toolBackdrop.classList.add('show');
  
  try {
    const fetchCardMeta = globalThis.fetchCardMeta;
    if (!fetchCardMeta) throw new Error('fetchCardMeta not available');
    
    const meta = await fetchCardMeta(set, num);
    if (toolTitle) toolTitle.textContent = meta.name || 'Tool';
    if (toolMeta) toolMeta.textContent = (meta.trainerType ? meta.trainerType : 'Tool');
    if (toolText) toolText.textContent = (meta.effect || meta.description || '');
  } catch {
    if (toolText) toolText.textContent = 'No details available.';
  }
}

export function countPipsOn(slot) {
  const out = { total: 0 };

  slot.querySelectorAll('.energy-pip:not(.phantom-pip)').forEach(p => {
    const t = (p.dataset.type || 'colorless').toLowerCase();
    out[t] = (out[t] || 0) + 1;
    out.total++;
  });
  return out;
}

export function getToolDataFromSlot(slot) {
  const set = slot.dataset.toolSet || null;
  const num = slot.dataset.toolNum || null;
  const src = slot.dataset.toolSrc || null;
  return set && num && src ? { set, num, src } : null;
}

export function extractAbilities(meta) {
  if (!meta) return [];

  if (Array.isArray(meta.abilities)) return meta.abilities;

  if (meta.abilities && typeof meta.abilities === 'object') return [meta.abilities];

  if (meta.ability) return [meta.ability];
  return [];
}

