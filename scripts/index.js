// Elements
const resumeButton = document.querySelector(".cta");
const scrollIndicator = document.querySelector(".scroll-indicator");

// Scroll behavior
window.onscroll = () => {
  const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;

  // Resume button - show fixed when scrolled
  if (scrollTop > 100) {
    resumeButton.classList.add('cta-scroll');
  } else {
    resumeButton.classList.remove('cta-scroll');
  }

  // Scroll indicator - hide when scrolled
  if (scrollIndicator) {
    if (scrollTop > 50) {
      scrollIndicator.classList.add('hidden');
    } else {
      scrollIndicator.classList.remove('hidden');
    }
  }
};

// Hide custom cursor when Typed.js loads
const customCursor = document.querySelector('.typed-cursor');

// Typed.js configuration
const options = {
  strings: ['Web apps', 'Scalable backends', 'Fullstack Applications'],
  typeSpeed: 60,
  backSpeed: 20,
  smartBackspace: true,
  loop: true,
  showCursor: true,
  cursorChar: '|',
  onBegin: function() {
    if (customCursor) {
      customCursor.style.display = 'none';
    }
  }
};

const typed = new Typed('.typed-element', options);
