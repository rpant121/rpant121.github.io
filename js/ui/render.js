import { ENERGY_ICONS } from '../core/constants.js';

export function energyIconUrl(k) {
  return ENERGY_ICONS[k === 'electric' ? 'lightning' : k] || ENERGY_ICONS.colorless;
}

export function updateDeckStack(owner) {
  const stackId = owner === 'player1' ? 'p1DeckStack' : 'p2DeckStack';
  const stack = document.getElementById(stackId);
  if (!stack) {
    console.error(`updateDeckStack: Stack element not found: ${stackId}`);
    return;
  }
  
  const deck = globalThis.playerState?.[owner]?.deck || [];
  const deckSize = deck.length;
  const deckFirstCard = deck[0]?.name;
  const otherOwner = owner === 'player1' ? 'player2' : 'player1';
  const otherDeck = globalThis.playerState?.[otherOwner]?.deck || [];
  const otherDeckSize = otherDeck.length;
  const otherDeckFirstCard = otherDeck[0]?.name;
  
  const decksAreSame = JSON.stringify(deck) === JSON.stringify(otherDeck);
  
  if (decksAreSame && deckSize > 0) {
    console.error(`ERROR: updateDeckStack found identical decks for ${owner} and ${otherOwner}!`, {
      ownerDeck: deck.slice(0, 5).map(c => c?.name),
      otherDeck: otherDeck.slice(0, 5).map(c => c?.name)
    });
  }
  
  const maxVisible = 10;
  const visibleCount = Math.min(deckSize, maxVisible);
  
  stack.innerHTML = '';
  
  // Add a data attribute to help debug
  stack.dataset.owner = owner;
  stack.dataset.deckSize = deckSize;
  stack.dataset.firstCard = deckFirstCard || 'none';
  
  for (let i = 0; i < visibleCount; i++) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    // Add data attributes for debugging
    card.dataset.index = i;
    card.dataset.owner = owner;
    if (deck[i]) {
      card.dataset.cardName = deck[i].name;
      card.title = `${deck[i].name} (${owner})`;
    }
    stack.appendChild(card);
  }
  
  if (deckSize === 0) {
    stack.style.opacity = '0';
  } else {
    stack.style.opacity = '1';
  }
  
  // Verify the stack was updated correctly
  const renderedCards = stack.querySelectorAll('.deck-card');
  
  // Double-check we're rendering to the correct element
  const expectedParentId = owner === 'player1' ? 'player1' : 'player2';
  const actualParentId = stack.parentElement?.id;
  if (actualParentId !== expectedParentId) {
    console.error(`ERROR: updateDeckStack(${owner}) - Stack is in wrong parent!`, {
      owner,
      stackId,
      expectedParent: expectedParentId,
      actualParent: actualParentId,
      stackElement: stack
    });
  }
  
  // Verify the other stack is different
  const otherStackId = owner === 'player1' ? 'p2DeckStack' : 'p1DeckStack';
  const otherStack = document.getElementById(otherStackId);
  if (otherStack) {
    const otherRenderedCards = otherStack.querySelectorAll('.deck-card');
    const otherFirstCard = otherDeck[0]?.name;
  }
}

export function updateDeckBubbles() {
  const p1Bubble = document.getElementById('p1Bubble');
  const p2Bubble = document.getElementById('p2Bubble');
  const p1DeckLength = globalThis.playerState?.player1?.deck?.length || 0;
  const p2DeckLength = globalThis.playerState?.player2?.deck?.length || 0;
  const p1DeckFirst = globalThis.playerState?.player1?.deck?.[0]?.name;
  const p2DeckFirst = globalThis.playerState?.player2?.deck?.[0]?.name;
  
  if (p1Bubble) p1Bubble.textContent = p1DeckLength;
  if (p2Bubble) p2Bubble.textContent = p2DeckLength;
  updateDeckStack('player1');
  updateDeckStack('player2');
}

export function updateHandBubbles() {
  const p1HandBubble = document.getElementById('p1HandBubble');
  const p2HandBubble = document.getElementById('p2HandBubble');
  if (p1HandBubble) p1HandBubble.textContent = globalThis.playerState?.player1?.hand?.length || 0;
  if (p2HandBubble) p2HandBubble.textContent = globalThis.playerState?.player2?.hand?.length || 0;
}

export function updateDiscardBubbles() {
  const p1DiscardBubble = document.getElementById('p1DiscardBubble');
  const p2DiscardBubble = document.getElementById('p2DiscardBubble');
  const p1Discard = globalThis.playerState?.player1?.discard || {};
  const p2Discard = globalThis.playerState?.player2?.discard || {};
  const p1Count = (p1Discard.cards?.length || 0) + (Object.values(p1Discard.energyCounts || {}).reduce((a, b) => a + b, 0));
  const p2Count = (p2Discard.cards?.length || 0) + (Object.values(p2Discard.energyCounts || {}).reduce((a, b) => a + b, 0));
  if (p1DiscardBubble) p1DiscardBubble.textContent = p1Count;
  if (p2DiscardBubble) p2DiscardBubble.textContent = p2Count;
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
  // Handle jQuery objects
  const actualDiv = div && div.jquery ? div[0] : div;
  if (!actualDiv) {
    console.error('renderHand: div is null or invalid', { div, cards });
    return;
  }
  
  const owner = actualDiv.id === 'p1Hand' ? 'player1' : 'player2';
  
  // Create a copy of cards array to ensure we're not sharing references
  const cardsCopy = cards ? [...cards] : [];
  
  const selData = globalThis.__pokemonCommSelection;
  const isCommActive = globalThis.__pokemonCommActive && selData;
  
  const rareCandyData = globalThis.__rareCandySelection;
  const isRareCandyActive = globalThis.__rareCandyActive && rareCandyData;
  
  const htmlContent = (cardsCopy || []).map(c => {
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
  
  // Verify we're about to render to the correct div
  const expectedId = owner === 'player1' ? 'p1Hand' : 'p2Hand';
  if (actualDiv.id !== expectedId) {
    console.error(`ERROR in renderHand: Wrong div! Expected ${expectedId}, got ${actualDiv.id}`, {
      owner,
      actualDivId: actualDiv.id,
      expectedId,
      actualDivParent: actualDiv.parentElement?.id
    });
    return; // Don't render to the wrong div
  }
  
  // Verify this div is not the same as the other hand div
  const otherHandDiv = owner === 'player1' 
    ? (globalThis.p2HandDiv?.jquery ? globalThis.p2HandDiv[0] : globalThis.p2HandDiv) || document.getElementById('p2Hand')
    : (globalThis.p1HandDiv?.jquery ? globalThis.p1HandDiv[0] : globalThis.p1HandDiv) || document.getElementById('p1Hand');
  if (actualDiv === otherHandDiv) {
    console.error(`ERROR in renderHand: ${owner} div is the same as the other hand div!`, {
      owner,
      actualDivId: actualDiv.id,
      otherHandDivId: otherHandDiv?.id
    });
    return; // Don't render if divs are the same
  }
  
  actualDiv.innerHTML = htmlContent;
  
  const currentPlayer = globalThis.currentPlayer || '';
  const isSetupPhase = globalThis.isSetupPhase !== undefined ? globalThis.isSetupPhase : true;
  
  // Check if we're in local mode during setup
  const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
  const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
  const isOnline = matchId && (typeof window !== 'undefined' && window.firebaseDatabase);
  const isLocalSetup = !isOnline && isSetupPhase;
  
  // In local mode during setup, both players' cards should be interactive
  // Otherwise, only currentPlayer's cards are interactive
  if ((owner === currentPlayer || isLocalSetup) && !hide) {
    const handCards = actualDiv.querySelectorAll('.card-img');
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

let renderAllHandsTimeout = null;

export function renderAllHands() {
  // Debounce to prevent multiple rapid calls
  if (renderAllHandsTimeout) {
    clearTimeout(renderAllHandsTimeout);
  }
  
  renderAllHandsTimeout = setTimeout(() => {
    renderAllHandsImmediate();
  }, 0);
}

function renderAllHandsImmediate() {
  const currentPlayer = globalThis.currentPlayer || '';
  // Try multiple ways to get the hand divs
  let p1HandDiv = globalThis.p1HandDiv;
  let p2HandDiv = globalThis.p2HandDiv;
  
  // Handle jQuery objects
  if (p1HandDiv && p1HandDiv.jquery) p1HandDiv = p1HandDiv[0];
  if (p2HandDiv && p2HandDiv.jquery) p2HandDiv = p2HandDiv[0];
  
  // Fallback to direct DOM access
  if (!p1HandDiv) p1HandDiv = document.getElementById('p1Hand');
  if (!p2HandDiv) p2HandDiv = document.getElementById('p2Hand');
  
  const playerState = globalThis.playerState || {};
  
  // Check if we're in online mode
  const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
  const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
  const isOnline = matchId && (typeof window !== 'undefined' && window.firebaseDatabase);
  const isSetupPhase = globalThis.isSetupPhase !== undefined ? globalThis.isSetupPhase : true;
  
  // In local mode during setup, show both hands face up
  // In online mode, always hide opponent's hand
  let p1Hide, p2Hide;
  if (isOnline) {
    // Online mode: determine which UI player is the current user
    // For both host and joiner, their own hand is always UI player1
    // (host: match player1 = UI player1, joiner: match player2 = UI player1)
    // So we always show p1Hand and hide p2Hand in online mode
    const isCurrentUserPlayer1Fn = globalThis.isCurrentPlayer1;
    const isPlayer1InMatch = (isCurrentUserPlayer1Fn && typeof isCurrentUserPlayer1Fn === 'function') ? isCurrentUserPlayer1Fn() : false;
    
    // Both host and joiner see their own hand as UI player1 (bottom)
    // So p1Hand should always be visible, p2Hand should always be hidden
    p1Hide = false; // Current user's hand (always UI player1)
    p2Hide = true;  // Opponent's hand (always UI player2)
  } else {
    // Local mode: during setup, show both hands face up
    if (isSetupPhase) {
      p1Hide = false;
      p2Hide = false;
    } else {
      // After setup, hide opponent's hand
      p1Hide = currentPlayer === 'player2';
      p2Hide = currentPlayer === 'player1';
    }
  }
  
  // Ensure we have valid divs before rendering
  if (!p1HandDiv || !p2HandDiv) {
    console.error('renderAllHands: Missing hand divs!', {
      p1HandDiv,
      p2HandDiv,
      p1HandDivId: p1HandDiv?.id,
      p2HandDivId: p2HandDiv?.id
    });
    return;
  }
  
  // Create copies of the hand arrays to ensure we're not sharing references
  // Also verify the data is actually different before rendering
  const p1Hand = playerState.player1?.hand ? [...playerState.player1.hand] : [];
  const p2Hand = playerState.player2?.hand ? [...playerState.player2.hand] : [];
  
  const handsAreSame = JSON.stringify(p1Hand) === JSON.stringify(p2Hand);
  
  if (handsAreSame && p1Hand.length > 0) {
    console.error('ERROR: Both hands are identical in renderAllHands!', {
      p1Hand: p1Hand.map(c => c?.name),
      p2Hand: p2Hand.map(c => c?.name),
      playerStateP1Hand: playerState.player1?.hand?.map(c => c?.name),
      playerStateP2Hand: playerState.player2?.hand?.map(c => c?.name)
    });
  }
  
  // Verify we're rendering to the correct divs
  if (p1HandDiv.id !== 'p1Hand') {
    console.error('ERROR: p1HandDiv has wrong ID!', { expected: 'p1Hand', actual: p1HandDiv.id });
  }
  if (p2HandDiv.id !== 'p2Hand') {
    console.error('ERROR: p2HandDiv has wrong ID!', { expected: 'p2Hand', actual: p2HandDiv.id });
  }
  
  // Verify the divs are actually different elements
  if (p1HandDiv === p2HandDiv) {
    console.error('ERROR: p1HandDiv and p2HandDiv are the same element!', {
      p1HandDiv,
      p2HandDiv,
      id: p1HandDiv.id,
      p1HandDivParent: p1HandDiv.parentElement?.id,
      p2HandDivParent: p2HandDiv.parentElement?.id
    });
    return;
  }
  
  // Verify the divs are in the correct parent elements
  const p1Parent = p1HandDiv.parentElement;
  const p2Parent = p2HandDiv.parentElement;
  if (p1Parent && p1Parent.id !== 'player1') {
    console.error('ERROR: p1HandDiv is not in player1!', {
      p1HandDivId: p1HandDiv.id,
      parentId: p1Parent.id,
      expectedParent: 'player1'
    });
  }
  if (p2Parent && p2Parent.id !== 'player2') {
    console.error('ERROR: p2HandDiv is not in player2!', {
      p2HandDivId: p2HandDiv.id,
      parentId: p2Parent.id,
      expectedParent: 'player2'
    });
  }
  
  // Verify the hands are different before rendering
  if (handsAreSame && p1Hand.length > 0) {
    console.error('ERROR: Both hands are identical in renderAllHands!', {
      p1Hand: p1Hand.map(c => c?.name),
      p2Hand: p2Hand.map(c => c?.name),
      playerStateP1Hand: playerState.player1?.hand?.map(c => c?.name),
      playerStateP2Hand: playerState.player2?.hand?.map(c => c?.name)
    });
  }
  
  // Render player1 hand first, then verify it was set correctly
  renderHand(p1HandDiv, p1Hand, p1Hide);
  const p1AfterRender = p1HandDiv.querySelectorAll('.card-img');
  
  // Render player2 hand, then verify it was set correctly
  renderHand(p2HandDiv, p2Hand, p2Hide);
  const p2AfterRender = p2HandDiv.querySelectorAll('.card-img');
  
  // Final verification that both hands are different
  const p1FinalCards = Array.from(p1HandDiv.querySelectorAll('.card-img')).map(img => img.alt);
  const p2FinalCards = Array.from(p2HandDiv.querySelectorAll('.card-img')).map(img => img.alt);
  if (JSON.stringify(p1FinalCards) === JSON.stringify(p2FinalCards) && p1FinalCards.length > 0) {
    console.error('ERROR: After rendering, both hands show the same cards!', {
      p1FinalCards,
      p2FinalCards,
      p1HandDivId: p1HandDiv.id,
      p2HandDivId: p2HandDiv.id,
      p1HandDivParent: p1HandDiv.parentElement?.id,
      p2HandDivParent: p2HandDiv.parentElement?.id
    });
  }
  
  // In local mode during setup, both hands should be clickable
  // In online mode or after setup, disable clicks on opponent's hand
  let p1DisableClicks, p2DisableClicks;
  if (isOnline) {
    // Online mode: current user's hand is always UI player1 (bottom)
    // So p1Hand should always be clickable, p2Hand should never be clickable
    p1DisableClicks = false; // Current user's hand (always UI player1)
    p2DisableClicks = true;  // Opponent's hand (always UI player2)
  } else {
    // Local mode: during setup, both hands are clickable
    if (isSetupPhase) {
      p1DisableClicks = false;
      p2DisableClicks = false;
    } else {
      // After setup, disable clicks on opponent's hand
      p1DisableClicks = currentPlayer === 'player2';
      p2DisableClicks = currentPlayer === 'player1';
    }
  }
  
  if (p1HandDiv) p1HandDiv.classList.toggle('disable-clicks', p1DisableClicks);
  if (p2HandDiv) p2HandDiv.classList.toggle('disable-clicks', p2DisableClicks);
  updateHandBubbles();
}

export function renderDiscard(owner) {
  const drawerId = owner === 'player1' ? 'p1DiscardDrawer' : 'p2DiscardDrawer';
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  
  const playerState = globalThis.playerState || {};
  const discard = playerState[owner]?.discard || {};
  const cards = discard.cards || [];
  const energyCounts = discard.energyCounts || {};
  
  // Calculate total count safely
  const energyTotal = energyCounts && typeof energyCounts === 'object' 
    ? Object.values(energyCounts).reduce((a, b) => (a || 0) + (b || 0), 0)
    : 0;
  const totalCount = cards.length + energyTotal;
  
  drawer.innerHTML = `
    <h3 style="margin:10px 0 6px;">
      ${owner === 'player1' ? 'Player 1' : 'Player 2'} Discard (${totalCount})
    </h3>
    <button style="margin-bottom:10px" onclick="document.getElementById('${drawerId}').classList.remove('show'); if(typeof updateDiscardDrawerPositions === 'function') updateDiscardDrawerPositions();">Close</button>
  `;
  const energiesRow = document.createElement('div');
  energiesRow.style.display = 'flex';
  energiesRow.style.flexDirection = 'column';
  if (energyCounts && typeof energyCounts === 'object') {
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
  }
  drawer.appendChild(energiesRow);
  cards.forEach(c => {
    const row = document.createElement('div');
    row.className = 'discard-item';
    const im = document.createElement('img');
    im.src = c.src;
    row.appendChild(im);
    drawer.appendChild(row);
  });
  updateDiscardBubbles();
}

export function renderEnergyZone() {
  const energyZoneDiv = globalThis.energyZoneDiv || document.getElementById('energyZone');
  if (!energyZoneDiv) return;
  
  // Check if we're in online mode
  const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
  const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
  const isOnline = matchId && (typeof window !== 'undefined' && window.firebaseDatabase);
  
  // In online mode, always use UI player1 (current user) for energy display
  // In local mode, use currentPlayer (whose turn it is)
  const energyPlayer = isOnline ? 'player1' : (globalThis.currentPlayer || '');
  const playerState = globalThis.playerState || {};
  const state = playerState[energyPlayer] || {};
  const energyTypes = state.energyTypes || [];
  const currentEnergy = state.currentTurnEnergy || (energyTypes.length > 0 ? energyTypes[0] : null);
  const nextEnergy = state.nextTurnEnergy || (energyTypes.length > 0 ? energyTypes[0] : null);
  
  // For turn checking, use currentPlayer (whose turn it is)
  const currentPlayer = globalThis.currentPlayer || '';
  
  energyZoneDiv.innerHTML = '';

  // In online mode, only enable energy zone for UI player1 (current user) when it's their turn
  // UI player1 is always the current user in online mode
  let isMyTurn = true; // Default to true for local mode
  if (isOnline) {
    // In online mode, UI player1 is always "you", so check if currentPlayer is 'player1'
    isMyTurn = currentPlayer === 'player1';
  }

  const disable =
    !isMyTurn || // Not your turn (online mode only)
    (globalThis.turnNumber === 1) || // Turn 1 restriction - disable for both players on turn 1
    globalThis.hasAttachedEnergyThisTurn; // Already attached energy this turn

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

