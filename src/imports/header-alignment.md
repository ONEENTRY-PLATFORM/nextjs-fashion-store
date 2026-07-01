# Header Alignment & Global Spacing System

Define a strict alignment and spacing system to ensure the Header looks balanced, structured, and fully consistent with the overall website layout.

---

# 1. Vertical Alignment Rule

All primary header blocks must be vertically centered.

Applies to:
- Logo  
- Gender switch (Women / Men)  
- Search field  
- Account / Wishlist / Bag icons  
- Category navigation  

### Rule:
- Use `display: flex`
- Use `align-items: center`
- Do not use manual margin offsets for vertical positioning
- All elements must share the same vertical center axis

This guarantees visual precision and prevents optical misalignment.

---

# 2. Horizontal Layout Structure (Desktop)

Header must be divided into structured zones:

### Left Zone
- Logo  

### Center Zone
- Gender switch  
- Search  

### Right Zone
- Account  
- Wishlist  
- Bag  

Use:
display: flex;
justify-content: space-between;
align-items: center;
Avoid individual margin values.

No arbitrary spacing is allowed.

---

# 5. Top Bar (Region / Language / Phone)

- Must be vertically centered
- Fixed height (40px–48px)
- Horizontal padding must match the main Header padding
- Must align with the same grid system

---

# 6. Category Navigation Bar

- Must align exactly with Header padding
- Vertical padding: 12px–16px
- Items vertically centered
- Equal spacing between categories (24px–32px)

If SALE is highlighted, it must not break spacing rhythm.

---

# 7. Optical Balance Rules

- Icons must align visually with text baseline
- Badge counters must not affect layout alignment
- Search input height must visually match adjacent blocks
- No element should visually “float” above or below others

---

# Final Result

The Header must feel:

- Structured  
- Symmetrical  
- Technically precise  
- Calm and premium  

Alignment and spacing consistency is mandatory across Desktop, Tablet, and Mobile.