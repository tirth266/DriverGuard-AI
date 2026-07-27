# DriverGuard AI — Frontend

A pixel-perfect React 19 + Vite + TypeScript + Tailwind CSS recreation of the **DriverGuard AI** Stitch project — a premium AI driver monitoring system UI.

## ✨ Features

- 🎨 **Pixel-perfect** recreation from Stitch design
- 🌙 **Dark glassmorphism** theme (`#10131a` background)
- ⚡ **React 19 + Vite** for blazing fast dev/build
- 🎞️ **Framer Motion** animations (fade-in, slide-up, page transitions, hover effects)
- 📱 **Fully responsive** (mobile, tablet, desktop)
- ♿ **Accessible** (aria-labels, semantic HTML, keyboard navigation)
- 🔀 **React Router** with lazy-loaded pages
- 🛡️ **TypeScript** throughout

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar/          # Sticky glassmorphic navbar with mobile menu
│   ├── Hero/            # Hero section with floating stat cards
│   ├── Features/        # 4-column bento feature cards
│   ├── DetectionGrid/   # 5-card precision event mapping grid
│   ├── Pipeline/        # 4-step AI pipeline with animated connectors
│   ├── KPICards/        # Performance metric cards (96.8%, 62fps, 12.4ms)
│   ├── CTA/             # Call-to-action glass card section
│   ├── Footer/          # 4-column footer
│   ├── Dashboard/       # Sentinel Drive AI real-time monitoring UI
│   └── Shared/          # GlassCard, Badge, Button, SectionTitle
├── pages/
│   ├── Home/            # Landing page (all sections)
│   ├── Dashboard/       # Full-screen monitoring dashboard
│   └── NotFound/        # 404 page
├── layouts/
│   ├── MainLayout.tsx   # Navbar + Footer wrapper
│   └── DashboardLayout.tsx # Full-screen dark layout
├── hooks/
│   ├── useScrollY.ts    # Scroll position for navbar animation
│   └── useInView.ts     # Intersection Observer for scroll animations
├── types/
│   └── index.ts         # TypeScript interfaces
└── styles/
    └── index.css        # Global styles, glass effects, animations
```

## 🎨 Design System

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#10131a` | App background |
| `primary` | `#adc6ff` | Electric blue accents |
| `secondary` | `#5de6ff` | Cyan highlights |
| `tertiary` | `#ffb786` | Orange accents |
| `error` | `#ffb4ab` | Danger indicators |
| `on-surface` | `#e1e2ec` | Primary text |
| `on-surface-variant` | `#c2c6d6` | Secondary text |

### Typography
- **Headlines/Body**: `Inter` (Google Fonts)
- **Metrics/Labels**: `Geist` (Google Fonts)

### Routes
| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with all marketing sections |
| `/dashboard` | Dashboard | Sentinel Drive AI real-time monitoring |
| `*` | 404 | Not found page |

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19 | UI framework |
| Vite | Latest | Build tool |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| React Router | 6.x | Client-side routing |
| Framer Motion | Latest | Animations |
| Lucide React | Latest | Icons |

## 📸 Screenshots

The app faithfully recreates:
1. **Landing Page** — Hero, Features Bento, Precision Event Mapping, AI Pipeline, Performance KPIs, CTA, Footer
2. **Dashboard** — Sentinel Drive AI with infrared camera feed, behavior analysis panels, distraction timeline
