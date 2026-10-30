/* FORGE plan accordion: match the other plan tiles without changing manual-plan logic. */
(function () {
  'use strict';
  document.title = 'FORGE';

  function matchPlanTile() {
    var tile = document.querySelector('#plan > details.forge-manual-plan');
    if (!tile) return;

    // Reuse the same card + summary layout and green chevron as neighboring tiles.
    tile.classList.add('forge-disclosure');
    var summary = tile.querySelector(':scope > summary');
    if (summary) summary.textContent = 'Trainingsplan individuell';

    if (document.getElementById('forge-plan-individual-style')) return;
    var style = document.createElement('style');
    style.id = 'forge-plan-individual-style';
    style.textContent = [
      '#plan > details.forge-manual-plan.forge-disclosure{padding:0!important;}',
      '#plan > details.forge-manual-plan.forge-disclosure > summary{',
      'color:#f0f5f3!important;font-size:17px!important;font-weight:750;',
      'display:flex;align-items:center;justify-content:space-between;gap:12px;',
      'min-height:68px;padding:19px!important;list-style:none;cursor:pointer;',
      '}',
      '#plan > details.forge-manual-plan.forge-disclosure > summary::-webkit-details-marker{display:none;}',
      '#plan > details.forge-manual-plan.forge-disclosure > summary::after{',
      'content:"⌄";color:#a8f55d!important;font-size:24px;',
      'margin-left:auto;flex-shrink:0;line-height:1;',
      '}',
      '#plan > details.forge-manual-plan.forge-disclosure[open] > summary::after{transform:rotate(180deg);}'
    ].join('');
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', matchPlanTile, {once:true});
  } else {
    matchPlanTile();
  }
})();
