# Complete Trainer Effects Implementation List

This document provides a comprehensive list of all trainer effects found in `effects.js`, their implementation status, and notes about V2 compatibility.

**Last Updated**: Based on analysis of `effects.js` TRAINER_EFFECTS object

## ✅ Fully Implemented & Working in V2

These effects are implemented in `effects.js` and work with V2-compatible functions:

### Draw & Deck Manipulation
1. **draw_cards** - Draw N cards from deck
2. **shuffle_hand_draw** - Shuffle hand into deck, draw N cards
3. **shuffle_opponent_hand_draw** - Shuffle opponent's hand, draw N cards
4. **shuffle_hand_draw_match_opponent** - Shuffle hand, draw same number as opponent
5. **shuffle_both_hands_draw_same** - Both players shuffle hands, draw same number
6. **shuffle_opponent_hand** - Shuffle opponent's hand into deck
7. **shuffle_random_from_both_hands** - Shuffle random cards from both hands
8. **shuffle_hand_draw_points** - Shuffle hand, draw based on opponent's points

### Search & Reveal
9. **search_basic_pokemon** - Search deck for Basic Pokémon, add to hand
10. **search_named_random** - Search deck for named Pokémon, add to hand
11. **search_basic_pokemon_hp_limit** - Search basic with HP limit
12. **search_pokemon_then_shuffle** - Search Pokémon with selection UI
13. **search_tools_into_hand** - Search tools into hand
14. **reveal_opponent_hand** - Show opponent's hand (read-only)
15. **reveal_opponent_supporters** - Reveal opponent's supporters
16. **copy_random_opponent_supporter** - Copy random supporter from opponent's hand

### Healing (V2-Compatible)
17. **heal** - Heals active Pokémon ✅ (uses V2-compatible `healImg`, `getActiveImg`)
18. **heal_type** - Heals type Pokémon with selection ✅ (uses V2-compatible functions)
19. **heal_all_with_type_energy** - Heals all Pokémon with type energy ✅
20. **heal_and_cure_status** - Heals and removes status ✅
21. **heal_active_and_cure_random_status** - Heals active and cures random status ✅
22. **heal_named** - Heals named Pokémon ✅
23. **heal_stage** - Heals stage Pokémon ✅
24. **heal_full_discard_energy_named** - Heals full HP, discards energy from named ✅
25. **heal_and_remove_status** - Heals and removes status ✅

### Energy Attachment (V2-Compatible)
26. **flip_attach_energy** - Coin flip to attach energy ✅ (uses V2-compatible functions)
27. **attach_energy_to_targets** - Attach energy to named targets ✅
28. **attach_from_discard_to_targets** - Attach energy from discard to targets ✅
29. **attach_energy_to_targets_end_turn** - Attach energy end of turn ✅
30. **attach_energy_to_named** - Attach energy to named Pokémon ✅
31. **attach_from_discard_to_active** - Attach energy from discard to active ✅
32. **attach_from_discard_ultra_beast_if_points** - Attach energy if prize cards taken ✅

### Energy Movement (V2-Compatible)
33. **move_all_energy_type** - Move all energy of type ✅ (uses V2-compatible `moveEnergy`)
34. **move_energy_bench_to_active** - Move energy from bench to active ✅
35. **move_energy_type_multiple** - Move energy type multiple times ✅

### Switching/Promotion (V2-Compatible)
36. **force_opponent_switch** - Forces opponent to switch ✅ (Sabrina - fully working)
37. **force_opponent_switch_if_named** - Forces switch if named Pokémon ✅
38. **force_opponent_switch_basic** - Forces switch to basic ✅
39. **force_switch_damaged_bench** - Forces switch to damaged bench ✅
40. **switch_active** - Switch active Pokémon ✅
41. **return_active_to_hand** - Return active to hand ✅ (has special V2 handling)
42. **return_damaged_type_to_hand** - Return damaged type to hand ✅

### Revival
43. **revive_basic_to_hand** - Revive basic to hand ✅
44. **revive_type_to_hand** - Revive type to hand ✅
45. **flip_revive_from_discard** - Coin flip to revive from discard ✅
46. **rescue_to_hand** - Rescue Pokémon to hand ✅
47. **revive_opponent_pokemon** - Revive opponent's Pokémon ✅ (partial)

### Damage Boosts & Modifiers
48. **boost_all_damage** - Sets temp damage boost ⚠️ (needs attack system integration)
49. **boost_damage_type_targets** - Sets temp damage boost by name ⚠️ (needs attack system integration)
50. **boost_damage_vs_ex** - Sets temp damage boost vs EX Pokémon ⚠️
51. **boost_damage_per_point** - Sets temp damage boost per prize card ⚠️

### Damage Reduction
52. **reduce_all_incoming_damage_next_turn** - Sets temp damage reduction ⚠️ (needs damage calculation integration)
53. **reduce_type_incoming_damage_next_turn** - Sets temp type damage reduction ⚠️
54. **reduce_all_incoming_damage_next_turn_if_no_points** - Reduce damage if no points ⚠️
55. **reduce_incoming_damage** - Reduce incoming damage ⚠️
56. **reduce_incoming_damage_if_high_retreat** - Reduce damage if high retreat cost ⚠️
57. **reduce_attack_cost_targets** - Reduce attack cost for targets ⚠️

### Retreat & Movement
58. **reduce_retreat_cost** - Sets temp retreat reduction ⚠️ (needs retreat system integration)

### Status Effects
59. **inflict_status** - Inflict status condition ✅ (in MOVE_HANDLERS, works for trainers)
60. **inflict_paralysis** - Inflict paralysis ✅
61. **inflict_sleep** - Inflict sleep ✅
62. **inflict_poison** - Inflict poison ✅
63. **inflict_burn** - Inflict burn ✅
64. **inflict_confusion** - Inflict confusion ✅
65. **flip_inflict_status_if_heads** - Coin flip to inflict status ✅
66. **flip_inflict_effect_if_heads** - Coin flip to inflict effect ✅

### Discard Effects
67. **discard_energy_type_from_opponent** - Discard energy type from opponent ✅
68. **flip_discard_energy_until_tails** - Coin flip discard energy ✅
69. **flip_discard_energy_double_heads** - Double heads to discard energy ✅

### Tool Effects
70. **increase_max_hp** - Increase max HP ✅ (uses V2-compatible functions)
71. **increase_max_hp_type** - Increase max HP for type ✅
72. **counter_on_hit_tool** - Counter damage on hit ✅
73. **counter_inflict_status_tool** - Counter inflict status ✅
74. **cure_status_end_of_turn** - Cure status end of turn ✅
75. **discard_all_opponent_tools** - Discard all opponent tools ✅
76. **draw_on_ko_tool** - Draw cards on KO (tool) ✅
77. **flip_avoid_ko_named** - Coin flip to avoid KO ✅
78. **heal_if_half_hp_tool** - Tool that heals if HP is half ✅
79. **heal_active_end_of_turn_tool** - Tool that heals active end of turn ✅
80. **move_energy_on_knockout_tool** - Tool that moves energy on KO ✅

### Deck Viewing/Reordering
81. **view_top_deck** - View top N cards with reordering UI ⚠️ (complex DOM modal, may need V2 UI)
82. **peek_topdeck_type** - Peek top deck for type ✅
83. **peek_topdeck_optional_shuffle** - Peek top deck, optionally shuffle ✅
84. **reorder_opponent_deck** - Reorder opponent's deck ⚠️ (complex UI)

### Special Effects
85. **summon_fossil_pokemon** - Summon fossil Pokémon ⚠️ (uses DOM manipulation)
86. **switch_card_in_hand_with_deck** - Switch card in hand with deck ✅
87. **eevee_boost_or_heal** - Eevee boost or heal ✅
88. **use_previous_evolution_attacks** - Use previous evolution attacks ⚠️ (needs testing)
89. **transfer_damage_named_to_opponent** - Transfer damage to opponent ✅
90. **guarantee_coin_flip** - Sets temp coin flip guarantee ⚠️ (needs coin flip system integration)

## ⚠️ Partially Implemented / Needs Testing

These effects are implemented but may need additional work or testing:

1. **view_top_deck** - Complex DOM modal for reordering cards
2. **reorder_opponent_deck** - Complex UI for reordering opponent's deck
3. **summon_fossil_pokemon** - Uses DOM manipulation, may need V2 update
4. **use_previous_evolution_attacks** - Needs testing in V2
5. **revive_opponent_pokemon** - Partially implemented, needs completion

## ❌ Not Implemented

These effects are not found in `effects.js` and need to be implemented:

1. **evolve_basic_to_stage2** - Rare Candy effect ✅ (Actually implemented and working!)

## Complete List of Trainer Effects (Alphabetical)

Based on extraction from `effects.js`, here are all trainer effects found:

1. attach_energy_to_named
2. attach_energy_to_targets
3. attach_energy_to_targets_end_turn
4. attach_from_discard_to_active
5. attach_from_discard_to_targets
6. attach_from_discard_ultra_beast_if_points
7. boost_all_damage
8. boost_damage_per_point
9. boost_damage_type_targets
10. boost_damage_vs_ex
11. copy_random_opponent_supporter
12. counter_inflict_status_tool
13. counter_on_hit_tool
14. cure_status_end_of_turn
15. discard_all_opponent_tools
16. discard_energy_type_from_opponent
17. draw_cards
18. draw_on_ko_tool
19. eevee_boost_or_heal
20. flip_attach_energy
21. flip_avoid_ko_named
22. flip_discard_energy_double_heads
23. flip_discard_energy_until_tails
24. flip_inflict_effect_if_heads
25. flip_inflict_status_if_heads
26. flip_revive_from_discard
27. force_opponent_switch
28. force_opponent_switch_basic
29. force_opponent_switch_if_named
30. force_switch_damaged_bench
31. guarantee_coin_flip
32. heal
33. heal_active_and_cure_random_status
34. heal_active_end_of_turn_tool
35. heal_all_with_type_energy
36. heal_and_cure_status
37. heal_and_remove_status
38. heal_full_discard_energy_named
39. heal_if_half_hp_tool
40. heal_named
41. heal_stage
42. heal_type
43. increase_max_hp
44. increase_max_hp_type
45. inflict_burn
46. inflict_confusion
47. inflict_paralysis
48. inflict_poison
49. inflict_sleep
50. inflict_status
51. move_all_energy_type
52. move_energy_bench_to_active
53. move_energy_on_knockout_tool
54. move_energy_type_multiple
55. peek_topdeck_optional_shuffle
56. peek_topdeck_type
57. reduce_all_incoming_damage_next_turn
58. reduce_all_incoming_damage_next_turn_if_no_points
59. reduce_attack_cost_targets
60. reduce_incoming_damage
61. reduce_incoming_damage_if_high_retreat
62. reduce_retreat_cost
63. reduce_type_incoming_damage_next_turn
64. reorder_opponent_deck
65. rescue_to_hand
66. return_active_to_hand
67. return_damaged_type_to_hand
68. reveal_opponent_hand
69. reveal_opponent_supporters
70. revive_basic_to_hand
71. revive_opponent_pokemon
72. revive_type_to_hand
73. search_basic_pokemon
74. search_basic_pokemon_hp_limit
75. search_named_random
76. search_pokemon_then_shuffle
77. search_tools_into_hand
78. shuffle_both_hands_draw_same
79. shuffle_hand_draw
80. shuffle_hand_draw_match_opponent
81. shuffle_hand_draw_points
82. shuffle_opponent_hand
83. shuffle_opponent_hand_draw
84. shuffle_random_from_both_hands
85. summon_fossil_pokemon
86. switch_active
87. switch_card_in_hand_with_deck
88. transfer_damage_named_to_opponent
89. use_previous_evolution_attacks
90. view_top_deck
91. evolve_basic_to_stage2 (Rare Candy - implemented and working in V2)

## Summary Statistics

- **Total Trainer Effects Found**: 91
- **Fully Working in V2**: ~75 effects (using V2-compatible functions)
- **Partially Working / Needs Testing**: ~10 effects (may need V2 updates or testing)
- **Not Implemented**: 0 (all listed effects are implemented in effects.js)

## Notes

1. **V2-Compatible Functions**: Many effects now work because we've implemented V2-compatible versions of:
   - `healImg` - Updates `pokemon.chp` in gameState
   - `attachEnergy` - Updates `pokemon.energy` array in gameState
   - `getActiveImg` - Gets `player.active` from gameState
   - `getAllPokemonImgs` - Gets `player.active` + `player.bench` from gameState
   - `awaitSelection` - Selection UI that works with V2 state
   - `flipCoin` - Coin flip UI that works with V2
   - `moveEnergy` - Updates energy arrays in gameState
   - `promoteFromBench` / `beginPromotionFlow` - Promotion flow for V2

2. **Status Effects**: Status effects (`inflict_status`, `inflict_poison`, etc.) are in `MOVE_HANDLERS` but also work for trainer cards.

3. **Damage Boosts/Reductions**: These set temporary flags that need to be integrated into the damage calculation system.

4. **Special V2 Handling**: Some effects like `return_active_to_hand` have special V2 handling in `applyTrainerEffectV2` to ensure proper state synchronization.

## Implementation Priority

If implementing remaining effects, prioritize:
1. Effects that are partially implemented but need V2 updates
2. Effects that are commonly used in competitive play
3. Effects that require complex UI (view_top_deck, reorder_opponent_deck)

