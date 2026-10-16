import { PassType, type Itinerary } from '../core/models';
import { getFormatBadgeHtml, escapeHtml, renderAllocineRatingsBadge } from './Badge';
import { t, type Lang } from '../core/i18n';
import {
  iconStar4,
  iconPin,
  iconMeal,
  iconWalk,
  iconZap,
  iconCoffee,
  iconReceipt,
  iconCalendar,
  iconFilm,
  iconSearch,
  iconWrench,
} from './Icons';

function addMinutes(isoStr: string, minutes: number): string {
  const d = new Date(isoStr);
  d.setMinutes(d.getMinutes() + minutes);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function calculateEstimatedSupplements(itinerary: Itinerary, passType: PassType): number {
  if (passType === PassType.GOLD) return 0;
  let totalFee = 0;
  for (const st of itinerary.showtimes) {
    const fmt = (st.format || '').toUpperCase();
    if (fmt.includes('IMAX') || fmt.includes('4DX')) {
      totalFee += 6;
    } else if (fmt.includes('DOLBY')) {
      totalFee += 5;
    } else if (fmt.includes('SCREENX')) {
      totalFee += 4;
    } else if (fmt.includes('3D')) {
      totalFee += 2;
    }
  }
  return totalFee;
}

export const ACTIVE_CARD_CLASS = 'rounded-[12px] p-5 mb-5 bg-[#FFE566] border-2 border-[#111111] shadow-[6px_6px_0px_0px_#111111] translate-x-[-1px] translate-y-[-1px] ring-2 ring-[#111111] transition-all cursor-pointer select-none';
export const INACTIVE_CARD_CLASS = 'rounded-[12px] p-5 mb-5 bg-white border-2 border-[#111111] shadow-[3px_3px_0px_0px_#111111] hover:shadow-[5px_5px_0px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] opacity-95 hover:opacity-100 transition-all cursor-pointer select-none';

export function getSelectionStampHtml(isSelected: boolean, lang: Lang = 'fr'): string {
  return isSelected
    ? `<span class="bg-[#111111] text-[#FFE566] text-xs font-mono font-black px-3 py-1 rounded-full border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111] flex items-center gap-1.5 uppercase tracking-wider">
        ${t('selectedStamp', lang)}
      </span>`
    : `<span class="text-[0.7rem] font-bold text-[#555555] bg-[#FAFADF] border border-[#111111] px-2.5 py-1 rounded-full">
        ${t('clickToSelect', lang)}
      </span>`;
}

export function formatItineraryCardHtml(
  itinerary: Itinerary,
  planIndex: number,
  passType: PassType,
  isSelected: boolean = false,
  lang: Lang = 'fr'
): string {
  const hFilm = Math.floor(itinerary.total_movie_minutes / 60);
  const mFilm = itinerary.total_movie_minutes % 60;
  const count = itinerary.showtimes.length;

  const firstShow = itinerary.showtimes[0];
  const lastShow = itinerary.showtimes[count - 1];
  const globalStart = firstShow ? firstShow.starts_at.split('T')[1].slice(0, 5) : '--:--';
  const globalEnd = lastShow ? lastShow.ends_at.split('T')[1].slice(0, 5) : '--:--';

  const cardBgClass = isSelected ? ACTIVE_CARD_CLASS : INACTIVE_CARD_CLASS;

  const favoriteBadgeHtml = itinerary.is_favorite_pick
    ? `<span class="bg-[#FAFADF] text-[#111111] text-[0.68rem] font-black px-2.5 py-0.5 rounded-full border-2 border-[#111111] shadow-[1px_1px_0px_0px_#111111] flex items-center gap-1 font-sans">
        ${iconStar4('w-3 h-3 text-[#111111]')}
        <span>${t('favoritePickBadge', lang)}</span>
      </span>`
    : '';

  const headerHtml = `
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#111111] pb-3 mb-4 gap-2">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-[#111111] font-mono font-black text-xs shadow-[1px_1px_0px_0px_#111111]">
            #${planIndex}
          </span>
          <h3 class="text-base sm:text-lg font-black text-[#111111] lowercase font-sans">
            ${t('marathonFilms', lang, { n: count })}
          </h3>
          <span class="active-badge ${isSelected ? '' : 'hidden'} bg-[#111111] text-white text-[0.65rem] font-mono font-black px-2 py-0.5 rounded-full uppercase">
            ${t('activeBadge', lang)}
          </span>
          ${favoriteBadgeHtml}
        </div>
        <p class="text-xs text-[#333333] font-medium mt-1 flex items-center gap-2 flex-wrap">
          <span>${t('timespan', lang)} : <strong class="text-[#111111] font-mono">${globalStart} ➔ ${globalEnd}</strong></span>
          <span>&bull;</span>
          <span>${t('movieTime', lang)} : <strong class="text-[#111111] font-mono">${hFilm}h${String(mFilm).padStart(2, '0')}</strong></span>
          <span>&bull;</span>
          <span>${t('pausesTime', lang)} : <strong class="text-[#111111] font-mono">${itinerary.total_pause_minutes} min</strong></span>
        </p>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <div class="selection-stamp-container">${getSelectionStampHtml(isSelected, lang)}</div>
        <span class="inline-flex items-center gap-1.5 bg-[#C4B5FD] text-[#111111] text-xs font-mono font-extrabold px-3 py-1 rounded-full border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111]">
          ${iconStar4('w-3.5 h-3.5 text-[#111111]')}
          <span>${t('score', lang)} ${Math.round(itinerary.score)}</span>
        </span>
      </div>
    </div>
  `;

  const slotsHtml: string[] = [];

  for (let i = 0; i < itinerary.showtimes.length; i++) {
    const st = itinerary.showtimes[i];
    const sStart = st.starts_at.split('T')[1].slice(0, 5);
    const sRealStart = addMinutes(st.starts_at, 15);
    const sEnd = st.ends_at.split('T')[1].slice(0, 5);

    const badges: string[] = [];
    if (st.version && (st.version === 'VOST' || st.version === 'ORIGINAL')) {
      badges.push(`<span class="px-2 py-0.5 rounded-full text-[0.7rem] font-bold border-2 border-[#111111] text-[#111111] bg-[#C4B5FD] shadow-[1px_1px_0px_0px_#111111]">VOSTFR</span>`);
    } else if (st.version && (st.version === 'VF' || st.version === 'DUBBED')) {
      badges.push(`<span class="px-2 py-0.5 rounded-full text-[0.7rem] font-bold border-2 border-[#111111] text-[#111111] bg-[#FAFADF] shadow-[1px_1px_0px_0px_#111111]">VF</span>`);
    }

    badges.push(getFormatBadgeHtml(st.format || 'Standard', passType));

    const cinemaLabel = st.cinema_name ? `
      <span class="inline-flex items-center gap-1 text-xs text-[#111111] font-bold bg-[#FAFADF] px-2 py-0.5 rounded border border-[#111111]">
        ${iconPin('w-3 h-3 text-[#111111]')}
        <span>${escapeHtml(st.cinema_name)}</span>
      </span>
    ` : '';

    // Enlarge movie poster thumbnail for much better visual clarity (w-20 sm:w-24 h-28 sm:h-34)
    const posterImg = st.poster_url
      ? `<img src="${escapeHtml(st.poster_url)}" alt="${escapeHtml(st.movie_title)}" class="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />`
      : `<div class="w-full h-full flex flex-col items-center justify-center text-[#777777] p-1 text-center font-mono text-[0.65rem] font-bold">${iconFilm('w-5 h-5 text-[#111111] mb-1')}<span>affiche</span></div>`;

    const posterHtml = `
      <div
        class="poster-thumb w-20 sm:w-24 h-28 sm:h-34 shrink-0 rounded-[8px] border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111] overflow-hidden bg-[#FAFADF] relative group cursor-pointer"
        data-poster-preview="${escapeHtml(st.poster_url || '')}"
        data-poster-title="${escapeHtml(st.movie_title)}"
        title="${escapeHtml(st.movie_title)}"
      >
        ${posterImg}
        <div class="absolute inset-0 bg-[#111111]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          ${iconSearch('w-5 h-5 text-white')}
        </div>
      </div>
    `;

    slotsHtml.push(`
      <div class="bg-white border-2 border-[#111111] rounded-[10px] p-3 shadow-[2px_2px_0px_0px_#111111] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]">
        <div class="flex items-center justify-between gap-3">
          
          <div class="flex items-center gap-3 min-w-0">
            <!-- Poster -->
            ${posterHtml}

            <!-- Showtime timing badge -->
            <div class="text-center min-w-[80px] bg-[#FAFADF] border-2 border-[#111111] rounded-[8px] p-2 shadow-[2px_2px_0px_0px_#111111] shrink-0">
              <div class="text-base sm:text-lg font-black text-[#111111] font-mono tracking-tight leading-none">${sStart}</div>
              <div class="text-[0.68rem] text-[#E8635A] font-mono font-bold mt-1 leading-none" title="${t('realStartTitle', lang)}">
                ~${sRealStart} ${t('realStart', lang)}
              </div>
              <div class="text-[0.68rem] text-[#555555] font-mono font-medium mt-1 border-t border-[#111111]/30 pt-1 leading-none">
                ${t('endTime', lang)} ${sEnd}
              </div>
            </div>

            <!-- Movie details -->
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm sm:text-base font-extrabold text-[#111111] truncate" title="${escapeHtml(st.movie_title)}">${escapeHtml(st.movie_title)}</span>
                ${renderAllocineRatingsBadge(st.user_rating, st.press_rating, true)}
                ${cinemaLabel}
              </div>
              <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                ${badges.join(' ')}
                <button
                  type="button"
                  class="btn-build-around inline-flex items-center gap-1 text-[0.68rem] font-bold bg-[#FFE566] text-[#111111] border border-[#111111] px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#111111] hover:bg-[#ffe043] cursor-pointer transition-all ml-1"
                  data-movie-title="${escapeHtml(st.movie_title)}"
                  data-cinema-id="${escapeHtml(st.cinema_id)}"
                  data-starts-at="${escapeHtml(st.starts_at)}"
                  title="Bâtir un marathon autour de cette séance"
                >
                  ${iconWrench('w-3 h-3 text-[#111111]')}
                  <span>Bâtir</span>
                </button>
                <button
                  type="button"
                  class="btn-mark-seen text-[0.68rem] font-bold text-[#777777] hover:text-[#E8635A] underline ml-1 cursor-pointer transition-colors"
                  data-movie-title="${escapeHtml(st.movie_title)}"
                  title="${t('seenButtonTitle', lang)}"
                >
                  ${t('seenButton', lang)}
                </button>
              </div>
            </div>
          </div>

          <!-- Step badge -->
          <div class="self-start sm:self-center shrink-0">
            <span class="inline-block px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#FAFADF] text-[#111111] border-2 border-[#111111] shadow-[1px_1px_0px_0px_#111111]">
              ${t('showtimeStep', lang, { n: i + 1 })}
            </span>
          </div>

        </div>
      </div>
    `);

    // Gap between showtimes (Transit Connector)
    if (i < itinerary.showtimes.length - 1) {
      const nextSt = itinerary.showtimes[i + 1];
      const gapMin = Math.round(
        (new Date(nextSt.starts_at).getTime() - new Date(st.ends_at).getTime()) / (60 * 1000)
      );

      const isCinemaChange = Boolean(st.cinema_name && nextSt.cinema_name && st.cinema_name !== nextSt.cinema_name);
      let connectorBg = 'bg-[#4ECDC4]';
      let iconSvg = iconMeal('w-3.5 h-3.5 text-[#111111]');
      let title = t('transitMeal', lang);

      if (isCinemaChange) {
        connectorBg = 'bg-[#E8635A] text-white';
        iconSvg = iconWalk('w-3.5 h-3.5 text-white');
        title = `${t('transitCinemaChange', lang)} : ${escapeHtml(st.cinema_name || '')} ➔ ${escapeHtml(nextSt.cinema_name || '')}`;
      } else if (gapMin < 20) {
        connectorBg = 'bg-[#FFE566]';
        iconSvg = iconZap('w-3.5 h-3.5 text-[#111111]');
        title = t('transitSmooth', lang);
      } else if (gapMin < 45) {
        connectorBg = 'bg-[#C4B5FD]';
        iconSvg = iconCoffee('w-3.5 h-3.5 text-[#111111]');
        title = t('transitCoffee', lang);
      }

      slotsHtml.push(`
        <div class="border-l-2 border-dashed border-[#111111] ml-8 my-2 pl-6 py-1.5">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-[#111111] text-xs font-bold ${connectorBg} shadow-[2px_2px_0px_0px_#111111] rotate-[-0.5deg]">
            ${iconSvg}
            <span class="font-sans">${title}</span>
            <span class="font-mono text-[0.7rem] bg-white/70 text-[#111111] px-1.5 py-0.2 rounded border border-[#111111]">${gapMin} min</span>
          </div>
        </div>
      `);
    }
  }

  return `
    <div class="${cardBgClass}" data-plan-index="${planIndex}">
      ${headerHtml}
      <div class="space-y-2">
        ${slotsHtml.join('')}
      </div>
    </div>
  `.trim();
}

export function formatThermalReceiptHtml(
  itinerary: Itinerary | null,
  passType: PassType,
  lang: Lang = 'fr'
): string {
  if (!itinerary || !itinerary.showtimes || itinerary.showtimes.length === 0) {
    return `
      <div class="bg-white border-2 border-[#111111] rounded-[14px] p-6 shadow-[6px_6px_0px_0px_#111111] text-center space-y-3">
        <div class="w-12 h-12 mx-auto rounded-full bg-[#FAFADF] border-2 border-[#111111] flex items-center justify-center text-[#111111] shadow-[2px_2px_0px_0px_#111111]">
          ${iconReceipt('w-6 h-6 text-[#111111]')}
        </div>
        <h4 class="font-extrabold text-sm text-[#111111] lowercase font-sans">${t('noTicketTitle', lang)}</h4>
        <p class="text-xs text-[#555555]">
          ${t('noTicketAdvice', lang)}
        </p>
      </div>
    `;
  }

  const count = itinerary.showtimes.length;
  const hFilm = Math.floor(itinerary.total_movie_minutes / 60);
  const mFilm = itinerary.total_movie_minutes % 60;
  const supplements = calculateEstimatedSupplements(itinerary, passType);
  const firstShow = itinerary.showtimes[0];
  const lastShow = itinerary.showtimes[count - 1];
  const startTime = firstShow ? firstShow.starts_at.split('T')[1].slice(0, 5) : '--:--';
  const endTime = lastShow ? lastShow.ends_at.split('T')[1].slice(0, 5) : '--:--';
  const dateStr = firstShow ? firstShow.date_str : '';

  const ticketNumber = Math.abs(Math.sin(itinerary.score) * 1000000 | 0).toString().padStart(6, '0');

  const movieRows = itinerary.showtimes.map((st) => {
    const sStart = st.starts_at.split('T')[1].slice(0, 5);
    const fmt = st.format || 'Standard';
    return `
      <div class="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-[#111111]/20">
        <div class="truncate max-w-[170px] font-medium flex items-center gap-1.5">
          <span class="font-mono font-bold text-[#E8635A]">${sStart}</span>
          <span class="truncate" title="${escapeHtml(st.movie_title)}">${escapeHtml(st.movie_title)}</span>
        </div>
        <div class="text-[0.65rem] font-mono text-[#555555] shrink-0">${escapeHtml(fmt)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="bg-white border-2 border-[#111111] rounded-[14px] p-5 shadow-[6px_6px_0px_0px_#111111] relative overflow-hidden font-sans space-y-4">
      <!-- Perforation notches -->
      <div class="absolute -left-3 top-24 w-6 h-6 rounded-full bg-[#FAFADF] border-2 border-[#111111]"></div>
      <div class="absolute -right-3 top-24 w-6 h-6 rounded-full bg-[#FAFADF] border-2 border-[#111111]"></div>

      <!-- Ticket Header -->
      <div class="text-center border-b-2 border-dashed border-[#111111] pb-3">
        <div class="flex items-center justify-center gap-1.5 text-xs font-mono font-extrabold uppercase tracking-widest text-[#555555]">
          ${iconStar4('w-3 h-3 text-[#111111]')}
          <span>${t('ticketHeading', lang)}</span>
          ${iconStar4('w-3 h-3 text-[#111111]')}
        </div>
        <h4 class="text-lg font-black text-[#111111] font-sans lowercase mt-0.5">
          ${t('ticketSub', lang)}
        </h4>
        <div class="flex justify-between items-center text-[0.7rem] font-mono text-[#555555] mt-1">
          <span>${t('ticketDate', lang)} : ${dateStr}</span>
          <span>${t('ticketNumber', lang)} ${ticketNumber}</span>
        </div>
      </div>

      <!-- Movies list -->
      <div>
        <div class="text-[0.65rem] font-extrabold font-mono uppercase text-[#555555] mb-1">
          ${t('ticketProgram', lang, { n: count })}
        </div>
        ${movieRows}
      </div>

      <!-- Statistics summary -->
      <div class="border-t-2 border-dashed border-[#111111] pt-3 space-y-1.5 text-xs">
        <div class="flex justify-between">
          <span class="text-[#555555]">${t('ticketTimespan', lang)}</span>
          <span class="font-mono font-bold text-[#111111]">${startTime} ➔ ${endTime}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#555555]">${t('ticketMovieTotal', lang)}</span>
          <span class="font-mono font-bold text-[#111111]">${hFilm}h${String(mFilm).padStart(2, '0')}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#555555]">${t('ticketBreakTotal', lang)}</span>
          <span class="font-mono font-bold text-[#111111]">${itinerary.total_pause_minutes} min</span>
        </div>
        <div class="flex justify-between items-center border-t border-dashed border-[#111111]/30 pt-1.5 font-bold">
          <span class="text-[#111111]">${t('ticketExtras', lang)}</span>
          <span class="font-mono text-sm ${supplements > 0 ? 'text-[#E8635A]' : 'text-[#4ECDC4]'}">
            ${supplements > 0 ? `+${supplements.toFixed(2)} €` : t('ticketIncluded', lang)}
          </span>
        </div>
      </div>

      <!-- Barcode decoration -->
      <div class="text-center pt-2">
        <div class="font-mono text-xl tracking-[0.25em] text-[#111111] select-none leading-none overflow-hidden h-7">
          |||||||||||||||||||||||||||||||||||||||||
        </div>
        <div class="text-[0.65rem] font-mono text-[#555555] tracking-widest mt-1">
          ${ticketNumber} 202610 994
        </div>
      </div>

      <!-- Export CTA button -->
      <div class="pt-1">
        <button id="btn-export-ics" class="w-full bg-[#E8635A] text-white border-2 border-[#111111] rounded-[10px] py-2.5 px-4 font-bold text-xs shadow-[3px_3px_0px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#111111] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer font-sans">
          ${iconCalendar('w-4 h-4 text-white')}
          <span>${t('exportIcsBtn', lang)}</span>
        </button>
      </div>
    </div>
  `.trim();
}
