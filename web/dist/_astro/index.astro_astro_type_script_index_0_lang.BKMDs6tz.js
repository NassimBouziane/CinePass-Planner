var e=function(e){return e.GOLD=`Gold`,e.SILVER=`Silver`,e.UNDER26=`-26 ans`,e.OTHER=`Autre`,e}({});function t(e,t,n=45){let r=new Date(e.ends_at),i=new Date(t.starts_at);if((i.getTime()-r.getTime())/6e4<n)return!1;let a=r.getFullYear(),o=r.getMonth(),s=r.getDate(),c=new Date(a,o,s,12,0,0),l=new Date(a,o,s,14,0,0),u=new Date(a,o,s,19,0,0),d=new Date(a,o,s,21,0,0),f=(e,t)=>{let n=Math.max(r.getTime(),e.getTime()),a=Math.min(i.getTime(),t.getTime());return a>n?(a-n)/6e4:0};return f(c,l)>=n||f(u,d)>=n}var n=[`IMAX`,`4DX`,`DOLBY`,`SCREENX`,`3D`,`ONYX`],r=class{generatePlans(r,i){let a=new Date(`${i.date_str}T${i.start_time}:00`).getTime(),o=new Date(`${i.date_str}T${i.max_end_time}:00`).getTime(),s=new Set(i.seen_movies||[]),c=new Set(i.priority_movies||[]),l=i.selected_formats&&i.selected_formats.length>0?new Set(i.selected_formats):null,u=[];for(let t of r){if(s.has(t.movie_title))continue;let r=new Date(t.starts_at).getTime(),c=new Date(t.ends_at).getTime();if(r<a||c>o)continue;let d=(t.format||``).toUpperCase();if(!n.some(e=>d.includes(e))||i.pass_type===e.GOLD||i.allow_supplements){if(i.language===`VOST`){let e=(t.version||``).toUpperCase();if(!e.includes(`VOST`)&&e!==`ORIGINAL`)continue}else if(i.language===`VF`){let e=(t.version||``).toUpperCase();if(!e.includes(`VF`)&&e!==`DUBBED`)continue}if(l){let e=t.format||`Standard`;if(!l.has(e))continue}u.push({...t,start_ms:r,end_ms:c,runtime_min:Math.round((c-r)/6e4)})}}u.sort((e,t)=>e.start_ms-t.start_ms);let d=[];for(let e=i.target_films_count;e>=1&&(d=this.findPaths(u,e,i.min_buffer_minutes),!(d.length>0));e--);if(d.length===0)return[];let f=[];for(let e of d){let n=!1;for(let r=0;r<e.length-1;r++)if((e[r+1].start_ms-e[r].end_ms)/6e4>=45&&t(e[r],e[r+1])){n=!0;break}let r=0,a=0,o=e.length*1e3;for(let t of e)r+=t.runtime_min,c.has(t.movie_title)&&(o+=2e3);for(let t=0;t<e.length-1;t++){let n=Math.round((e[t+1].start_ms-e[t].end_ms)/6e4);a+=n,o-=n*1.5,n>60&&(o-=(n-60)*3),e[t].cinema_id&&e[t+1].cinema_id&&e[t].cinema_id!==e[t+1].cinema_id&&(o-=100)}i.require_meal_break?n?o+=500:o-=500:n&&(o+=200),f.push({showtimes:e,total_movie_minutes:r,total_pause_minutes:a,score:o,has_meal_break:n})}f.sort((e,t)=>t.score-e.score);let p=[],m=new Set;for(let e of f){let t=e.showtimes.map(e=>`${e.movie_title}@${e.starts_at}`).join(`-`);if(m.has(t)||(m.add(t),p.push(e)),p.length>=3)break}return p}findPaths(e,t,n){let r=[],i=n*60*1e3,a=Math.max(n,30)*60*1e3,o=(n,s,c)=>{if(n.length===t){r.push([...n]);return}if(r.length>=300)return;let l=n.length>0?n[n.length-1]:null;for(let t=s;t<e.length;t++){if(r.length>=300)return;let s=e[t];if(!c.has(s.movie_title)){if(l){let e=l.cinema_id&&s.cinema_id&&l.cinema_id!==s.cinema_id?a:i,t=s.start_ms-l.end_ms;if(t<e||t>18e6&&r.length>=30)continue}n.push(s),c.add(s.movie_title),o(n,t+1,c),c.delete(s.movie_title),n.pop()}}};return o([],0,new Set),r}};function i(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M13 5v2"/><path d="M13 11v2"/><path d="M13 17v2"/>
  </svg>`}function a(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4Z"/>
    <path d="m4 11 3-7h13l-3 7H4Z"/>
    <path d="m8.5 4 2.5 7"/>
    <path d="m14.5 4 2.5 7"/>
  </svg>`}function o(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="3"/>
    <path d="M7 2v20"/><path d="M17 2v20"/><path d="M2 12h20"/>
    <path d="M2 7h5"/><path d="M2 17h5"/><path d="M17 7h5"/><path d="M17 17h5"/>
  </svg>`}function s(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5">
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
  </svg>`}function c(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>`}function l(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
    <path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/>
    <path d="M14 9h1"/><path d="M14 13h1"/><path d="M14 17h1"/>
  </svg>`}function u(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>`}function d(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`}function f(e=`w-3.5 h-3.5`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>`}function p(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="13" cy="4" r="2"/>
    <path d="m9 20 3-6 3 2 2 4"/><path d="m6 17 3-5 3-3-2-3"/>
    <path d="m14 10 3 3 3-1"/>
  </svg>`}function m(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 11v11"/>
    <path d="M5 2v10a2 2 0 0 0 2 2h1v8h2v-8h1a2 2 0 0 0 2-2V2"/>
  </svg>`}function h(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z"/>
    <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
  </svg>`}function g(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>`}function _(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/>
    <path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>
  </svg>`}function v(e=`w-4 h-4`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`}function y(e=`w-3.5 h-3.5`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>`}function b(e=`w-3.5 h-3.5`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="14" r="4"/><circle cx="18" cy="14" r="4"/>
    <path d="M10 14h4"/><path d="m3 14 3-8h12l3 8"/>
  </svg>`}function x(e=`w-3.5 h-3.5`){return`<svg class="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/>
  </svg>`}function ee(e=`w-3.5 h-3.5`){return`<svg class="${e}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5">
    <path d="M12 3l2 4.5L18.5 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M19 16l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z"/>
  </svg>`}function S(e){return e?String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#039;`):``}function C(t,r){let s=(t||`Standard`).trim(),l=s.toUpperCase();if(l===`STANDARD`)return`<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border-2 border-[#111111] bg-white text-[#111111]">
      ${i(`w-3 h-3`)}
      <span>Standard</span>
    </span>`;let u=n.some(e=>l.includes(e)),d=``;u&&(d=r===e.GOLD?`<span class="text-[0.65rem] font-extrabold uppercase ml-1 text-[#111111] bg-[#FFE566] px-1 py-0.2 rounded border border-[#111111]">(Inclus Gold)</span>`:`<span class="text-[0.65rem] font-extrabold uppercase ml-1 text-white bg-[#E8635A] px-1 py-0.2 rounded border border-[#111111]">(+Supplément)</span>`);let f=`bg-[#FAFADF] text-[#111111]`,p=i(`w-3 h-3`);return l.includes(`IMAX`)?(f=`bg-[#7B6CF6] text-white`,p=ee(`w-3 h-3 text-white`)):l.includes(`DOLBY CINEMA`)?(f=`bg-[#E8635A] text-white`,p=a(`w-3 h-3 text-white`)):l.includes(`4DX`)?(f=`bg-[#4ECDC4] text-[#111111]`,p=c(`w-3 h-3 text-[#111111]`)):l.includes(`SCREENX`)?(f=`bg-[#C4B5FD] text-[#111111]`,p=o(`w-3 h-3 text-[#111111]`)):l.includes(`ATMOS`)?(f=`bg-[#F9A8B8] text-[#111111]`,p=y(`w-3 h-3 text-[#111111]`)):l.includes(`ONYX`)?(f=`bg-[#FFE566] text-[#111111]`,p=x(`w-3 h-3 text-[#111111]`)):l.includes(`3D`)?(f=`bg-[#FFE566] text-[#111111]`,p=b(`w-3 h-3 text-[#111111]`)):l.includes(`LASER`)&&(f=`bg-white text-[#111111]`,p=c(`w-3 h-3 text-[#111111]`)),`
    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border-2 border-[#111111] ${f} shadow-[2px_2px_0px_0px_#111111]">
      ${p}
      <span>${S(s)}</span>
      ${d}
    </span>
  `.trim()}function w(e,t){let n=new Date(e);return n.setMinutes(n.getMinutes()+t),`${String(n.getHours()).padStart(2,`0`)}:${String(n.getMinutes()).padStart(2,`0`)}`}function T(t,n){if(n===e.GOLD)return 0;let r=0;for(let e of t.showtimes){let t=(e.format||``).toUpperCase();t.includes(`IMAX`)||t.includes(`4DX`)?r+=6:t.includes(`DOLBY`)?r+=5:t.includes(`SCREENX`)?r+=4:t.includes(`3D`)&&(r+=2)}return r}var E=`rounded-[12px] p-5 mb-5 bg-[#FFE566] border-2 border-[#111111] shadow-[6px_6px_0px_0px_#111111] translate-x-[-1px] translate-y-[-1px] ring-2 ring-[#111111] transition-all cursor-pointer select-none`,te=`rounded-[12px] p-5 mb-5 bg-white border-2 border-[#111111] shadow-[3px_3px_0px_0px_#111111] hover:shadow-[5px_5px_0px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] opacity-95 hover:opacity-100 transition-all cursor-pointer select-none`;function D(e){return e?`<span class="bg-[#111111] text-[#FFE566] text-xs font-mono font-black px-3 py-1 rounded-full border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111] flex items-center gap-1.5 uppercase tracking-wider">
        ✓ marathon sélectionné
      </span>`:`<span class="text-[0.7rem] font-bold text-[#555555] bg-[#FAFADF] border border-[#111111] px-2.5 py-1 rounded-full">
        cliquer pour choisir
      </span>`}function ne(e,t,n,r=!1){let i=Math.floor(e.total_movie_minutes/60),a=e.total_movie_minutes%60,l=e.showtimes.length,u=e.showtimes[0],g=e.showtimes[l-1],_=u?u.starts_at.split(`T`)[1].slice(0,5):`--:--`,v=g?g.ends_at.split(`T`)[1].slice(0,5):`--:--`,y=r?E:te,b=`
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#111111] pb-3 mb-4 gap-2">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-[#111111] font-mono font-black text-xs shadow-[1px_1px_0px_0px_#111111]">
            #${t}
          </span>
          <h3 class="text-base sm:text-lg font-black text-[#111111] lowercase font-sans">
            marathon ${l} films
          </h3>
          <span class="active-badge ${r?``:`hidden`} bg-[#111111] text-white text-[0.65rem] font-mono font-black px-2 py-0.5 rounded-full uppercase">actif</span>
        </div>
        <p class="text-xs text-[#333333] font-medium mt-1 flex items-center gap-2 flex-wrap">
          <span>amplitude : <strong class="text-[#111111] font-mono">${_} ➔ ${v}</strong></span>
          <span>&bull;</span>
          <span>film : <strong class="text-[#111111] font-mono">${i}h${String(a).padStart(2,`0`)}</strong></span>
          <span>&bull;</span>
          <span>pauses : <strong class="text-[#111111] font-mono">${e.total_pause_minutes} min</strong></span>
        </p>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <div class="selection-stamp-container">${D(r)}</div>
        <span class="inline-flex items-center gap-1.5 bg-[#C4B5FD] text-[#111111] text-xs font-mono font-extrabold px-3 py-1 rounded-full border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111]">
          ${s(`w-3.5 h-3.5 text-[#111111]`)}
          <span>score ${Math.round(e.score)}</span>
        </span>
      </div>
    </div>
  `,x=[];for(let t=0;t<e.showtimes.length;t++){let r=e.showtimes[t],i=r.starts_at.split(`T`)[1].slice(0,5),a=w(r.starts_at,15),s=r.ends_at.split(`T`)[1].slice(0,5),l=[];r.version&&(r.version===`VOST`||r.version===`ORIGINAL`)?l.push(`<span class="px-2 py-0.5 rounded-full text-[0.7rem] font-bold border-2 border-[#111111] text-[#111111] bg-[#C4B5FD] shadow-[1px_1px_0px_0px_#111111]">VOSTFR</span>`):r.version&&(r.version===`VF`||r.version===`DUBBED`)&&l.push(`<span class="px-2 py-0.5 rounded-full text-[0.7rem] font-bold border-2 border-[#111111] text-[#111111] bg-[#FAFADF] shadow-[1px_1px_0px_0px_#111111]">VF</span>`),l.push(C(r.format||`Standard`,n));let u=r.cinema_name?`
      <span class="inline-flex items-center gap-1 text-xs text-[#111111] font-bold bg-[#FAFADF] px-2 py-0.5 rounded border border-[#111111]">
        ${f(`w-3 h-3 text-[#111111]`)}
        <span>${S(r.cinema_name)}</span>
      </span>
    `:``,g=r.poster_url?`<img src="${S(r.poster_url)}" alt="${S(r.movie_title)}" class="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />`:`<div class="w-full h-full flex flex-col items-center justify-center text-[#777777] p-1 text-center font-mono text-[0.55rem] font-bold">${o(`w-4 h-4 text-[#111111] mb-0.5`)}<span>affiche</span></div>`,_=`
      <div
        class="poster-thumb w-12 sm:w-14 h-16 sm:h-20 shrink-0 rounded-[6px] border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111] overflow-hidden bg-[#FAFADF] relative group cursor-pointer"
        data-poster-preview="${S(r.poster_url||``)}"
        data-poster-title="${S(r.movie_title)}"
        title="Cliquer pour afficher l'affiche en grand"
      >
        ${g}
        <div class="absolute inset-0 bg-[#111111]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          ${d(`w-4 h-4 text-white`)}
        </div>
      </div>
    `;if(x.push(`
      <div class="bg-white border-2 border-[#111111] rounded-[10px] p-3 shadow-[2px_2px_0px_0px_#111111] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]">
        <div class="flex items-center justify-between gap-3">
          
          <div class="flex items-center gap-3 min-w-0">
            <!-- Poster -->
            ${_}

            <!-- Showtime timing badge -->
            <div class="text-center min-w-[80px] bg-[#FAFADF] border-2 border-[#111111] rounded-[8px] p-1.5 shadow-[2px_2px_0px_0px_#111111] shrink-0">
              <div class="text-base font-black text-[#111111] font-mono tracking-tight leading-none">${i}</div>
              <div class="text-[0.65rem] text-[#E8635A] font-mono font-bold mt-0.5 leading-none" title="Début réel après 15 min de bandes-annonces">
                ~${a} réel
              </div>
              <div class="text-[0.65rem] text-[#555555] font-mono font-medium mt-1 border-t border-[#111111]/30 pt-0.5 leading-none">
                fin ${s}
              </div>
            </div>

            <!-- Movie details -->
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-extrabold text-[#111111] truncate">${S(r.movie_title)}</span>
                ${u}
              </div>
              <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                ${l.join(` `)}
                <button
                  type="button"
                  class="btn-mark-seen text-[0.65rem] font-bold text-[#777777] hover:text-[#E8635A] underline ml-1 cursor-pointer transition-colors"
                  data-movie-title="${S(r.movie_title)}"
                  title="Marquer comme déjà vu pour exclure ce film des recommandations"
                >
                  déjà vu ?
                </button>
              </div>
            </div>
          </div>

          <!-- Step badge -->
          <div class="self-start sm:self-center shrink-0">
            <span class="inline-block px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#FAFADF] text-[#111111] border-2 border-[#111111] shadow-[1px_1px_0px_0px_#111111]">
              séance ${t+1}
            </span>
          </div>

        </div>
      </div>
    `),t<e.showtimes.length-1){let n=e.showtimes[t+1],i=Math.round((new Date(n.starts_at).getTime()-new Date(r.ends_at).getTime())/6e4),a=!!(r.cinema_name&&n.cinema_name&&r.cinema_name!==n.cinema_name),o=`bg-[#4ECDC4]`,s=m(`w-3.5 h-3.5 text-[#111111]`),l=`pause repas / repos`;a?(o=`bg-[#E8635A] text-white`,s=p(`w-3.5 h-3.5 text-white`),l=`changement de cinéma : ${S(r.cinema_name||``)} ➔ ${S(n.cinema_name||``)}`):i<20?(o=`bg-[#FFE566]`,s=c(`w-3.5 h-3.5 text-[#111111]`),l=`transition fluide (buffer pubs ~15m)`):i<45&&(o=`bg-[#C4B5FD]`,s=h(`w-3.5 h-3.5 text-[#111111]`),l=`pause café / étirement`),x.push(`
        <div class="border-l-2 border-dashed border-[#111111] ml-8 my-2 pl-6 py-1.5">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-[#111111] text-xs font-bold ${o} shadow-[2px_2px_0px_0px_#111111] rotate-[-0.5deg]">
            ${s}
            <span class="font-sans">${l}</span>
            <span class="font-mono text-[0.7rem] bg-white/70 text-[#111111] px-1.5 py-0.2 rounded border border-[#111111]">${i} min</span>
          </div>
        </div>
      `)}}return`
    <div class="${y}" data-plan-index="${t}">
      ${b}
      <div class="space-y-2">
        ${x.join(``)}
      </div>
    </div>
  `.trim()}function O(e,t){if(!e||!e.showtimes||e.showtimes.length===0)return`
      <div class="bg-white border-2 border-[#111111] rounded-[14px] p-6 shadow-[6px_6px_0px_0px_#111111] text-center space-y-3">
        <div class="w-12 h-12 mx-auto rounded-full bg-[#FAFADF] border-2 border-[#111111] flex items-center justify-center text-[#111111] shadow-[2px_2px_0px_0px_#111111]">
          ${_(`w-6 h-6 text-[#111111]`)}
        </div>
        <h4 class="font-extrabold text-sm text-[#111111] lowercase font-sans">aucun ticket généré</h4>
        <p class="text-xs text-[#555555]">
          sélectionne un ou plusieurs cinémas pour composer ton ticket de marathon.
        </p>
      </div>
    `;let n=e.showtimes.length,r=Math.floor(e.total_movie_minutes/60),i=e.total_movie_minutes%60,a=T(e,t),o=e.showtimes[0],c=e.showtimes[n-1],l=o?o.starts_at.split(`T`)[1].slice(0,5):`--:--`,u=c?c.ends_at.split(`T`)[1].slice(0,5):`--:--`,d=o?o.date_str:``,f=Math.abs(Math.sin(e.score)*1e6|0).toString().padStart(6,`0`),p=e.showtimes.map(e=>{let t=e.starts_at.split(`T`)[1].slice(0,5),n=e.format||`Standard`;return`
      <div class="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-[#111111]/20">
        <div class="truncate max-w-[170px] font-medium flex items-center gap-1.5">
          <span class="font-mono font-bold text-[#E8635A]">${t}</span>
          <span class="truncate">${S(e.movie_title)}</span>
        </div>
        <div class="text-[0.65rem] font-mono text-[#555555] shrink-0">${S(n)}</div>
      </div>
    `}).join(``);return`
    <div class="bg-white border-2 border-[#111111] rounded-[14px] p-5 shadow-[6px_6px_0px_0px_#111111] relative overflow-hidden font-sans space-y-4">
      <!-- Perforation notches -->
      <div class="absolute -left-3 top-24 w-6 h-6 rounded-full bg-[#FAFADF] border-2 border-[#111111]"></div>
      <div class="absolute -right-3 top-24 w-6 h-6 rounded-full bg-[#FAFADF] border-2 border-[#111111]"></div>

      <!-- Ticket Header -->
      <div class="text-center border-b-2 border-dashed border-[#111111] pb-3">
        <div class="flex items-center justify-center gap-1.5 text-xs font-mono font-extrabold uppercase tracking-widest text-[#555555]">
          ${s(`w-3 h-3 text-[#111111]`)}
          <span>ticket de marathon</span>
          ${s(`w-3 h-3 text-[#111111]`)}
        </div>
        <h4 class="text-lg font-black text-[#111111] font-sans lowercase mt-0.5">
          cinépass pop-ticket
        </h4>
        <div class="flex justify-between items-center text-[0.7rem] font-mono text-[#555555] mt-1">
          <span>DATE : ${d}</span>
          <span>N° ${f}</span>
        </div>
      </div>

      <!-- Movies list -->
      <div>
        <div class="text-[0.65rem] font-extrabold font-mono uppercase text-[#555555] mb-1">
          programme (${n} séances)
        </div>
        ${p}
      </div>

      <!-- Statistics summary -->
      <div class="border-t-2 border-dashed border-[#111111] pt-3 space-y-1.5 text-xs">
        <div class="flex justify-between">
          <span class="text-[#555555]">amplitude marathon :</span>
          <span class="font-mono font-bold text-[#111111]">${l} ➔ ${u}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#555555]">durée totale de film :</span>
          <span class="font-mono font-bold text-[#111111]">${r}h${String(i).padStart(2,`0`)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#555555]">durée totale de pauses :</span>
          <span class="font-mono font-bold text-[#111111]">${e.total_pause_minutes} min</span>
        </div>
        <div class="flex justify-between items-center border-t border-dashed border-[#111111]/30 pt-1.5 font-bold">
          <span class="text-[#111111]">suppléments formule :</span>
          <span class="font-mono text-sm ${a>0?`text-[#E8635A]`:`text-[#4ECDC4]`}">
            ${a>0?`+${a.toFixed(2)} €`:`0,00 € (inclus)`}
          </span>
        </div>
      </div>

      <!-- Barcode decoration -->
      <div class="text-center pt-2">
        <div class="font-mono text-xl tracking-[0.25em] text-[#111111] select-none leading-none overflow-hidden h-7">
          |||||||||||||||||||||||||||||||||||||||||
        </div>
        <div class="text-[0.65rem] font-mono text-[#555555] tracking-widest mt-1">
          ${f} 202610 994
        </div>
      </div>

      <!-- Export CTA button -->
      <div class="pt-1">
        <button id="btn-export-ics" class="w-full bg-[#E8635A] text-white border-2 border-[#111111] rounded-[10px] py-2.5 px-4 font-bold text-xs shadow-[3px_3px_0px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#111111] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer font-sans">
          ${g(`w-4 h-4 text-white`)}
          <span>exporter le marathon (.ics)</span>
        </button>
      </div>
    </div>
  `.trim()}var k=`cinepass_planner_prefs_v1`,A=null;function re(){if(A!==null)return A;if(typeof window>`u`)return{};try{let e=localStorage.getItem(k);return e?(A=JSON.parse(e),A||{}):(A={},A)}catch(e){return console.error(`Failed to load preferences from localStorage`,e),A={},A}}function ie(e){if(A=e,typeof window<`u`)try{localStorage.setItem(k,JSON.stringify(e))}catch(e){console.error(`Failed to save preferences to localStorage`,e)}}function ae(){if(A={},typeof window<`u`)try{localStorage.removeItem(k)}catch(e){console.error(`Failed to clear preferences from localStorage`,e)}}var j=`/`.replace(/\/?$/,`/`),M=[],N=[],P={},F=new Map,I=new Set,L=new Set,R=new Set,z=[],B=0,V=`optimal`,H=``,U=``,W=null,G=null;function K(e=50){W&&clearTimeout(W),e===0?$():W=setTimeout(()=>{$()},e)}function oe(e=250){G&&clearTimeout(G),G=setTimeout(()=>{me()},e)}var se=new r;async function ce(){let e=re(),t=new URLSearchParams(window.location.search),n=t.get(`city`)||e.city,r=t.get(`pass`)||e.pass_formula,i=t.get(`lang`)||e.language,a=t.get(`count`),o=a?parseInt(a,10):e.target_count;e.scenario&&(V=e.scenario),e.seen_movies&&Array.isArray(e.seen_movies)&&e.seen_movies.forEach(e=>R.add(e)),e.priority_movies&&Array.isArray(e.priority_movies)&&e.priority_movies.forEach(e=>L.add(e));try{let[t,a]=await Promise.all([fetch(`${j}data/cinemas.json`),fetch(`${j}data/dates.json`)]);M=await t.json(),N=await a.json();let s=document.getElementById(`select-city`),c=Array.from(new Set(M.map(e=>e.city).filter(Boolean))).sort();for(let e of c){let t=document.createElement(`option`);t.value=e,t.textContent=e,s.appendChild(t)}n&&(n===`Toutes`||c.includes(n))&&(s.value=n);let l=document.getElementById(`select-date`);l.innerHTML=``;let u=new Date().toISOString().slice(0,10);if(N.length===0){let e=document.createElement(`option`);e.value=``,e.textContent=`Aucune séance disponible`,l.appendChild(e)}else{for(let e of N){let t=document.createElement(`option`);t.value=e,t.textContent=new Date(e+`T12:00:00`).toLocaleDateString(`fr-FR`,{weekday:`long`,day:`numeric`,month:`long`}),l.appendChild(t)}l.value=N.find(e=>e>=u)||N[0]||``}if(r){let e=document.querySelector(`input[name="pass-type"][value="${r}"]`);e&&(e.checked=!0)}if(e.allow_supplements!==void 0&&(document.getElementById(`check-supplements`).checked=e.allow_supplements),i){let e=document.querySelector(`input[name="lang-filter"][value="${i}"]`);e&&(e.checked=!0)}if(o&&(document.getElementById(`range-count`).value=String(o),document.getElementById(`target-count-val`).textContent=`${o} films`),e.start_time&&(document.getElementById(`input-start`).value=e.start_time),e.end_time&&(document.getElementById(`input-end`).value=e.end_time),e.require_meal!==void 0&&(document.getElementById(`check-meal`).checked=e.require_meal),e.min_buffer!==void 0&&(document.getElementById(`input-buffer`).value=String(e.min_buffer)),e.selected_formats&&document.querySelectorAll(`.format-check`).forEach(t=>{t.checked=e.selected_formats.includes(t.value)}),e.selected_cinemas&&e.selected_cinemas.length>0){let t=new Set(M.map(e=>e.id));e.selected_cinemas.forEach(e=>{t.has(e)&&I.add(e)})}I.size===0&&M.length>0&&I.add(M[0].id),q(),J(),X(),he(),await le()}catch(e){console.error(`Failed to initialize planner`,e);let t=document.getElementById(`results-container`);t.innerHTML=`
            <div class="neo-card bg-[#F9A8B8] p-6 text-center text-xs text-[#111111] font-bold flex flex-col items-center gap-2">
              ${v(`w-6 h-6 text-[#111111]`)}
              <span>Impossible de charger les séances pour le moment. Veuillez vérifier votre connexion ou réessayer plus tard.</span>
            </div>
          `}}function q(){document.querySelectorAll(`.scenario-tab`).forEach(e=>{let t=e.getAttribute(`data-scenario`),n=t===`optimal`,r=t===`same_cinema`,i=n?c(`w-3.5 h-3.5`):r?l(`w-3.5 h-3.5`):u(`w-3.5 h-3.5`),a=n?`itinéraire optimal`:r?`zéro changement`:`pauses courtes`;e.className=t===V?`scenario-tab neo-btn px-4 py-2 rounded-full text-xs font-bold bg-[#FFE566] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111] flex items-center gap-2 shrink-0 cursor-pointer`:`scenario-tab neo-btn px-4 py-2 rounded-full text-xs font-bold bg-white text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_0px_#111111] flex items-center gap-2 shrink-0 hover:bg-[#FAFADF] cursor-pointer`,e.innerHTML=`${i}<span>${a}</span>`})}function J(){let e=document.getElementById(`select-city`).value,t=document.getElementById(`cinemas-list`);t.innerHTML=``;let n=H.trim().toLowerCase(),r=M.filter(t=>{if(n){let r=t.name.toLowerCase().includes(n)||t.city.toLowerCase().includes(n),i=I.has(t.id);return e!==`Toutes`&&t.city!==e&&!i?!1:r||i}return e===`Toutes`||t.city===e||I.has(t.id)});if(r.sort((e,t)=>{let n=+!!I.has(e.id),r=+!!I.has(t.id);return n===r?e.name.localeCompare(t.name):r-n}),r.length===0)t.innerHTML=`<p class="text-[#777777] text-center py-4 font-mono text-xs">aucun cinéma trouvé pour "${H}"</p>`,Y();else{for(let e of r){let n=I.has(e.id),r=document.createElement(`label`);r.className=`flex items-center justify-between gap-2 p-1.5 rounded-[6px] border border-transparent hover:border-[#111111] hover:bg-white cursor-pointer text-xs transition-colors ${n?`bg-[#FFE566]/30 font-bold border-[#111111]/40`:``}`,r.innerHTML=`
            <div class="flex items-center gap-2 truncate">
              <input type="checkbox" value="${e.id}" class="cinema-checkbox w-3.5 h-3.5 accent-[#E8635A] rounded border border-[#111111] cursor-pointer" ${n?`checked`:``} />
              <span class="truncate ${n?`text-[#111111] font-bold`:`text-[#333333]`}">${e.name}</span>
            </div>
            <span class="text-[0.65rem] text-[#777777] font-mono shrink-0">${e.city}</span>
          `;let i=r.querySelector(`input`);i.addEventListener(`change`,()=>{i.checked?I.add(e.id):I.delete(e.id),Y(),Z(),$()}),t.appendChild(r)}Y()}}function Y(){let e=document.getElementById(`selected-cinemas-count`);e.textContent=`${I.size} sélectionné${I.size>1?`s`:``}`}function X(){let e=document.getElementById(`seen-movies-container`),t=document.getElementById(`seen-movies-count`),n=document.getElementById(`btn-clear-seen`);if(e.innerHTML=``,t.textContent=`${R.size} exclu${R.size>1?`s`:``}`,R.size===0)e.innerHTML=`<span class="text-[0.7rem] text-[#777777] italic py-1">aucun film exclu. clique sur "déjà vu ?" sur une séance pour l'écarter.</span>`,n.classList.add(`hidden`);else{n.classList.remove(`hidden`);for(let t of Array.from(R).sort()){let n=document.createElement(`span`);n.className=`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FAFADF] text-[#111111] border-2 border-[#111111] shadow-[1px_1px_0px_0px_#111111]`,n.innerHTML=`
            <span class="line-through opacity-85 truncate max-w-[150px]">${t}</span>
            <button type="button" class="cursor-pointer text-[#E8635A] hover:scale-125 transition-transform font-black" title="Réintégrer ce film dans l'algorithme">✕</button>
          `,n.querySelector(`button`).addEventListener(`click`,()=>{R.delete(t),X(),$()}),e.appendChild(n)}}}async function le(){let e=document.getElementById(`select-date`).value;if(!e)P={},Z(),K(0);else if(F.has(e))P=F.get(e),Z(),K(0);else{try{let t=await fetch(`${j}data/showtimes-${e}.json`);if(t.ok){let n=await t.json();F.set(e,n),P=n}else P={}}catch{P={}}Z(),K(0)}}function Z(){let e=document.getElementById(`priority-movies-container`),t=document.getElementById(`priority-movies-count`),n=document.getElementById(`btn-clear-priority`);e.innerHTML=``;let r=new Set;for(let e of I){let t=P[e]||[];for(let e of t)e.title&&r.add(e.title)}let i=Array.from(r).sort();if(t.textContent=`${L.size} sélectionné${L.size>1?`s`:``}`,L.size>0?n.classList.remove(`hidden`):n.classList.add(`hidden`),i.length===0){e.innerHTML=`<span class="text-[#777777] text-xs font-mono py-3 text-center w-full">aucun film trouvé pour ce filtre.</span>`;return}let a=document.createDocumentFragment();for(let e of i){let t=L.has(e),n=R.has(e),r=document.createElement(`button`);r.type=`button`,r.setAttribute(`data-movie-title`,e),r.setAttribute(`data-clean-title`,e.toLowerCase()),r.className=`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 border-[#111111] transition-all cursor-pointer ${t?`bg-[#FFE566] text-[#111111] shadow-[2px_2px_0px_0px_#111111]`:n?`bg-gray-100 text-[#888888] line-through border-gray-400 opacity-60`:`bg-white text-[#111111] shadow-[1px_1px_0px_0px_#111111] hover:bg-[#FAFADF]`}`,r.innerHTML=`${t?s(`w-3 h-3 text-[#111111]`):``}<span>${e}</span>`,r.addEventListener(`click`,()=>{L.has(e)?L.delete(e):(L.add(e),R.delete(e),X()),Z(),K(0)}),a.appendChild(r)}e.appendChild(a),ue()}function ue(){let e=document.getElementById(`priority-movies-container`),t=U.trim().toLowerCase(),n=e.querySelectorAll(`button[data-clean-title]`),r=0;n.forEach(e=>{let n=e.getAttribute(`data-clean-title`)||``,i=!t||n.includes(t);e.classList.toggle(`hidden`,!i),i&&r++});let i=`priority-filter-empty-msg`,a=document.getElementById(i);n.length>0&&r===0?a||(a=document.createElement(`span`),a.id=i,a.className=`text-[#777777] text-xs font-mono py-3 text-center w-full`,a.textContent=`aucun film trouvé pour ce filtre.`,e.appendChild(a)):a&&a.remove()}function de(e,t){if(!e)return;let n=document.getElementById(`poster-modal`),r=document.getElementById(`modal-poster-img`),i=document.getElementById(`modal-poster-title`);r.src=e,i.textContent=t,n.classList.remove(`hidden`)}function Q(){document.getElementById(`poster-modal`).classList.add(`hidden`)}function fe(t){if(!z||z.length===0||t<0||t>=z.length)return;B=t;let n=document.querySelector(`input[name="pass-type"]:checked`)?.value||`Gold`,r=n===`Gold`?e.GOLD:n===`Silver`?e.SILVER:e.UNDER26;document.querySelectorAll(`#results-container [data-plan-index]`).forEach((e,t)=>{let n=t===B;e.className=n?E:te;let r=e.querySelector(`.selection-stamp-container`);r&&(r.innerHTML=D(n));let i=e.querySelector(`.active-badge`);i&&i.classList.toggle(`hidden`,!n)});let i=document.getElementById(`thermal-receipt-container`),a=z[B]||z[0];i.innerHTML=O(a,r);let o=document.getElementById(`btn-export-ics`);o&&a&&o.addEventListener(`click`,e=>{e.stopPropagation(),pe(a)})}function $(){oe(250);let t=document.getElementById(`select-date`).value,n=document.getElementById(`results-container`),r=document.getElementById(`results-header`),i=document.getElementById(`thermal-receipt-container`),a=document.querySelector(`input[name="pass-type"]:checked`)?.value||`Gold`,o=a===`Gold`?e.GOLD:a===`Silver`?e.SILVER:e.UNDER26;if(I.size===0){r.innerHTML=``,n.innerHTML=`
            <div class="neo-card p-8 text-center text-[#555555] space-y-2">
              <div class="w-10 h-10 mx-auto rounded-full bg-[#FAFADF] border-2 border-[#111111] flex items-center justify-center">
                ${l(`w-5 h-5 text-[#111111]`)}
              </div>
              <p class="font-bold text-xs text-[#111111]">Veuillez sélectionner au moins un cinéma dans le panneau latéral pour composer votre marathon.</p>
            </div>
          `,i.innerHTML=O(null,o);return}if(!t){r.innerHTML=``,n.innerHTML=`
            <div class="neo-card p-8 text-center text-[#555555]">
              Veuillez sélectionner une date.
            </div>
          `,i.innerHTML=O(null,o);return}let s=new Date().toISOString().slice(0,10),c=``;t<s&&(c=`
            <div class="neo-card bg-[#FFE566] p-3.5 mb-4 text-xs font-bold text-[#111111] flex items-center gap-3">
              <span class="p-1 rounded-[4px] bg-white border border-[#111111] shrink-0">
                ${v(`w-4 h-4 text-[#111111]`)}
              </span>
              <div>
                <strong>Attention :</strong> La date sélectionnée (<strong>${t}</strong>) est déjà passée. Choisissez une date à venir pour organiser votre marathon.
              </div>
            </div>
          `);let u=[],d=new Map(M.map(e=>[e.id,e.name]));for(let e of I){let n=P[e]||[],r=d.get(e)||e;for(let i of n)u.push({cinema_id:e,movie_title:i.title,starts_at:i.starts_at,ends_at:i.ends_at,date_str:t,version:i.version||`ORIGINAL`,format:i.format||`Standard`,cinema_name:r,poster_url:i.poster_url||``})}if(u.length===0){r.innerHTML=``,n.innerHTML=`
            ${c}
            <div class="neo-card bg-[#F9A8B8] p-6 text-center text-xs font-bold text-[#111111] flex flex-col items-center gap-2">
              ${v(`w-5 h-5 text-[#111111]`)}
              <span>Aucune séance trouvée pour les cinémas sélectionnés à la date du ${t}.</span>
            </div>
          `,i.innerHTML=O(null,o);return}let f=document.getElementById(`check-supplements`).checked,p=document.querySelector(`input[name="lang-filter"]:checked`)?.value||`ALL`,m=parseInt(document.getElementById(`range-count`).value,10)||3,h=document.getElementById(`input-start`).value||`10:00`,g=document.getElementById(`input-end`).value||`23:00`,_=document.getElementById(`check-meal`).checked,y=parseInt(document.getElementById(`input-buffer`).value,10)||15,b=[];document.querySelectorAll(`.format-check:checked`).forEach(e=>{b.push(e.value)});let x={cinema_ids:Array.from(I),date_str:t,target_films_count:m,start_time:h,max_end_time:g,priority_movies:Array.from(L),seen_movies:Array.from(R),pass_type:o,allow_supplements:f,min_buffer_minutes:y,require_meal_break:_,language:p,selected_formats:b},S=se.generatePlans(u,x);if(V===`same_cinema`?S.sort((e,t)=>{let n=new Set(e.showtimes.map(e=>e.cinema_id)).size,r=new Set(t.showtimes.map(e=>e.cinema_id)).size;return n===r?t.score-e.score:n-r}):V===`short_breaks`?S.sort((e,t)=>e.total_pause_minutes===t.total_pause_minutes?t.score-e.score:e.total_pause_minutes-t.total_pause_minutes):S.sort((e,t)=>t.score-e.score),z=S,S.length===0){r.innerHTML=``,n.innerHTML=`
            ${c}
            <div class="neo-card bg-[#F9A8B8] p-6 text-center text-xs text-[#111111] leading-relaxed font-bold space-y-2">
              <div class="w-8 h-8 mx-auto rounded-full bg-white border border-[#111111] flex items-center justify-center">
                ${v(`w-4 h-4 text-[#111111]`)}
              </div>
              <p>Aucun itinéraire complet ne correspond à toutes vos contraintes.</p>
              <p class="font-normal text-[0.7rem] text-[#333333]">Astuce : élargis l'amplitude horaire, réintègre certains films déjà vus ou décoche la pause repas obligatoire.</p>
            </div>
          `,i.innerHTML=O(null,o);return}B>=S.length&&(B=0);let C=I.size>1?`sur ${I.size} cinémas`:`dans votre cinéma`;r.innerHTML=`<span class="inline-flex items-center gap-1.5">${ee(`w-4 h-4 text-[#111111]`)}<strong>${S.length} proposition${S.length>1?`s`:``} d'itinéraires</strong> trouvée${S.length>1?`s`:``} ${C} !</span>`;let w=S.map((e,t)=>ne(e,t+1,o,t===B)).join(``);n.innerHTML=c+w;let T=S[B]||S[0];i.innerHTML=O(T,o),document.querySelectorAll(`#results-container [data-plan-index]`).forEach(e=>{e.addEventListener(`click`,t=>{let n=t.target;n.closest(`.poster-thumb`)||n.closest(`.btn-mark-seen`)||fe(parseInt(e.getAttribute(`data-plan-index`)||`1`,10)-1)})}),document.querySelectorAll(`.poster-thumb`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),de(e.getAttribute(`data-poster-preview`)||``,e.getAttribute(`data-poster-title`)||``)})}),document.querySelectorAll(`.btn-mark-seen`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation();let n=e.getAttribute(`data-movie-title`);n&&(R.add(n),L.delete(n),X(),Z(),K(0))})});let E=document.getElementById(`btn-export-ics`);E&&T&&E.addEventListener(`click`,e=>{e.stopPropagation(),pe(T)})}function pe(e){if(!e||e.showtimes.length===0)return;function t(e){return e.replace(/[-:]/g,``).replace(`.000`,``)+`Z`}let n=[`BEGIN:VCALENDAR`,`VERSION:2.0`,`PRODID:-//CinePass Planner//FR`,`CALSCALE:GREGORIAN`,`METHOD:PUBLISH`,e.showtimes.map((e,n)=>{let r=t(e.starts_at),i=t(e.ends_at),a=`cinepass-${Date.now()}-${n}@cinepass-planner.local`,o=`CinéPass : ${e.movie_title} (${e.format||`Standard`})`,s=e.cinema_name||`Cinéma`,c=`Séance ${n+1} du marathon CinéPass.\nCinéma : ${e.cinema_name}\nFormat : ${e.format}\nVersion : ${e.version||`Standard`}.`;return[`BEGIN:VEVENT`,`UID:${a}`,`DTSTAMP:${r}`,`DTSTART:${r}`,`DTEND:${i}`,`SUMMARY:${o}`,`LOCATION:${s}`,`DESCRIPTION:${c.replace(/\n/g,`\\n`)}`,`STATUS:CONFIRMED`,`END:VEVENT`].join(`\r
`)}).join(`\r
`),`END:VCALENDAR`].join(`\r
`),r=new Blob([n],{type:`text/calendar;charset=utf-8`}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.href=i;let o=e.showtimes[0]?.date_str||`marathon`;a.setAttribute(`download`,`marathon-cinepass-${o}.ics`),document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(i)}function me(){let e=document.getElementById(`select-city`)?.value,t=document.querySelector(`input[name="pass-type"]:checked`)?.value,n=document.getElementById(`check-supplements`)?.checked,r=document.querySelector(`input[name="lang-filter"]:checked`)?.value,i=parseInt(document.getElementById(`range-count`)?.value,10),a=document.getElementById(`input-start`)?.value,o=document.getElementById(`input-end`)?.value,s=document.getElementById(`check-meal`)?.checked,c=parseInt(document.getElementById(`input-buffer`)?.value,10),l=[];document.querySelectorAll(`.format-check:checked`).forEach(e=>{l.push(e.value)}),ie({city:e,selected_cinemas:Array.from(I),pass_formula:t,allow_supplements:n,language:r,selected_formats:l,target_count:i,start_time:a,end_time:o,require_meal:s,min_buffer:c,scenario:V,seen_movies:Array.from(R),priority_movies:Array.from(L)});try{let n=new URLSearchParams;e&&e!==`Toutes`&&n.set(`city`,e),t&&n.set(`pass`,t),r&&r!==`ALL`&&n.set(`lang`,r),i&&n.set(`count`,String(i));let a=n.toString()?`?${n.toString()}`:``;if(window.location.search!==a){let e=a||window.location.pathname;window.history.replaceState({},``,e)}}catch{}}function he(){document.getElementById(`btn-close-poster-modal`).addEventListener(`click`,Q),document.getElementById(`poster-modal`).addEventListener(`click`,e=>{e.target===document.getElementById(`poster-modal`)&&Q()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&Q()}),document.getElementById(`btn-clear-priority`).addEventListener(`click`,()=>{L.clear(),Z(),K(0)}),document.getElementById(`btn-clear-seen`).addEventListener(`click`,()=>{R.clear(),X(),Z(),K(0)});let e=document.getElementById(`input-priority-filter`);e.addEventListener(`input`,()=>{U=e.value,ue()});let t=document.getElementById(`btn-toggle-filters-mobile`),n=document.getElementById(`filter-panel-card`),r=document.getElementById(`text-toggle-filters`);t&&n&&r&&t.addEventListener(`click`,()=>{n.classList.contains(`hidden`)?(n.classList.remove(`hidden`),r.textContent=`masquer filtres`):(n.classList.add(`hidden`),r.textContent=`afficher filtres`)});let i=document.getElementById(`input-cinema-search`),a=document.getElementById(`btn-clear-search`),o=null;i.addEventListener(`input`,()=>{H=i.value,H?a.classList.remove(`hidden`):a.classList.add(`hidden`),o&&clearTimeout(o),o=setTimeout(()=>{J()},60)}),a.addEventListener(`click`,()=>{i.value=``,H=``,a.classList.add(`hidden`),J(),i.focus()}),document.getElementById(`btn-select-all-city`).addEventListener(`click`,()=>{document.querySelectorAll(`.cinema-checkbox`).forEach(e=>{e.checked=!0,I.add(e.value)}),Y(),Z(),K(0)}),document.querySelectorAll(`.scenario-tab`).forEach(e=>{e.addEventListener(`click`,()=>{V=e.getAttribute(`data-scenario`)||`optimal`,B=0,q(),K(0)})}),document.getElementById(`select-city`).addEventListener(`change`,()=>{J(),K(0)}),document.getElementById(`select-date`).addEventListener(`change`,()=>{le()}),document.querySelectorAll(`input[name="pass-type"]`).forEach(e=>{e.addEventListener(`change`,()=>K(0))}),document.getElementById(`check-supplements`).addEventListener(`change`,()=>K(0)),document.querySelectorAll(`input[name="lang-filter"]`).forEach(e=>{e.addEventListener(`change`,()=>K(0))}),document.querySelectorAll(`.format-check`).forEach(e=>{e.addEventListener(`change`,()=>K(0))});let s=document.getElementById(`range-count`),c=null;s.addEventListener(`input`,()=>{document.getElementById(`target-count-val`).textContent=`${s.value} films`,c&&clearTimeout(c),c=setTimeout(()=>{$()},60)}),document.getElementById(`input-start`).addEventListener(`change`,()=>K(0)),document.getElementById(`input-end`).addEventListener(`change`,()=>K(0)),document.getElementById(`check-meal`).addEventListener(`change`,()=>K(0)),document.getElementById(`input-buffer`).addEventListener(`change`,()=>K(0)),document.getElementById(`btn-reset`).addEventListener(`click`,()=>{ae(),location.reload()})}ce();