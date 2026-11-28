export function animateWillChange(e) {
  const el = e.currentTarget;
  el.classList.add('is-animating');
}

export function clearWillChange(e) {
  e.currentTarget.classList.remove('is-animating');
}
