document.querySelectorAll('[data-carousel]').forEach(car => {
  let index = 0;
  const slides = [...car.querySelectorAll('.slide')];
  const dots = [...car.querySelectorAll('.dot')];
  if (!slides.length) return;
  function draw() {
    slides.forEach((slide, n) => slide.classList.toggle('active', n === index));
    dots.forEach((dot, n) => {
      dot.classList.toggle('active', n === index);
      dot.setAttribute('aria-current', String(n === index));
    });
  }
  car.querySelector('.prev')?.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; draw(); });
  car.querySelector('.next')?.addEventListener('click', () => { index = (index + 1) % slides.length; draw(); });
  dots.forEach((dot, n) => {
    dot.setAttribute('role', 'button'); dot.tabIndex = 0;
    dot.setAttribute('aria-label', `Ver fotografía ${n + 1}`);
    dot.addEventListener('click', () => { index = n; draw(); });
    dot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); index = n; draw(); } });
  });
  draw();
});
