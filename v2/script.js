// ============================================
// SWARAJ BARAL PORTFOLIO V2 - JavaScript
// ============================================

// Custom Cursor
const cursor = document.querySelector('.cursor');
const cursorFollower = document.querySelector('.cursor-follower');

if (cursor && cursorFollower) {
  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;
  let followerX = 0;
  let followerY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Smooth cursor animation
  function animateCursor() {
    // Cursor (fast)
    cursorX += (mouseX - cursorX) * 0.2;
    cursorY += (mouseY - cursorY) * 0.2;
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';

    // Follower (slower)
    followerX += (mouseX - followerX) * 0.1;
    followerY += (mouseY - followerY) * 0.1;
    cursorFollower.style.left = followerX + 'px';
    cursorFollower.style.top = followerY + 'px';

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  // Hover effects for interactive elements
  const interactiveElements = document.querySelectorAll('a, button, .project, .skill');

  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursorFollower.classList.add('hover');
    });
    el.addEventListener('mouseleave', () => {
      cursorFollower.classList.remove('hover');
    });
  });
}

// ============================================
// Smooth Scroll for Navigation
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ============================================
// Scroll Animations
// ============================================

const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observerCallback = (entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Optionally stop observing after animation
      // observer.unobserve(entry.target);
    }
  });
};

const observer = new IntersectionObserver(observerCallback, observerOptions);

// Observe elements for scroll animations
document.querySelectorAll('.project, .skill, .section-header').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// Add visible styles
const style = document.createElement('style');
style.textContent = `
  .visible {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(style);

// ============================================
// Staggered Animation for Projects
// ============================================

const projects = document.querySelectorAll('.project');
projects.forEach((project, index) => {
  project.style.transitionDelay = `${index * 0.1}s`;
});

const skills = document.querySelectorAll('.skill');
skills.forEach((skill, index) => {
  skill.style.transitionDelay = `${index * 0.05}s`;
});

// ============================================
// Header Background on Scroll
// ============================================

const header = document.querySelector('.header');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;

  if (currentScrollY > 100) {
    header.style.background = 'rgba(0, 0, 0, 0.9)';
    header.style.backdropFilter = 'blur(10px)';
  } else {
    header.style.background = 'transparent';
    header.style.backdropFilter = 'none';
  }

  lastScrollY = currentScrollY;
});

// ============================================
// Magnetic Effect for Buttons (Optional Enhancement)
// ============================================

const magneticElements = document.querySelectorAll('.btn-primary');

magneticElements.forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'translate(0, 0)';
  });
});

// ============================================
// Project Image Parallax on Hover
// ============================================

const projectImages = document.querySelectorAll('.project-image img');

projectImages.forEach(img => {
  const parent = img.closest('.project-link');

  parent.addEventListener('mousemove', (e) => {
    const rect = parent.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    img.style.transform = `scale(1.05) translate(${x * 10}px, ${y * 10}px)`;
  });

  parent.addEventListener('mouseleave', () => {
    img.style.transform = 'scale(1)';
  });
});

// ============================================
// Console Easter Egg
// ============================================

console.log('%c👋 Hey there, curious developer!', 'font-size: 20px; font-weight: bold;');
console.log('%cLike what you see? Let\'s connect!', 'font-size: 14px;');
console.log('%chttps://github.com/SwarajBaral', 'font-size: 12px; color: #c8ff00;');
