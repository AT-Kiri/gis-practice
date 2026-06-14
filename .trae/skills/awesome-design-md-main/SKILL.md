---
name: awesome-design-md
description: Use DESIGN.md style guides from real websites to build distinctive, production-grade frontend interfaces. Provides 59+ curated design systems (Vercel, Stripe, Linear, Apple, Spotify, etc.) with color palettes, typography, component styles, and layout principles. Use when the user wants to build a UI matching a specific website's aesthetic, or when they reference a company/brand style.
---

This skill provides curated DESIGN.md style guides extracted from real websites. Use these to generate UI that matches a specific brand aesthetic rather than generic AI-generated designs.

## Available Design Styles

### AI & LLM Platforms
- **claude** - Anthropic's AI assistant. Warm terracotta accent, clean editorial layout
- **cohere** - Enterprise AI platform. Vibrant gradients, data-rich dashboard aesthetic
- **elevenlabs** - AI voice platform. Dark cinematic UI, audio-waveform aesthetics
- **minimax** - AI model provider. Bold dark interface with neon accents
- **mistral.ai** - Open-weight LLM provider. French-engineered minimalism, purple-toned
- **ollama** - Run LLMs locally. Terminal-first, monochrome simplicity
- **opencode.ai** - AI coding platform. Developer-centric dark theme
- **replicate** - Run ML models via API. Clean white canvas, code-forward
- **runwayml** - AI video generation. Cinematic dark UI, media-rich layout
- **together.ai** - Open-source AI infrastructure. Technical, blueprint-style design
- **voltagent** - AI agent framework. Void-black canvas, emerald accent, terminal-native
- **x.ai** - Elon Musk's AI lab. Stark monochrome, futuristic minimalism

### Developer Tools & IDEs
- **cursor** - AI-first code editor. Sleek dark interface, gradient accents
- **expo** - React Native platform. Dark theme, tight letter-spacing, code-centric
- **lovable** - AI full-stack builder. Playful gradients, friendly dev aesthetic
- **raycast** - Productivity launcher. Sleek dark chrome, vibrant gradient accents
- **superhuman** - Fast email client. Premium dark UI, keyboard-first, purple glow
- **vercel** - Frontend deployment platform. Black and white precision, Geist font
- **warp** - Modern terminal. Dark IDE-like interface, block-based command UI

### Backend, Database & DevOps
- **clickhouse** - Fast analytics database. Yellow-accented, technical documentation style
- **composio** - Tool integration platform. Modern dark with colorful integration icons
- **hashicorp** - Enterprise infrastructure. Clean, black and white
- **mongodb** - Document database. Green leaf branding, developer documentation focus
- **posthog** - Product analytics. Playful hedgehog branding, developer-friendly dark UI
- **sanity** - Headless CMS. Red accent, content-first editorial layout
- **sentry** - Error monitoring. Dark dashboard, data-dense, pink-purple accent
- **supabase** - Open-source Firebase alternative. Dark emerald theme, code-first

### Productivity & SaaS
- **cal** - Open-source scheduling. Clean neutral UI, developer-oriented simplicity
- **intercom** - Customer messaging. Friendly blue palette, conversational UI patterns
- **linear.app** - Project management for engineers. Ultra-minimal, precise, purple accent
- **mintlify** - Documentation platform. Clean, green-accented, reading-optimized
- **notion** - All-in-one workspace. Warm minimalism, serif headings, soft surfaces
- **resend** - Email API for developers. Minimal dark theme, monospace accents
- **zapier** - Automation platform. Warm orange, friendly illustration-driven

### Design & Creative Tools
- **airtable** - Spreadsheet-database hybrid. Colorful, friendly, structured data aesthetic
- **clay** - Creative agency. Organic shapes, soft gradients, art-directed layout
- **figma** - Collaborative design tool. Vibrant multi-color, playful yet professional
- **framer** - Website builder. Bold black and blue, motion-first, design-forward
- **miro** - Visual collaboration. Bright yellow accent, infinite canvas aesthetic
- **webflow** - Visual web builder. Blue-accented, polished marketing site aesthetic

### Fintech & Crypto
- **coinbase** - Crypto exchange. Clean blue identity, trust-focused, institutional feel
- **kraken** - Crypto trading platform. Purple-accented dark UI, data-dense dashboards
- **revolut** - Digital banking. Sleek dark interface, gradient cards, fintech precision
- **stripe** - Payment infrastructure. Signature purple gradients, weight-300 elegance
- **wise** - International money transfer. Bright green accent, friendly and clear

### E-commerce & Retail
- **airbnb** - Travel marketplace. Warm coral accent, photography-driven, rounded UI

### Media & Consumer Tech
- **apple** - Consumer electronics. Premium white space, SF Pro, cinematic imagery
- **ibm** - Enterprise technology. Carbon design system, structured blue palette
- **nvidia** - GPU computing. Green-black energy, technical power aesthetic
- **pinterest** - Visual discovery platform. Red accent, masonry grid, image-first
- **spacex** - Space technology. Stark black and white, full-bleed imagery, futuristic
- **spotify** - Music streaming. Vibrant green on dark, bold type, album-art-driven
- **uber** - Mobility platform. Bold black and white, tight type, urban energy

### Automotive
- **bmw** - Luxury automotive. Dark premium surfaces, precise German engineering aesthetic
- **ferrari** - Luxury automotive. Chiaroscuro black-white editorial, Ferrari Red with extreme sparseness
- **lamborghini** - Luxury automotive. True black cathedral, gold accent, custom Neo-Grotesk
- **renault** - French automotive. Vivid aurora gradients, proprietary typeface, zero-radius buttons
- **tesla** - Electric vehicles. Radical subtraction, cinematic full-viewport photography

## How to Use

When the user requests a UI with a specific brand aesthetic:

1. **Identify the target style** - Match the user's request to one of the available design styles above.

2. **Fetch the DESIGN.md** - Use WebFetch to retrieve the full design system from:
   ```
   https://getdesign.md/<company-slug>/design-md
   ```
   For example: `https://getdesign.md/vercel/design-md`

3. **Apply the design system** - Follow the DESIGN.md specification exactly:
   - Use the specified color palette (hex values and semantic roles)
   - Apply the typography rules (font families, sizes, weights, line heights)
   - Match component styling (buttons, cards, inputs, navigation states)
   - Follow layout principles (spacing scale, grid, whitespace)
   - Respect the depth & elevation system (shadows, surface hierarchy)
   - Adhere to Do's and Don'ts
   - Implement responsive behavior per breakpoints

4. **Generate production code** - Create working HTML/CSS/JS or Vue code that faithfully implements the design system.

## DESIGN.md Format Reference

Each DESIGN.md contains these sections:
1. Visual Theme & Atmosphere - Mood, density, design philosophy
2. Color Palette & Roles - Semantic name + hex + functional role
3. Typography Rules - Font families, full hierarchy table
4. Component Stylings - Buttons, cards, inputs, navigation with states
5. Layout Principles - Spacing scale, grid, whitespace philosophy
6. Depth & Elevation - Shadow system, surface hierarchy
7. Do's and Don'ts - Design guardrails and anti-patterns
8. Responsive Behavior - Breakpoints, touch targets, collapsing strategy
9. Agent Prompt Guide - Quick color reference, ready-to-use prompts

## Important Notes

- Always fetch the actual DESIGN.md content before generating code - do not guess or approximate design tokens
- If the user doesn't specify a style, suggest 2-3 relevant options based on the project context
- Combine the DESIGN.md guidance with the `frontend-design` skill for maximum creative output
