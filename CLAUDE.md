# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website hosted on GitHub Pages (swarajbaral.github.io). Static single-page application with a refined editorial/luxe tech aesthetic, built with vanilla HTML, CSS, and JavaScript.

## Architecture

### File Structure
- `index.html` - Single-page portfolio with semantic HTML5 sections
- `style.css` - Modern CSS with custom properties, grid layouts, and animations
- `scripts/index.js` - JavaScript for scroll behavior and typing animation
- `resume.pdf` - Downloadable resume file

### Design System (style.css)

**Color Palette** (CSS custom properties in :root):
- `--color-bg`: #0a0a0b (deep charcoal)
- `--color-bg-elevated`: #111113
- `--color-bg-card`: #161618
- `--color-text`: #f5f0e8 (warm cream)
- `--color-accent`: #ff5f45 (electric coral)
- `--color-accent-gold`: #c9a962

**Typography**:
- Display: Syne (Google Fonts) - for headings and hero
- Body: DM Sans (Google Fonts) - for body text and UI

**Spacing Scale**: xs (0.5rem) -> sm (1rem) -> md (1.5rem) -> lg (2.5rem) -> xl (4rem) -> 2xl (6rem) -> 3xl (10rem)

**Responsive Breakpoints**:
- 1024px - Tablet (4-column skills grid, 2-column projects)
- 768px - Mobile landscape (3-column skills, 1-column projects)
- 480px - Mobile portrait (compact spacing)

### Key Components

**HTML Sections**:
- `.nav` - Fixed navigation with logo and links
- `.hero` (#welcome-section) - Hero with typing animation and skills grid
- `.projects` (#projects) - Project cards with hover effects
- `.contact` (#contact) - Contact links
- `.footer` - Footer with attribution

**JavaScript Features** (scripts/index.js):
- Scroll-triggered resume button repositioning (adds `.cta-scroll` class)
- Typed.js integration for hero typing animation
  - Strings: "Web apps", "Scalable backends", "Fullstack Applications"
  - typeSpeed: 60ms, backSpeed: 20ms, loop: true

### External Dependencies
- Google Fonts: Syne, DM Sans
- Font Awesome 5.8.2 for icons
- Devicon 2.15.1 for technology icons
- Typed.js 2.0.12 for typing animation

## Development

### Local Development
```bash
python -m http.server 8000
# or
npx serve
```

### Making Changes

**Adding Projects**:
1. Add new `.project-card` in `.projects-grid` (index.html)
2. Include: `.project-image-wrapper`, `.project-overlay`, `.project-info`
3. Update project number sequence

**Updating Skills**:
1. Add/modify `.skill-item` in `.skills-grid` (index.html)
2. Use Font Awesome (`fab fa-*`) or Devicon (`devicon-*-plain`) classes

**Modifying Typing Animation**:
1. Edit `options.strings` array in scripts/index.js

**Color Theme Changes**:
1. Update CSS custom properties in style.css :root block

### Deployment
GitHub Pages auto-deploys from main branch.

```bash
git add .
git commit -m "Your message"
git push origin main
```

## Important Notes

- Grain texture overlay (`.grain`) adds subtle visual depth
- Hero background uses radial gradients for atmospheric effect
- Project cards have hover states with image scale and overlay transitions
- Navigation has backdrop blur effect
- Respects `prefers-reduced-motion` for accessibility
