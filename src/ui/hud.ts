/**
 * HUD bar: top bar showing energy, coins, stars, gems, and level (T3.10).
 */

import './hud.css';
import type { GameStore } from './store';
import { hudModel } from './hudModel';

export function mountHud(
  hud: HTMLElement,
  store: GameStore,
  clock: () => number,
): void {
  // Clear any existing content
  hud.innerHTML = '';

  // Create main container
  const container = document.createElement('div');
  container.className = 'hud-container';

  // ─── Energy section ─────────────────────────────────────────────
  const energySection = document.createElement('div');
  energySection.className = 'hud-section hud-energy';

  const energyLabel = document.createElement('div');
  energyLabel.className = 'hud-label';
  energyLabel.textContent = 'Energy';

  const energyValue = document.createElement('div');
  energyValue.className = 'hud-value';
  energyValue.setAttribute('aria-label', 'Energy');

  const energyCountdown = document.createElement('div');
  energyCountdown.className = 'hud-countdown';
  energyCountdown.setAttribute('aria-label', 'Time to next energy');

  energySection.appendChild(energyLabel);
  energySection.appendChild(energyValue);
  energySection.appendChild(energyCountdown);

  // ─── Coins section ──────────────────────────────────────────────
  const coinsSection = document.createElement('div');
  coinsSection.className = 'hud-section hud-currency';

  const coinsLabel = document.createElement('div');
  coinsLabel.className = 'hud-label';
  coinsLabel.textContent = 'Coins';

  const coinsValue = document.createElement('div');
  coinsValue.className = 'hud-value';
  coinsValue.setAttribute('aria-label', 'Coins');

  coinsSection.appendChild(coinsLabel);
  coinsSection.appendChild(coinsValue);

  // ─── Stars section ──────────────────────────────────────────────
  const starsSection = document.createElement('div');
  starsSection.className = 'hud-section hud-currency';

  const starsLabel = document.createElement('div');
  starsLabel.className = 'hud-label';
  starsLabel.textContent = 'Stars';

  const starsValue = document.createElement('div');
  starsValue.className = 'hud-value';
  starsValue.setAttribute('aria-label', 'Stars');

  starsSection.appendChild(starsLabel);
  starsSection.appendChild(starsValue);

  // ─── Gems section ───────────────────────────────────────────────
  const gemsSection = document.createElement('div');
  gemsSection.className = 'hud-section hud-currency';

  const gemsLabel = document.createElement('div');
  gemsLabel.className = 'hud-label';
  gemsLabel.textContent = 'Gems';

  const gemsValue = document.createElement('div');
  gemsValue.className = 'hud-value';
  gemsValue.setAttribute('aria-label', 'Gems');

  gemsSection.appendChild(gemsLabel);
  gemsSection.appendChild(gemsValue);

  // ─── Level section ──────────────────────────────────────────────
  const levelSection = document.createElement('div');
  levelSection.className = 'hud-section hud-level';

  const levelLabel = document.createElement('div');
  levelLabel.className = 'hud-label';
  levelLabel.textContent = 'Lv';

  const levelValue = document.createElement('div');
  levelValue.className = 'hud-value';
  levelValue.setAttribute('aria-label', 'Level');

  const levelProgress = document.createElement('div');
  levelProgress.className = 'hud-progress-bar';
  const levelProgressFill = document.createElement('div');
  levelProgressFill.className = 'hud-progress-fill';
  levelProgress.appendChild(levelProgressFill);
  levelProgress.setAttribute('aria-label', 'Level progress');

  levelSection.appendChild(levelLabel);
  levelSection.appendChild(levelValue);
  levelSection.appendChild(levelProgress);

  // ─── Assemble container ─────────────────────────────────────────
  container.appendChild(energySection);
  container.appendChild(coinsSection);
  container.appendChild(starsSection);
  container.appendChild(gemsSection);
  container.appendChild(levelSection);

  hud.appendChild(container);

  // ─── Update function ────────────────────────────────────────────
  const updateHUD = () => {
    const now = clock();
    const state = store.getState();
    const model = hudModel(store.data, state, now);

    // Update energy
    energyValue.textContent = `${model.energy}/${model.energyCap}`;
    energyCountdown.textContent = model.nextEnergyIn ?? '';

    // Update currencies
    coinsValue.textContent = model.coins.toString();
    starsValue.textContent = model.stars.toString();
    gemsValue.textContent = model.gems.toString();

    // Update level
    levelValue.textContent = model.level.toString();
    const progressPercent = model.levelProgress * 100;
    levelProgressFill.style.width = `${progressPercent}%`;
  };

  // Initial update
  updateHUD();

  // Subscribe to store updates
  store.subscribe(() => {
    updateHUD();
  });

  // Update countdown every second
  const countdownInterval = window.setInterval(updateHUD, 1000);

  // Note: We don't clean up the interval since the HUD is never unmounted.
  // In a more complete app, we would return an unsubscribe function.
  void countdownInterval; // Suppress unused variable warning if needed
}
