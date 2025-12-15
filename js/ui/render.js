import { ENERGY_ICONS } from '../core/constants.js';

export function energyIconUrl(k) {
  return ENERGY_ICONS[k === 'electric' ? 'lightning' : k] || ENERGY_ICONS.colorless;
}

export function updateDeckStack(owner) {
  const stackId = owner === 'player1' ? 'p1DeckStack' : 'p2DeckStack';
  const stack = document.getElementById(stackId);
  if (!stack) return;
  
  const deckSize = globalThis.playerState?.[owner]?.deck?.length || 0;
  const maxVisible = 10;
  const visibleCount = Math.min(deckSize, maxVisible);
  
  stack.innerHTML = '';
  
  for (let i = 0; i < visibleCount; i++) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    stack.appendChild(card);
  }
  
  if (deckSize === 0) {
    stack.style.opacity = '0';
  } else {
    stack.style.opacity = '1';
  }
}

export function updateDeckBubbles() {
  const p1Bubble = document.getElementById('p1Bubble');
  const p2Bubble = document.getElementById('p2Bubble');
  if (p1Bubble) p1Bubble.textContent = globalThis.playerState?.player1?.deck?.length || 0;
  if (p2Bubble) p2Bubble.textContent = globalThis.playerState?.player2?.deck?.length || 0;
  updateDeckStack('player1');
  updateDeckStack('player2');
}

export function updatePointsUI() {
  const f = (id, pts) => {
    document.querySelectorAll(`#${id} .point-bubble`).forEach(b => {
      b.classList.toggle('filled', Number(b.dataset.i) <= pts);
    });
  };
  f('p1Points', globalThis.p1Points || 0);
  f('p2Points', globalThis.p2Points || 0);
}

export function updateTurnBox() {
  const turnNumEl = document.getElementById('turnNum');
  if (turnNumEl) turnNumEl.textContent = globalThis.turnNumber || 0;
}

export function setHpOnImage(img, baseHp, chp) {
  img.dataset.hp = String(baseHp);
  img.dataset.chp = String(chp);
  const slot = img.closest('.card-slot');
  if (!slot) return;
  
  const modifiedMaxHp = slot.dataset.maxHp ? parseInt(slot.dataset.maxHp, 10) : null;
  const displayMax = modifiedMaxHp || baseHp;
  
  let hpDiv = slot.querySelector('.hp-overlay');
  if (!hpDiv) {
    hpDiv = document.createElement('div');
    hpDiv.className = 'hp-overlay';
    slot.appendChild(hpDiv);
  }
  hpDiv.textContent = `${chp} / ${displayMax}`;
  
  if (modifiedMaxHp) {
    hpDiv.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
    hpDiv.style.fontWeight = '900';
  } else {
    hpDiv.style.background = 'rgba(0,0,0,.85)';
    hpDiv.style.fontWeight = '800';
  }
}

export function renderHand(div, cards, hide = false, addFadeIn = false) {
  const owner = div.id === 'p1Hand' ? 'player1' : 'player2';
  
  const selData = globalThis.__pokemonCommSelection;
  const isCommActive = globalThis.__pokemonCommActive && selData;
  
  const rareCandyData = globalThis.__rareCandySelection;
  const isRareCandyActive = globalThis.__rareCandyActive && rareCandyData;
  
  div.innerHTML = (cards || []).map(c => {
    const src = hide ? 'imgs/cardback.png' : (c.image || 'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg');
    
    let extraClass = '';
    if (isCommActive && selData.pokemonInHand.includes(c)) {
      extraClass = ' poke-comm-glow';
    }
    
    if (isRareCandyActive && rareCandyData.owner === owner) {
      const isEligibleStage2 = rareCandyData.pairsForBasic.some(p =>
        p.handCard.set === c.set && String(p.handCard.number || p.handCard.num) === String(c.number || c.num)
      );
      if (isEligibleStage2) {
        extraClass = ' poke-comm-glow';
      }
    }
    
    return `<div class="card-slot" data-empty="0"><img class="card-img${extraClass}" src="${src}" alt="${c.name}" data-owner="${owner}" data-set="${c.set}" data-num="${c.number || c.num}" draggable="true"></div>`;
  }).join('');
  
  const currentPlayer = globalThis.currentPlayer || '';
  const isSetupPhase = globalThis.isSetupPhase || false;
  
  if ((owner === currentPlayer || isSetupPhase) && !hide) {
    const handCards = div.querySelectorAll('.card-img');
    handCards.forEach(img => {
      const newImg = img.cloneNode(true);
      img.parentNode.replaceChild(newImg, img);
      
      newImg.addEventListener('dragstart', async (e) => {
        let isTool = false;
        try {
          const cardMeta = await globalThis.fetchCardMeta(newImg.dataset.set, newImg.dataset.num);
          if (cardMeta && String(cardMeta.trainerType || '').toLowerCase() === 'tool') {
            isTool = true;
          }
        } catch {}
        
        const isEvoMode = globalThis.isEvoMode || false;
        const selectedEnergy = globalThis.selectedEnergy;
        const isPromotionPhase = globalThis.isPromotionPhase || false;
        const isRetreatSelection = globalThis.isRetreatSelection || false;
        
        if (isEvoMode || selectedEnergy || isPromotionPhase || isRetreatSelection) {
          e.preventDefault();
          return;
        }
        
        const toolAttachPending = globalThis.toolAttachPending || false;
        if (toolAttachPending && !isTool) {
          e.preventDefault();
          return;
        }
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
          set: newImg.dataset.set,
          num: newImg.dataset.num,
          owner: newImg.dataset.owner
        }));
        
        newImg.style.opacity = '0.5';
        newImg.style.cursor = 'grabbing';
        
        document.querySelectorAll('.card-slot').forEach(slot => {
          const slotImg = slot.querySelector('img');
          if (slotImg && (slot.closest('.bench') || slot.closest('.active'))) {
            const slotOwner = slot.closest('#player1') ? 'player1' : 'player2';
            if (slotOwner === owner) {
              slot.classList.add('drag-target');
            }
          }
        });
      });
      
      newImg.addEventListener('dragend', (e) => {
        newImg.style.opacity = '1';
        newImg.style.cursor = 'grab';
        document.querySelectorAll('.card-slot').forEach(slot => {
          slot.classList.remove('drag-target', 'drag-over');
        });

        document.querySelectorAll('.card-slot img.card-img').forEach(pokemonImg => {
          pokemonImg.style.border = '';
          pokemonImg.style.boxShadow = '';
        });
      });
    });
  }
}

export function renderAllHands() {
  const currentPlayer = globalThis.currentPlayer || '';
  const p1HandDiv = globalThis.p1HandDiv || document.getElementById('p1Hand');
  const p2HandDiv = globalThis.p2HandDiv || document.getElementById('p2Hand');
  const playerState = globalThis.playerState || {};
  
  const p1Hide = currentPlayer === 'player2';
  const p2Hide = currentPlayer === 'player1';
  renderHand(p1HandDiv, playerState.player1?.hand || [], p1Hide);
  renderHand(p2HandDiv, playerState.player2?.hand || [], p2Hide);
  if (p1HandDiv) p1HandDiv.classList.toggle('disable-clicks', currentPlayer === 'player2');
  if (p2HandDiv) p2HandDiv.classList.toggle('disable-clicks', currentPlayer === 'player1');
}

export function renderDiscard(owner) {
  const drawerId = owner === 'player1' ? 'p1DiscardDrawer' : 'p2DiscardDrawer';
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  
  const playerState = globalThis.playerState || {};
  const { cards, energyCounts } = playerState[owner]?.discard || { cards: [], energyCounts: {} };
  
  drawer.innerHTML = `
    <h3 style="margin:10px 0 6px;">
      ${owner === 'player1' ? 'Player 1' : 'Player 2'} Discard (${cards.length + Object.values(energyCounts).reduce((a, b) => a + b, 0)})
    </h3>
    <button style="margin-bottom:10px" onclick="document.getElementById('${drawerId}').classList.remove('show'); if(typeof updateDiscardDrawerPositions === 'function') updateDiscardDrawerPositions();">Close</button>
  `;
  const energiesRow = document.createElement('div');
  energiesRow.style.display = 'flex';
  energiesRow.style.flexDirection = 'column';
  Object.keys(energyCounts).forEach(k => {
    const row = document.createElement('div');
    row.className = 'discard-item';
    const ico = document.createElement('span');
    ico.className = 'mini-icon';
    ico.style.backgroundImage = `url('${energyIconUrl(k)}')`;
    ico.style.width = '26px';
    ico.style.height = '26px';
    const cnt = document.createElement('span');
    cnt.className = 'discard-count';
    cnt.textContent = `x${energyCounts[k]}`;
    row.appendChild(ico);
    row.appendChild(cnt);
    energiesRow.appendChild(row);
  });
  drawer.appendChild(energiesRow);
  cards.forEach(c => {
    const row = document.createElement('div');
    row.className = 'discard-item';
    const im = document.createElement('img');
    im.src = c.src;
    row.appendChild(im);
    drawer.appendChild(row);
  });
}

export function renderEnergyZone() {
  const energyZoneDiv = globalThis.energyZoneDiv || document.getElementById('energyZone');
  if (!energyZoneDiv) return;
  
  const currentPlayer = globalThis.currentPlayer || '';
  const playerState = globalThis.playerState || {};
  const state = playerState[currentPlayer] || {};
  const energyTypes = state.energyTypes || [];
  const currentEnergy = state.currentTurnEnergy || (energyTypes.length > 0 ? energyTypes[0] : null);
  const nextEnergy = state.nextTurnEnergy || (energyTypes.length > 0 ? energyTypes[0] : null);
  
  energyZoneDiv.innerHTML = '';

  const disable =
    (globalThis.turnNumber === 1 && currentPlayer === globalThis.firstPlayer) ||
    globalThis.hasAttachedEnergyThisTurn;

  if (currentEnergy) {
    const energyContainer = document.createElement('div');
    energyContainer.className = 'energy-container';
    energyContainer.style.position = 'relative';
    energyContainer.style.display = 'inline-block';
    
    const energyTypeMap = {
      'w': 'water',
      'f': 'fire',
      'g': 'grass',
      'l': 'lightning',
      'p': 'psychic',
      'r': 'fighting',
      'd': 'darkness',
      'm': 'metal',
      'n': 'dragon',
      'c': 'colorless'
    };
    let lw = currentEnergy.toLowerCase();

    if (energyTypeMap[lw]) {
      lw = energyTypeMap[lw];
    }
    const el = document.createElement('div');
    el.className = 'energy';
    const currentIconUrl = ENERGY_ICONS[lw] || ENERGY_ICONS.colorless;
    el.style.backgroundImage = `url('${currentIconUrl}')`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.title = `${currentEnergy} (Current Turn)`;

      if (disable) {
        el.style.filter = 'grayscale(100%) brightness(70%)';
        el.style.cursor = 'not-allowed';
        el.onclick = null;
        el.style.pointerEvents = 'none';
      } else {
        el.style.pointerEvents = 'auto';
      el.onclick = (ev) => {
        ev.stopPropagation();
        
        if (globalThis.selectedEnergyElement) {
          globalThis.selectedEnergyElement.classList.remove('selected-glow');
        }
        if (globalThis.selectedToolElement) {
          globalThis.selectedToolElement.classList.remove('selected-glow');
          globalThis.toolAttachPending = null;
        }
        
        globalThis.selectedEnergy = lw;
        if (typeof globalThis.setSelectedEnergy === 'function') {
          globalThis.setSelectedEnergy(lw);
        } else if (typeof window !== 'undefined' && window.selectedEnergy !== undefined) {
          window.selectedEnergy = lw;
        }
        globalThis.selectedEnergyElement = el;
        globalThis.selectedToolElement = null;
        el.classList.add('selected-glow');
        if (globalThis.showPopup) {
          globalThis.showPopup(`Selected ${lw} energy. Click a Pokémon to attach, or press Escape to cancel.`);
        }
        
        if (globalThis.setupSelectionCancelHandler) {
          globalThis.setupSelectionCancelHandler();
        }
      };
    }

    energyContainer.appendChild(el);
    
    if (nextEnergy) {
      const energyTypeMap = {
        'w': 'water',
        'f': 'fire',
        'g': 'grass',
        'l': 'lightning',
        'p': 'psychic',
        'r': 'fighting',
        'd': 'darkness',
        'm': 'metal',
        'n': 'dragon',
        'c': 'colorless'
      };
      let nextLw = nextEnergy.toLowerCase();

      if (energyTypeMap[nextLw]) {
        nextLw = energyTypeMap[nextLw];
      }
      const nextEl = document.createElement('div');
      nextEl.className = 'energy energy-next-turn';
      const nextIconUrl = ENERGY_ICONS[nextLw] || ENERGY_ICONS.colorless;

      const nextImg = document.createElement('img');
      nextImg.src = nextIconUrl;
      nextImg.style.width = '100%';
      nextImg.style.height = '100%';
      nextImg.style.objectFit = 'cover';
      nextImg.style.borderRadius = '50%';
      nextImg.alt = `${nextEnergy} (Next Turn)`;
      nextEl.appendChild(nextImg);
      nextEl.title = `${nextEnergy} (Next Turn)`;
      energyContainer.appendChild(nextEl);
    }
    
    energyZoneDiv.appendChild(energyContainer);
  } else {
    for (const t of energyTypes) {
      const lw = t.toLowerCase();
      const el = document.createElement('div');
      el.className = 'energy';
      el.style.backgroundImage = `url('${ENERGY_ICONS[lw] || ''}')`;
      el.title = t;

      if (disable) {
        el.style.filter = 'grayscale(100%) brightness(70%)';
        el.style.cursor = 'not-allowed';
        el.onclick = null;
        el.style.pointerEvents = 'none';
      } else {
        el.style.pointerEvents = 'auto';
        el.onclick = (ev) => {
          ev.stopPropagation();
          
          if (globalThis.selectedEnergyElement) {
            globalThis.selectedEnergyElement.classList.remove('selected-glow');
          }
          if (globalThis.selectedToolElement) {
            globalThis.selectedToolElement.classList.remove('selected-glow');
            globalThis.toolAttachPending = null;
          }
          
          globalThis.selectedEnergy = lw;
          globalThis.selectedEnergyElement = el;
          globalThis.selectedToolElement = null;
          el.classList.add('selected-glow');
          if (globalThis.showPopup) {
            globalThis.showPopup(`Selected ${lw} energy. Click a Pokémon to attach, or press Escape to cancel.`);
          }
          
          if (globalThis.setupSelectionCancelHandler) {
            globalThis.setupSelectionCancelHandler();
          }
        };
      }

      energyZoneDiv.appendChild(el);
    }
  }
}

