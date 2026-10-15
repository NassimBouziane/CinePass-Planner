export type Lang = 'fr' | 'en';

export interface Translations {
  // Header
  appTitle: string;
  plannerBadge: string;
  taglineBadge: string;
  handNote: string;
  subtitle: string;
  syncedBadge: string;
  footerBrand: string;
  footerSub: string;
  footerMeta: string;

  // Sidebar
  settingsTitle: string;
  resetBtn: string;
  resetTitle: string;
  searchCinemaLabel: string;
  searchCinemaPlaceholder: string;
  clearSearch: string;
  selectedCinemasCount: string;
  selectAll: string;
  deselectAll: string;
  allCities: string;
  noCinemaFound: string;
  selectedCinemasHeader: string;
  removeCinemaTitle: string;
  dateLabel: string;
  countLabel: string;
  targetCountText: string;
  passFormulaLabel: string;
  allowSupplementsText: string;
  advancedOptionsLabel: string;
  timeRangeTitle: string;
  startTimeLabel: string;
  endTimeLabel: string;
  minBufferLabel: string;
  mealBreakLabel: string;
  mealBreakHint: string;
  techFormatsTitle: string;
  techLaserHint: string;
  langFilterTitle: string;
  langAll: string;
  langVost: string;
  langVf: string;
  priorityTitle: string;
  priorityHint: string;
  prioritySearchPlaceholder: string;
  priorityScopeAll: string;
  priorityScopeSelected: string;
  priorityOtherCinemasHint: string;
  clearPriorityBtn: string;
  clearPriorityTitle: string;
  noPriorityFound: string;
  seenMoviesTitle: string;
  clearSeenBtn: string;
  clearSeenTitle: string;
  noSeenMoviesHint: string;

  // Scenarios
  scenarioOptimal: string;
  scenarioSameCinema: string;
  scenarioShortBreaks: string;

  // Results & Itineraries
  proposalsFound: string;
  proposalsFoundWithFavorite: string;
  proposalsInCinemas: string;
  proposalsInOneCinema: string;
  marathonFilms: string;
  activeBadge: string;
  timespan: string;
  movieTime: string;
  pausesTime: string;
  selectedStamp: string;
  clickToSelect: string;
  score: string;
  favoritePickBadge: string;
  favoriteMarathonSectionTitle: string;
  favoriteMarathonSectionBadge: string;
  realStart: string;
  realStartTitle: string;
  endTime: string;
  seenButton: string;
  seenButtonTitle: string;
  showtimeStep: string;
  transitMeal: string;
  transitCinemaChange: string;
  transitSmooth: string;
  transitCoffee: string;

  // Ticket Receipt
  noTicketTitle: string;
  noTicketAdvice: string;
  ticketHeading: string;
  ticketSub: string;
  ticketDate: string;
  ticketNumber: string;
  ticketProgram: string;
  ticketTimespan: string;
  ticketMovieTotal: string;
  ticketBreakTotal: string;
  ticketExtras: string;
  ticketIncluded: string;
  exportIcsBtn: string;

  // Notices and Fallbacks
  noPlansTitle: string;
  noPlansAdvice: string;
  noCinemaSelectedTitle: string;
  noCinemaSelectedAdvice: string;
  noShowtimesDateTitle: string;
  noShowtimesDateAdvice: string;
  loadingShowtimes: string;
  syncErrorMessage: string;
  modalCloseTitle: string;
}

export const translations: Record<Lang, Translations> = {
  fr: {
    // Header
    appTitle: 'cinépass',
    plannerBadge: 'planner',
    taglineBadge: 'marathon en salle',
    handNote: 'optimise ta journée ciné !',
    subtitle: 'enchaîne tes films préférés sans temps mort • cinémas et horaires du réseau cinépass',
    syncedBadge: 'séances synchronisées',
    footerBrand: 'cinépass planner',
    footerSub: '• l\'optimiseur de journées cinéma',
    footerMeta: 'réseau cinépass • respect de la vie privée • sans publicité',

    // Sidebar
    settingsTitle: 'paramètres & cinémas',
    resetBtn: 'reset',
    resetTitle: 'Réinitialiser toutes les préférences sauvegardées',
    searchCinemaLabel: '1. recherche rapide de cinéma',
    searchCinemaPlaceholder: 'taper un nom (ex: Alésia, Beaugrenelle)...',
    clearSearch: 'Effacer la recherche',
    selectedCinemasCount: 'sélectionné',
    selectAll: 'tout cocher',
    deselectAll: 'tout décocher',
    allCities: 'Toutes les villes',
    noCinemaFound: 'aucun cinéma trouvé pour',
    selectedCinemasHeader: 'cinémas cochés',
    removeCinemaTitle: 'Décocher ce cinéma',
    dateLabel: '2. date de la séance',
    countLabel: '3. nombre de films visé',
    targetCountText: '{n} films',
    passFormulaLabel: '4. formule cinépass',
    allowSupplementsText: 'autoriser suppléments (4DX, IMAX...)',
    advancedOptionsLabel: '5. options & filtres avancés',
    timeRangeTitle: 'plage horaire',
    startTimeLabel: 'début',
    endTimeLabel: 'fin max',
    minBufferLabel: 'buffer min entre séances',
    mealBreakLabel: 'pause repas (min 45 min)',
    mealBreakHint: '12h-14h ou 19h-21h',
    techFormatsTitle: 'technologies & formats',
    techLaserHint: 'laser = standard sans supplément',
    langFilterTitle: 'version linguistique',
    langAll: 'toutes',
    langVost: 'vostfr',
    langVf: 'vf',
    priorityTitle: 'films à voir en priorité',
    priorityHint: 'clique sur un film pour le privilégier',
    prioritySearchPlaceholder: 'filtrer par titre de film...',
    priorityScopeAll: 'tous les films du jour',
    priorityScopeSelected: 'cinémas cochés',
    priorityOtherCinemasHint: 'non programmé dans vos cinémas cochés mais disponible ce jour-là :',
    clearPriorityBtn: 'effacer',
    clearPriorityTitle: 'Désélectionner tous les films prioritaires',
    noPriorityFound: 'aucun film trouvé pour ce filtre.',
    seenMoviesTitle: 'films déjà vus (exclus)',
    clearSeenBtn: 'effacer',
    clearSeenTitle: 'Réintégrer tous les films vus',
    noSeenMoviesHint: 'aucun film exclu. clique sur "déjà vu ?" sur une séance pour l\'écarter.',

    // Scenarios
    scenarioOptimal: 'itinéraire optimal',
    scenarioSameCinema: 'zéro changement',
    scenarioShortBreaks: 'pauses courtes',

    // Results & Itineraries
    proposalsFound: 'proposition{s} d\'itinéraires trouvée{s}',
    proposalsFoundWithFavorite: '{n} proposition{s} + 1 marathon coup de cœur',
    proposalsInCinemas: 'sur {n} cinémas',
    proposalsInOneCinema: 'dans votre cinéma',
    marathonFilms: 'marathon {n} films',
    activeBadge: 'actif',
    timespan: 'amplitude',
    movieTime: 'film',
    pausesTime: 'pauses',
    selectedStamp: '✓ marathon sélectionné',
    clickToSelect: 'cliquer pour choisir',
    score: 'score',
    favoritePickBadge: 'coup de cœur inclus',
    favoriteMarathonSectionTitle: 'marathon coup de cœur (spécial films sélectionnés)',
    favoriteMarathonSectionBadge: 'sélection personnalisée',
    realStart: 'réel',
    realStartTitle: 'Début réel après ~15 min de bandes-annonces',
    endTime: 'fin',
    seenButton: 'déjà vu ?',
    seenButtonTitle: 'Marquer comme déjà vu pour exclure ce film des recommandations',
    showtimeStep: 'séance {n}',
    transitMeal: 'pause repas / repos',
    transitCinemaChange: 'changement de cinéma',
    transitSmooth: 'transition fluide (buffer pubs ~15m)',
    transitCoffee: 'pause café / étirement',

    // Ticket Receipt
    noTicketTitle: 'aucun ticket généré',
    noTicketAdvice: 'sélectionne un ou plusieurs cinémas pour composer ton ticket de marathon.',
    ticketHeading: 'ticket de marathon',
    ticketSub: 'cinépass pop-ticket',
    ticketDate: 'DATE',
    ticketNumber: 'N°',
    ticketProgram: 'programme ({n} séances)',
    ticketTimespan: 'amplitude marathon :',
    ticketMovieTotal: 'durée totale de film :',
    ticketBreakTotal: 'durée totale de pauses :',
    ticketExtras: 'suppléments formule :',
    ticketIncluded: '0,00 € (inclus)',
    exportIcsBtn: 'exporter le marathon (.ics)',

    // Notices and Fallbacks
    noPlansTitle: 'Aucun itinéraire complet ne correspond à toutes vos contraintes.',
    noPlansAdvice: 'Astuce : élargis l\'amplitude horaire, réintègre certains films déjà vus ou décoche la pause repas obligatoire.',
    noCinemaSelectedTitle: 'aucun cinéma sélectionné',
    noCinemaSelectedAdvice: 'sélectionne au moins un cinéma dans la barre latérale pour composer ton marathon.',
    noShowtimesDateTitle: 'Aucune séance trouvée pour cette date',
    noShowtimesDateAdvice: 'Sélectionne une autre date dans le menu déroulant ci-dessus.',
    loadingShowtimes: 'chargement des séances...',
    syncErrorMessage: 'Impossible de charger les séances pour le moment. Veuillez vérifier votre connexion ou réessayer plus tard.',
    modalCloseTitle: 'Fermer l\'affiche',
  },
  en: {
    // Header
    appTitle: 'cinépass',
    plannerBadge: 'planner',
    taglineBadge: 'theater marathon',
    handNote: 'optimize your movie day!',
    subtitle: 'binge your favorite movies back-to-back • cinépass network theaters and showtimes',
    syncedBadge: 'showtimes synchronized',
    footerBrand: 'cinépass planner',
    footerSub: '• movie marathon optimizer',
    footerMeta: 'cinépass network • privacy-friendly • ad-free',

    // Sidebar
    settingsTitle: 'settings & cinemas',
    resetBtn: 'reset',
    resetTitle: 'Reset all saved preferences',
    searchCinemaLabel: '1. quick cinema search',
    searchCinemaPlaceholder: 'type cinema name (e.g. Alésia, Beaugrenelle)...',
    clearSearch: 'Clear search',
    selectedCinemasCount: 'selected',
    selectAll: 'select all',
    deselectAll: 'deselect all',
    allCities: 'All cities',
    noCinemaFound: 'no cinema found for',
    selectedCinemasHeader: 'checked cinemas',
    removeCinemaTitle: 'Uncheck this cinema',
    dateLabel: '2. showtime date',
    countLabel: '3. target movie count',
    targetCountText: '{n} movies',
    passFormulaLabel: '4. cinépass subscription',
    allowSupplementsText: 'allow premium formats (4DX, IMAX...)',
    advancedOptionsLabel: '5. advanced options & filters',
    timeRangeTitle: 'time window',
    startTimeLabel: 'start',
    endTimeLabel: 'max end',
    minBufferLabel: 'min buffer between movies',
    mealBreakLabel: 'meal break (min 45 min)',
    mealBreakHint: '12pm-2pm or 7pm-9pm',
    techFormatsTitle: 'technologies & formats',
    techLaserHint: 'laser = standard with no surcharge',
    langFilterTitle: 'language version',
    langAll: 'all',
    langVost: 'subtitled (vostfr)',
    langVf: 'french dub (vf)',
    priorityTitle: 'priority / liked movies',
    priorityHint: 'click a movie to prioritize it in schedules',
    prioritySearchPlaceholder: 'filter by movie title...',
    priorityScopeAll: 'all movies today',
    priorityScopeSelected: 'checked cinemas',
    priorityOtherCinemasHint: 'not in checked theaters but playing today:',
    clearPriorityBtn: 'clear',
    clearPriorityTitle: 'Clear all priority movies',
    noPriorityFound: 'no movie found for this filter.',
    seenMoviesTitle: 'seen movies (excluded)',
    clearSeenBtn: 'clear',
    clearSeenTitle: 'Re-include all seen movies',
    noSeenMoviesHint: 'no movie excluded. click "seen it?" on a screening to remove it.',

    // Scenarios
    scenarioOptimal: 'optimal itinerary',
    scenarioSameCinema: 'zero theater switch',
    scenarioShortBreaks: 'short breaks',

    // Results & Itineraries
    proposalsFound: '{n} itinerary proposal{s} found',
    proposalsFoundWithFavorite: '{n} proposal{s} + 1 favorite marathon',
    proposalsInCinemas: 'across {n} cinemas',
    proposalsInOneCinema: 'in your cinema',
    marathonFilms: '{n}-movie marathon',
    activeBadge: 'active',
    timespan: 'timespan',
    movieTime: 'movies',
    pausesTime: 'breaks',
    selectedStamp: '✓ selected marathon',
    clickToSelect: 'click to select',
    score: 'score',
    favoritePickBadge: 'favorite pick included',
    favoriteMarathonSectionTitle: 'favorite pick marathon (with your liked movies)',
    favoriteMarathonSectionBadge: 'custom selection',
    realStart: 'real',
    realStartTitle: 'Real start time after ~15 min of commercials and trailers',
    endTime: 'end',
    seenButton: 'seen it?',
    seenButtonTitle: 'Mark as seen to exclude this movie from marathon recommendations',
    showtimeStep: 'movie {n}',
    transitMeal: 'meal / rest break',
    transitCinemaChange: 'theater transfer',
    transitSmooth: 'smooth transition (trailers buffer ~15m)',
    transitCoffee: 'coffee / stretch break',

    // Ticket Receipt
    noTicketTitle: 'no ticket generated',
    noTicketAdvice: 'select one or more cinemas to create your movie marathon ticket.',
    ticketHeading: 'marathon ticket',
    ticketSub: 'cinépass pop-ticket',
    ticketDate: 'DATE',
    ticketNumber: 'NO.',
    ticketProgram: 'schedule ({n} movies)',
    ticketTimespan: 'marathon timespan:',
    ticketMovieTotal: 'total movie time:',
    ticketBreakTotal: 'total break time:',
    ticketExtras: 'plan supplements:',
    ticketIncluded: '€0.00 (included)',
    exportIcsBtn: 'export marathon (.ics)',

    // Notices and Fallbacks
    noPlansTitle: 'No complete itinerary matches all your constraints.',
    noPlansAdvice: 'Tip: widen your time window, uncheck seen movies, or disable mandatory meal break.',
    noCinemaSelectedTitle: 'no cinema selected',
    noCinemaSelectedAdvice: 'select at least one cinema in the sidebar to build your marathon.',
    noShowtimesDateTitle: 'No showtimes found for this date',
    noShowtimesDateAdvice: 'Please pick another date from the dropdown above.',
    loadingShowtimes: 'loading showtimes...',
    syncErrorMessage: 'Unable to load showtimes at this moment. Please check your connection or retry later.',
    modalCloseTitle: 'Close poster view',
  },
};

const LANG_STORAGE_KEY = 'cinepass_lang';

export function getStoredLanguage(): Lang {
  if (typeof window === 'undefined') return 'fr';
  try {
    const val = localStorage.getItem(LANG_STORAGE_KEY);
    if (val === 'en' || val === 'fr') return val;
  } catch (e) {
    // ignore
  }
  return 'fr';
}

export function setStoredLanguage(lang: Lang): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (e) {
    // ignore
  }
}

export function t(key: keyof Translations, lang: Lang, params?: Record<string, string | number>): string {
  const dict = translations[lang] || translations.fr;
  let text = dict[key] || translations.fr[key] || '';
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

export function formatDateLocalized(dateIso: string, lang: Lang): string {
  try {
    const date = new Date(dateIso + 'T12:00:00');
    const locale = lang === 'en' ? 'en-US' : 'fr-FR';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch (e) {
    return dateIso;
  }
}
