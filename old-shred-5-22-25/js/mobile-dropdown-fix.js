// js/mobile-dropdown-fix.js
// Makes the exercise-category accordions work on iOS Safari (and everywhere else).

document.addEventListener('DOMContentLoaded', () => {
  // Attach the handler to every category header that will ever exist
  document.querySelectorAll('.category-header').forEach(bindToggle);

  // If categories are added later by JS, watch for them too
  const observer = new MutationObserver(muts => {
    muts.forEach(m =>
      m.addedNodes.forEach(n =>
        n.classList?.contains('category-header') && bindToggle(n)
      )
    );
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function bindToggle(header) {
    // prevent double-binding
    if (header.dataset.bound) return;
    header.dataset.bound = 'true';

    /* click fires on desktop; touchend fires immediately on iOS Safari
       (avoids the 300 ms delay and double-fire issues) */
    ['click', 'touchend'].forEach(evt =>
      header.addEventListener(evt, e => {
        e.preventDefault(); // stops accidental text-selection / double tap zoom
        const wrap = header.nextElementSibling; // .exercises-container
        const chevron = header.querySelector('.chevron-icon');

        wrap.classList.toggle('expanded');
        chevron?.classList.toggle('expanded');
      })
    );
  }
});