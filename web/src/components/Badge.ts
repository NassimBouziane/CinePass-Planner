import { PassType } from '../core/models';
import { PREMIUM_KEYWORDS } from '../core/scheduler';
import {
  iconTicket,
  iconSparkles,
  iconClapper,
  iconZap,
  iconFilm,
  iconSpeaker,
  iconTv,
  iconGlasses,
  iconStar5,
  iconNewspaper,
} from './Icons';

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getFormatBadgeHtml(formatStr: string, passType: PassType): string {
  const fmt = (formatStr || 'Standard').trim();
  const fmtUpper = fmt.toUpperCase();

  if (fmtUpper === 'STANDARD') {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border-2 border-[#111111] bg-white text-[#111111]">
      ${iconTicket('w-3 h-3')}
      <span>Standard</span>
    </span>`;
  }

  const isPremium = PREMIUM_KEYWORDS.some((kw) => fmtUpper.includes(kw));
  let feeLabel = '';
  if (isPremium) {
    feeLabel = passType === PassType.GOLD
      ? '<span class="text-[0.65rem] font-extrabold uppercase ml-1 text-[#111111] bg-[#FFE566] px-1 py-0.2 rounded border border-[#111111]">(Inclus Gold)</span>'
      : '<span class="text-[0.65rem] font-extrabold uppercase ml-1 text-white bg-[#E8635A] px-1 py-0.2 rounded border border-[#111111]">(+Supplément)</span>';
  }

  let badgeColor = 'bg-[#FAFADF] text-[#111111]';
  let iconHtml = iconTicket('w-3 h-3');

  if (fmtUpper.includes('IMAX')) {
    badgeColor = 'bg-[#7B6CF6] text-white';
    iconHtml = iconSparkles('w-3 h-3 text-white');
  } else if (fmtUpper.includes('DOLBY CINEMA')) {
    badgeColor = 'bg-[#E8635A] text-white';
    iconHtml = iconClapper('w-3 h-3 text-white');
  } else if (fmtUpper.includes('4DX')) {
    badgeColor = 'bg-[#4ECDC4] text-[#111111]';
    iconHtml = iconZap('w-3 h-3 text-[#111111]');
  } else if (fmtUpper.includes('SCREENX')) {
    badgeColor = 'bg-[#C4B5FD] text-[#111111]';
    iconHtml = iconFilm('w-3 h-3 text-[#111111]');
  } else if (fmtUpper.includes('ATMOS')) {
    badgeColor = 'bg-[#F9A8B8] text-[#111111]';
    iconHtml = iconSpeaker('w-3 h-3 text-[#111111]');
  } else if (fmtUpper.includes('ONYX')) {
    badgeColor = 'bg-[#FFE566] text-[#111111]';
    iconHtml = iconTv('w-3 h-3 text-[#111111]');
  } else if (fmtUpper.includes('3D')) {
    badgeColor = 'bg-[#FFE566] text-[#111111]';
    iconHtml = iconGlasses('w-3 h-3 text-[#111111]');
  } else if (fmtUpper.includes('LASER')) {
    badgeColor = 'bg-white text-[#111111]';
    iconHtml = iconZap('w-3 h-3 text-[#111111]');
  }

  return `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border-2 border-[#111111] ${badgeColor} shadow-[2px_2px_0px_0px_#111111]">
      ${iconHtml}
      <span>${escapeHtml(fmt)}</span>
      ${feeLabel}
    </span>
  `.trim();
}

export function renderAllocineRatingsBadge(
  userRating: number | null | undefined,
  pressRating: number | null | undefined,
  compact: boolean = false
): string {
  if (userRating == null && pressRating == null) {
    return '';
  }

  const parts: string[] = [];

  if (userRating != null && !isNaN(userRating)) {
    const userLabel = compact ? `${userRating.toFixed(1)}` : `${userRating.toFixed(1)}/5 spec.`;
    parts.push(`
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold border-2 border-[#111111] bg-[#FFE566] text-[#111111] shadow-[1px_1px_0px_0px_#111111]" title="Note spectateurs Allociné : ${userRating.toFixed(1)}/5">
        ${iconStar5('w-3 h-3 text-[#111111]')}
        <span>${userLabel}</span>
      </span>
    `.trim());
  }

  if (pressRating != null && !isNaN(pressRating)) {
    const pressLabel = compact ? `${pressRating.toFixed(1)}` : `${pressRating.toFixed(1)}/5 presse`;
    parts.push(`
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold border-2 border-[#111111] bg-[#C4B5FD] text-[#111111] shadow-[1px_1px_0px_0px_#111111]" title="Note presse Allociné : ${pressRating.toFixed(1)}/5">
        ${iconNewspaper('w-3 h-3 text-[#111111]')}
        <span>${pressLabel}</span>
      </span>
    `.trim());
  }

  return `<div class="inline-flex items-center gap-1.5 flex-wrap">${parts.join('')}</div>`;
}

