# Store Card — Fixed Height & Modal Behavior

## Fixed Card Height

All store cards must maintain a **uniform, fixed height**, regardless of the amount of store information available.

The card height must:

- Remain identical across all store cards
- Not expand when additional information is available
- Preserve consistent grid alignment
- Prevent layout shifts

No expandable content should increase the card height.

---

## “More Info” Interaction

When the user clicks the **"More Info"** button:

- A **modal window** must open
- The full store information is displayed inside the modal
- The original store card remains unchanged in size

The modal replaces any inline expand/collapse behavior.

---

## Modal Behavior

### Overlay

- The entire page behind the modal must:
  - Be blurred (`backdrop-filter: blur(...)`)
  - Or dimmed with a semi-transparent overlay (`rgba(0,0,0,0.4–0.6)`)
- Background scrolling must be disabled while the modal is open
- The modal must appear above all content (`z-index` higher than page layout)

---

### Modal Content

The modal may include:

- Full opening hours
- In-store services
- Contact details
- Email & social links
- Additional store information

Content inside the modal can scroll if necessary.

---

## Closing Behavior

The modal must close when:

- The user clicks the close icon (×)
- The user clicks outside the modal area
- The user presses the `Escape` key (desktop)

Upon closing:

- Page blur/dim effect is removed
- Background scroll is restored
- The layout remains unchanged

---

## Result

- All store cards keep identical height
- The grid remains visually clean and structured
- Additional information does not break layout consistency
- Users can access full store details in a focused, distraction-free view