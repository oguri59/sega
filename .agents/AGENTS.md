# AI Agent Instructions for Sacred Guard Damage Calculator

This project is a premium client-side web calculator for the Mabinogi Arcana talent: **Sacred Guard (세이크리드 가드)**. 
Use this file as a style guide and reference when modifying calculations, UI structure, or data systems.

---

## 📂 Project Architecture

- `index.html`: Holds the application layout. Built with a responsive card-based CSS Grid layout using premium dark themes.
- `css/style.css`: Contains CSS variables, typography, layouts, scrollbars, micro-animations, and theme gradients for each skill card type.
- `js/data.js`: Holds raw metadata for:
  - `TARGET_DATA`: Monster names, protection, defense, and piercing resistance.
  - `WEAPON_DATA`: Weapon categories, description updates, and skill multipliers (Smash, Bash).
  - `SHIELD_DATA`: Shield descriptions, damage reduction rates (DRR), and bonus damage.
- `js/calculator.js`: The core calculation and event management engine. Handles DOM inputs gathering, formulas execution, HTML rendering, local storage state saving, and expandable card toggle events.

---

## 🧮 Core Formula & Calculation Rules

### 1. Stats and Multipliers Order
- **Erg and Dark Erg**: Reforges, Erg, and Dark Erg multipliers must be added in the *same phase* before executing main skill multipliers or link multipliers.
  - *Example (Windmill)*: `baseWindmillMult = RankValue + 0.03 * Reforge + (Erg / 100) + (DarkErg / 100)`.
- **Doping and Potion**: Potion buff (20% physical attack power) and Battlefield Overture (BFO) are applied to the final Max Damage calculation.
- **MOMO and Death Marker**: Applied as independent multiplicative final damage factors at the very end of the final damage calculation.

### 2. Arcana Skill Formulas
- **Sanctuary (성역 전개)**: 
  - `Base = MaxDmg * 3.0 + Defense * 1.5 + HP * 0.20`
  - Arcana Link bonus: Final Damage is multiplied by `2.0` (100% increase).
- **Ironwall Strike (철벽 강타)**:
  - `Base = ( (WindmillDmg * 1.5) * NormalBonusDmg + (MaxDmg * 12.0 + Defense * 6.0 + HP * 1.0) ) * ArcanaBonusDmg`
- **Condemnation (단죄의 일격)**:
  - **1 Stage**: `Base = ( (WindmillDmg * 1.75) * NormalBonusDmg + (MaxDmg * 15.0 + Defense * 9.0 + HP * 1.5) ) * ArcanaBonusDmg`
  - **2 Stage**: `Base = ( (WindmillDmg * 1.75) * NormalBonusDmg + (MaxDmg * 22.5 + Defense * 13.5 + HP * 2.25) ) * ArcanaBonusDmg`
  - **3 Stage**: `Base = ( (WindmillDmg * 1.75) * NormalBonusDmg + (MaxDmg * 30.0 + Defense * 18.0 + HP * 3.0) ) * ArcanaBonusDmg`
- **Judgment Strike (심판의 일격)**:
  - Max Damage coefficient increases by `+100%` per Relic Level (up to `+1000%` at Level 10, additive).
  - `Base = ( (WindmillDmg * 2.0) * NormalBonusDmg + (MaxDmg * (35.0 + RelicLevel * 1.0) + Defense * 20.0 + HP * 5.0) ) * ArcanaBonusDmg`
  - Arcana Link bonus: Final Damage is multiplied by `1.2` (20% increase).
- **Clash (격돌)**:
  - `Base = ( (ChargeDmg * 1.5) * NormalBonusDmg + (MaxDmg * 8.0 + Defense * 6.0 + HP * 0.5) ) * ArcanaBonusDmg`
- **Retribution (희생의 응징)**:
  - `Base = (MaxDmg * 60.0 + Defense * 40.0 + HP * 15.0) * (1 + Shield_DRR / 100)`
  - Arcana Link bonus: Final Damage is multiplied by `1.15` (15% increase).
  - Trace of Reflection (성찰의 흔적) buff is **always active** for Retribution regardless of the UI checkbox setting.

### 3. Trace of Reflection (성찰의 흔적)
- base buff: `1.10` (10% damage multiplier).
- Relic Retribution Bonus: Adds `+0.5%` per level (up to `+5.0%` at Level 10).
- Applies to all Arcana active skills if `#buff-reflection-trace` is checked, and **always** applies to Retribution.

---

## 🖥️ UI & Interaction Guidelines

### 1. Expandable Breakdown inside Cards
- All skill result cards have a `.card-main-content` wrapper and a `.card-breakdown` container.
- Clicking a card toggles `expanded` class on the card and removes `hidden` from the breakdown container.
- Accordion Behavior: When a card expands, all other expanded cards are collapsed.
- Detailed step-by-step math explanations are rendered inside `card-breakdown` elements dynamically by `calculate()`.

### 2. Local Storage Build Manager
- Inputs State: Captured dynamically using `getBuildInputs()`.
- Load State: Restored dynamically using `restoreBuildInputs(state)`.
- Global functions: Action handlers (`loadBuild`, `setCompareBase`, `deleteBuild`) are bound to the `window` object to allow `onclick="..."` calls from dynamically rendered HTML.
- Active compare targets are highlighted in the list and compare badges (`+X.X%` / `-Y.Y%`) are calculated in real time relative to the selected benchmark.

### 3. Styling Constraints
- Always preserve premium styling variables (`--gold`, `--gold-glow`, HSL colors, etc.).
- Native `<select>` element dropdowns must style their option children globally (`select option { background-color: #1a1525; color: #ffffff; }`) to prevent black-on-black or white-on-white text rendering bugs in Chromium-based browsers.
- Never use inline layout styles for cards or inputs; utilize modular layout helper classes.
