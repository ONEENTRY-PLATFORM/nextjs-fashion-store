# Tailwind Component Usage Rule  

The website must use a unified Tailwind-based component system to ensure visual consistency and scalability.

---

# 1. Core Rule

All UI elements must be built using:

- Tailwind utility classes  
- Predefined design tokens (spacing, colors, typography)  
- Reusable component patterns  

No inline styles.  
No arbitrary values outside the design system.

---

# 2. Design Tokens in Tailwind

Tailwind configuration must reflect the brand system.

## Spacing
- Based on 8px scale  
- No arbitrary spacing values (e.g. `mt-[13px]` is not allowed)

## Colors
Use semantic tokens only:
- `primary-women`
- `primary-men`
- `black`
- `white`

No hardcoded hex values inside components.

## Typography
- Font family: `Inter`
- Use predefined text styles for headings and body text

---

# 3. Components

## 3.1 Buttons

Buttons must use predefined component classes.

### Requirements
- `flex items-center justify-center`
- `transition-all duration-200`
- No border-radius (sharp edges)
- Padding based on spacing scale

### Variants
- Primary (Women)
- Primary (Men)
- Secondary
- Outline
- Ghost
- Disabled

Each variant must include:
- Default state
- Hover state
- Active state
- Disabled state

No custom button styling outside system variants.

---

## 3.2 Icons

Icons must:
- Use consistent size scale (16px / 20px / 24px)
- Align vertically using flex
- Inherit `currentColor`
- Use consistent style (do not mix outline and filled styles randomly)

---

## 3.3 Cards

Cards must:
- Follow spacing system
- Use consistent padding
- Align with grid system

---

# 4. Interaction States

Interactive components must include:
- Hover
- Active
- Focus-visible
- Disabled (if applicable)

Focus states must remain visible and accessible.

---

# Final Principle

Tailwind is the implementation layer of the design system.  
All components must remain consistent, reusable, and aligned with the global UI rules.