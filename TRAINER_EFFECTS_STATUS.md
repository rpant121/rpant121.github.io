# Trainer Effects Implementation Status

This document lists all trainer effects and their implementation status in the V2 online battle system.

## ✅ Fully Working (State-Only Effects)

These effects work because they only modify deck/hand/discard arrays:

1. **draw_cards** - Draw N cards from deck
2. **shuffle_hand_draw** - Shuffle hand into deck, draw N cards
3. **shuffle_opponent_hand_draw** - Shuffle opponent's hand, draw N cards
4. **search_basic_pokemon** - Search deck for Basic Pokémon, add to hand
5. **search_named_random** - Search deck for named Pokémon, add to hand
6. **shuffle_hand_draw_match_opponent** - Shuffle hand, draw same number as opponent
7. **shuffle_both_hands_draw_same** - Both players shuffle hands, draw same number
8. **reveal_opponent_hand** - Show opponent's hand (read-only)
9. **copy_random_opponent_supporter** - Copy random supporter from opponent's hand
10. **shuffle_opponent_hand** - Shuffle opponent's hand into deck
11. **shuffle_random_from_both_hands** - Shuffle random cards from both hands

## ⚠️ Partially Working (May Need Testing)

These effects modify state but may need additional work:

1. **boost_all_damage** - Sets temp damage boost (needs attack system integration)
2. **boost_damage_type_targets** - Sets temp damage boost by name (needs attack system integration)
3. **reduce_retreat_cost** - Sets temp retreat reduction (needs retreat system integration)
4. **reduce_all_incoming_damage_next_turn** - Sets temp damage reduction (needs damage calculation integration)
5. **reduce_type_incoming_damage_next_turn** - Sets temp type damage reduction
6. **boost_damage_vs_ex** - Sets temp damage boost vs EX Pokémon
7. **boost_damage_per_point** - Sets temp damage boost per prize card
8. **guarantee_coin_flip** - Sets temp coin flip guarantee (needs coin flip system integration)

## ❌ Not Working (Require DOM Manipulation)

These effects require DOM manipulation functions that don't exist in V2:

### Healing Effects
1. **heal** - Heals active Pokémon (uses `healImg`, `getActiveImg`)
2. **heal_type** - Heals type Pokémon with selection (uses `getAllPokemonImgs`, `awaitSelection`, `healImg`)
3. **heal_all_with_type_energy** - Heals all Pokémon with type energy
4. **heal_and_cure_status** - Heals and removes status
5. **heal_active_and_cure_random_status** - Heals active and cures random status
6. **heal_named** - Heals named Pokémon
7. **heal_stage** - Heals stage Pokémon
8. **heal_full_discard_energy_named** - Heals full HP, discards energy from named
9. **heal_self** - Self-heal (attack effect, but listed here)
10. **heal_equal_to_damage_done** - Heals equal to damage (attack effect)
11. **heal_if_half_hp_tool** - Tool that heals if HP is half
12. **heal_active_end_of_turn_tool** - Tool that heals active end of turn

### Energy Attachment Effects
1. **flip_attach_energy** - Coin flip to attach energy (uses `getAllPokemonImgs`, `awaitSelection`, `attachEnergy`, `flipCoin`)
2. **attach_energy_to_targets** - Attach energy to named targets (uses `getAllPokemonImgs`, `attachEnergy`)
3. **attach_from_discard_to_targets** - Attach energy from discard to targets
4. **attach_energy_to_targets_end_turn** - Attach energy end of turn
5. **attach_energy_to_named** - Attach energy to named Pokémon
6. **attach_from_discard_to_active** - Attach energy from discard to active
7. **attach_from_discard_ultra_beast_if_points** - Attach energy if prize cards taken

### Energy Movement Effects
1. **move_all_energy_type** - Move all energy of type (uses `getActiveImg`, `getBenchImgs`, `moveEnergy`)
2. **move_energy_bench_to_active** - Move energy from bench to active
3. **move_energy_type_multiple** - Move energy type multiple times
4. **move_energy_on_knockout_tool** - Tool that moves energy on KO

### Switching/Promotion Effects
1. **force_opponent_switch** - Forces opponent to switch (uses `promoteFromBench`)
2. **force_opponent_switch_if_named** - Forces switch if named Pokémon
3. **force_opponent_switch_basic** - Forces switch to basic
4. **force_switch_damaged_bench** - Forces switch to damaged bench
5. **switch_active** - Switch active Pokémon
6. **return_active_to_hand** - Return active to hand (uses `getActiveImg`, `getSlotFromImg`, `beginPromotionFlow`)
7. **return_damaged_type_to_hand** - Return damaged type to hand

### Deck Viewing/Reordering Effects
1. **view_top_deck** - View top N cards with reordering UI (uses `getAllPokemonImgs`, complex DOM modal)
2. **peek_topdeck_type** - Peek top deck for type
3. **peek_topdeck_optional_shuffle** - Peek top deck, optionally shuffle
4. **reorder_opponent_deck** - Reorder opponent's deck

### Search Effects (Requiring Selection)
1. **search_pokemon_then_shuffle** - Search Pokémon with selection UI
2. **search_basic_pokemon_hp_limit** - Search basic with HP limit
3. **search_tools_into_hand** - Search tools into hand

### Revival Effects
1. **revive_opponent_pokemon** - Revive opponent's Pokémon
2. **revive_basic_to_hand** - Revive basic to hand
3. **revive_type_to_hand** - Revive type to hand
4. **flip_revive_from_discard** - Coin flip to revive from discard
5. **rescue_to_hand** - Rescue Pokémon to hand

### Tool Effects
1. **increase_max_hp** - Increase max HP (uses DOM manipulation)
2. **increase_max_hp_type** - Increase max HP for type
3. **counter_on_hit_tool** - Counter damage on hit
4. **counter_inflict_status_tool** - Counter inflict status
5. **cure_status_end_of_turn** - Cure status end of turn
6. **discard_all_opponent_tools** - Discard all opponent tools
7. **draw_on_ko_tool** - Draw cards on KO (tool)
8. **flip_avoid_ko_named** - Coin flip to avoid KO
9. **reduce_incoming_damage** - Reduce incoming damage
10. **reduce_incoming_damage_if_high_retreat** - Reduce damage if high retreat cost
11. **reduce_attack_cost_targets** - Reduce attack cost for targets

### Status Effects
1. **inflict_status** - Inflict status condition
2. **inflict_paralysis** - Inflict paralysis
3. **inflict_sleep** - Inflict sleep
4. **inflict_poison** - Inflict poison
5. **inflict_burn** - Inflict burn
6. **inflict_confusion** - Inflict confusion
7. **flip_inflict_status_if_heads** - Coin flip to inflict status
8. **flip_inflict_effect_if_heads** - Coin flip to inflict effect

### Damage/Discard Effects
1. **discard_energy_type_from_opponent** - Discard energy type from opponent
2. **flip_discard_energy_until_tails** - Coin flip discard energy
3. **flip_discard_energy_double_heads** - Double heads to discard energy
4. **transfer_damage_named_to_opponent** - Transfer damage to opponent

### Special Effects
1. **summon_fossil_pokemon** - Summon fossil Pokémon
2. **switch_card_in_hand_with_deck** - Switch card in hand with deck
3. **eevee_boost_or_heal** - Eevee boost or heal
4. **use_previous_evolution_attacks** - Use previous evolution attacks
5. **reveal_opponent_supporters** - Reveal opponent's supporters

### Attack Effects (Not Trainer Effects, but listed for completeness)
These are attack effects, not trainer effects, but they're in the same file:
- All `bonus_damage_*` effects
- All `flip_*` attack effects
- All `heal_*` attack effects
- `cant_attack_next_turn`
- `inflict_effect`

## Summary

- **Working**: ~11 effects (state-only modifications)
- **Partially Working**: ~8 effects (state modifications, need system integration)
- **Not Working**: ~80+ effects (require DOM manipulation or complex UI)

## Next Steps

To make more effects work, we need to:

1. **Create V2-compatible versions** of DOM manipulation functions:
   - `healImg` → Update `pokemon.chp` in gameState
   - `attachEnergy` → Update `pokemon.energy` array in gameState
   - `getActiveImg` → Get `player.active` from gameState
   - `getAllPokemonImgs` → Get `player.active` + `player.bench` from gameState
   - `awaitSelection` → Create selection UI that works with V2 state
   - `flipCoin` → Create coin flip UI that works with V2
   - `moveEnergy` → Update energy arrays in gameState

2. **Create selection UI system** for effects that require target selection

3. **Create coin flip UI system** for effects that require coin flips

4. **Integrate status conditions** into the V2 state system

5. **Integrate damage calculation** with temp modifiers (boosts, reductions)

