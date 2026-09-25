// Daily Local News — interactive widget and city picker.
//
// The city directory below is real reference data, but geotagged local coverage is
// not part of the connected wire feeds. Until a local source is wired in, the
// widget and the local feed render explicit empty states instead of stand-in stories.

import { store } from './state.js';

export const CITY_DIRECTORY = [
  { city: 'Dearborn', region: 'Michigan', country: 'United States' },
  { city: 'Detroit', region: 'Michigan', country: 'United States' },
  { city: 'Washington D.C.', region: 'District of Columbia', country: 'United States' },
  { city: 'Philadelphia', region: 'Pennsylvania', country: 'United States' },
  { city: 'New York City', region: 'New York', country: 'United States' },
  { city: 'Boston', region: 'Massachusetts', country: 'United States' },
  { city: 'Atlanta', region: 'Georgia', country: 'United States' },
  { city: 'Miami', region: 'Florida', country: 'United States' },
  { city: 'Chicago', region: 'Illinois', country: 'United States' },
  { city: 'Houston', region: 'Texas', country: 'United States' },
  { city: 'Austin', region: 'Texas', country: 'United States' },
  { city: 'Denver', region: 'Colorado', country: 'United States' },
  { city: 'Phoenix', region: 'Arizona', country: 'United States' },
  { city: 'Seattle', region: 'Washington', country: 'United States' },
  { city: 'Portland', region: 'Oregon', country: 'United States' },
  { city: 'San Francisco', region: 'California', country: 'United States' },
  { city: 'Los Angeles', region: 'California', country: 'United States' },
  { city: 'Las Vegas', region: 'Nevada', country: 'United States' },
  { city: 'Notre Dame', region: 'Indiana', country: 'United States' },
  { city: 'London', region: 'England', country: 'United Kingdom' },
  { city: 'Manchester', region: 'England', country: 'United Kingdom' },
  { city: 'Toronto', region: 'Ontario', country: 'Canada' },
  { city: 'Vancouver', region: 'British Columbia', country: 'Canada' },
  { city: 'Sydney', region: 'New South Wales', country: 'Australia' },
  { city: 'Kyiv', region: 'Kyiv Oblast', country: 'Ukraine' },
  { city: 'Tel Aviv', region: 'Tel Aviv District', country: 'Israel' }
];

export const POPULAR_CITIES = ['Dearborn', 'New York City', 'Chicago', 'San Francisco', 'London', 'Toronto'];

export function findCity(cityName = '') {
  const needle = cityName.trim().toLowerCase();
  if (!needle) return null;
  return CITY_DIRECTORY.find(entry => entry.city.toLowerCase() === needle) || null;
}

export function formatCity(entry) {
  return entry ? `${entry.city}, ${entry.region}` : '';
}

// Local coverage is not supplied by the connected wires, so this returns an empty
// list rather than padding the desk with unrelated national stories.
export function getLocalStories(cityName) {
  return [];
}

export function renderLocalNewsWidget() {
  const { localCity, edition } = store.getState();
  const activeEntry = findCity(localCity);

  return `
      <!-- Daily Local News Widget -->
      <aside class="local-news-widget" aria-label="Daily local news">
        <h2 class="lnw-title">Daily Local News</h2>

        ${activeEntry ? `
        <div class="lnw-active-city">
          <span class="lnw-pin-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"></path>
            </svg>
          </span>
          <div class="lnw-active-text">
            <strong>${formatCity(activeEntry)}</strong>
            <span>${activeEntry.country} &middot; local desk not connected</span>
          </div>
        </div>

        <p class="lnw-unavailable-note">
          No local source is wired into this desk yet. It stays empty rather than being filled with
          unrelated national stories.
        </p>

        <div class="lnw-active-actions">
          <button class="lnw-submit-btn" data-action="view-local-feed">View local feed</button>
          <button class="lnw-setloc-btn" data-action="open-location-picker">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"></path>
            </svg>
            Change
          </button>
        </div>

        <button class="lnw-clear-btn" data-action="clear-local-city">Clear location</button>
        ` : `
        <p class="lnw-desc">Discover stories and media bias happening right in your city.</p>
        <form class="lnw-input-row" data-local-city-form novalidate>
          <input type="text" class="lnw-city-input" name="city" placeholder="Enter your city's name" aria-label="Enter your city's name" list="lnwCityOptions" />
          <button class="lnw-submit-btn" type="submit">Submit</button>
        </form>
        <datalist id="lnwCityOptions">
          ${CITY_DIRECTORY.map(entry => `<option value="${entry.city}">${entry.region}, ${entry.country}</option>`).join('')}
        </datalist>
        <p class="lnw-message" role="status"></p>

        <button class="lnw-setloc-btn" data-action="open-location-picker">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"></path>
          </svg>
          Set Location
        </button>

        <div class="lnw-popular-row">
          <span class="lnw-popular-label">Popular:</span>
          ${POPULAR_CITIES.map(city =>
            `<button class="lnw-city-chip" data-action="set-local-city" data-city="${city}">${city}</button>`).join('')}
        </div>
        `}

        <p class="lnw-edition-note">Edition: ${edition.flag} ${edition.label}</p>
      </aside>
  `;
}

export function handleLocalCitySubmit(form, onChange) {
  const input = form.querySelector('.lnw-city-input');
  const messageEl = form.nextElementSibling;
  const value = input ? input.value.trim() : '';

  if (value.length < 2) {
    if (messageEl && messageEl.classList.contains('lnw-message')) {
      messageEl.textContent = 'Enter a city name with at least two characters.';
      messageEl.className = 'lnw-message error';
    }
    if (input) input.focus();
    return false;
  }

  const entry = findCity(value) || {
    city: value,
    region: 'Local area',
    country: store.getState().edition.label
  };

  store.setLocalCity(entry.city);
  if (typeof onChange === 'function') onChange();
  return true;
}

// ── City picker overlay ─────────────────────────────────────────────────────
let pickerOnChange = null;

export function isLocationPickerOpen() {
  return Boolean(document.getElementById('location-picker-overlay'));
}

export function openLocationPicker(onChange = null) {
  if (typeof onChange === 'function') pickerOnChange = onChange;
  renderLocationPicker('');
}

export function closeLocationPicker() {
  const overlay = document.getElementById('location-picker-overlay');
  if (overlay) overlay.remove();
}

export function renderLocationPicker(query = '') {
  const existing = document.getElementById('location-picker-overlay');
  if (existing) existing.remove();

  const needle = query.trim().toLowerCase();
  const matches = CITY_DIRECTORY.filter(entry =>
    !needle ||
    entry.city.toLowerCase().includes(needle) ||
    entry.region.toLowerCase().includes(needle) ||
    entry.country.toLowerCase().includes(needle)
  );
  const current = store.getState().localCity;

  const overlay = document.createElement('div');
  overlay.id = 'location-picker-overlay';
  overlay.className = 'acct-overlay';
  overlay.innerHTML = `
    <div class="acct-modal location-picker-modal" role="dialog" aria-modal="true" aria-label="Choose your city">
      <button class="acct-close" data-picker-close title="Close" aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div class="acct-body">
        <h2 class="acct-title">Set your location</h2>
        <p class="acct-sub">We match local outlets, coverage counts, and bias data for your city.</p>

        <input class="acct-input location-picker-search" type="text" value="${query}" placeholder="Search cities…" aria-label="Search cities" />

        <div class="acct-edition-list location-picker-list">
          ${matches.length ? matches.map(entry => `
            <button class="acct-edition-row ${current === entry.city ? 'active' : ''}" data-picker-city="${entry.city}">
              <span class="acct-edition-flag">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"></path>
                </svg>
              </span>
              <span class="acct-edition-label">
                ${entry.city}
                <small>${entry.region}, ${entry.country} &middot; ${getLocalStories(entry).length} stories</small>
              </span>
              ${current === entry.city
                ? '<svg class="acct-edition-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                : ''}
            </button>`).join('')
            : '<p class="location-picker-empty">No cities match that search yet.</p>'}
        </div>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLocationPicker();
  });
  overlay.querySelector('[data-picker-close]').addEventListener('click', closeLocationPicker);

  const search = overlay.querySelector('.location-picker-search');
  search.addEventListener('input', () => {
    const typed = search.value;
    renderLocationPicker(typed);
    const nextSearch = document.querySelector('.location-picker-search');
    if (nextSearch) {
      nextSearch.focus();
      nextSearch.value = typed;
    }
  });

  overlay.querySelectorAll('[data-picker-city]').forEach(row => {
    row.addEventListener('click', () => {
      store.setLocalCity(row.dataset.pickerCity);
      closeLocationPicker();
      if (typeof pickerOnChange === 'function') pickerOnChange();
    });
  });

  document.body.appendChild(overlay);
}
