# Hero Banner Typography Rules

Hero banners follow a **special editorial typography style** that
slightly overrides the default heading system.

------------------------------------------------------------------------

# Hero Typography System

## Eyebrow Label

Used to indicate the category or collection above the main hero title.

**Element** `<p>`

**Font** Inter

**Weight** 500

**Size** 12px

**Line Height** 16px

**Letter Spacing** 0.3em

**Text Transform** uppercase

**Color** `rgba(255,255,255,0.80)`

**Spacing** `margin-bottom: 12px`

**Example** - Women's Collection - Men's Collection

------------------------------------------------------------------------

## Hero Title (Hero H1)

**Element** `<h1>`

**Font** Inter

**Weight** 700 *(allowed only in Hero sections)*

**Size** `clamp(32px, 5vw, 64px)`

**Meaning** - Mobile minimum → **32px** - Fluid scaling via viewport -
Desktop maximum → **64px**

**Line Height** 1

**Letter Spacing** -0.02em

**Color** `#FFFFFF`

**Spacing** `margin-bottom: 16px`

### Important Rule

Hero titles **override the standard typography scale**.

Default system **H1**: - **48px / 56px** - **Weight 600**

Hero H1 is **larger and bolder** to create marketing impact.

------------------------------------------------------------------------

## Hero Subtitle

**Element** `<p>`

**Font** Inter

**Weight** 400

**Size** 14px

**Line Height** 1.6

**Color** `rgba(255,255,255,0.85)`

**Max Width** 384px

**Spacing** `margin-bottom: 32px`

Subtitle should remain **short and readable**.

------------------------------------------------------------------------

## Hero CTA Button

**Element** `<a>`

**Font** Inter

**Weight** 600

**Size** 14px

**Text Transform** uppercase

**Letter Spacing** 0.1em

**Padding**

    px-8
    py-3.5

**Color** White

**Background** - Women slides → `#F88A8A` - Men slides → `#DA1E1E`

**Border Radius** 0px *(global rule)*

**Hover Effects**

    opacity: 0.9
    transform: translateY(-1px)
    transition: 200ms ease

------------------------------------------------------------------------

# Hero CTA Button Alignment

CTA alignment must **match the hero text alignment**.

### Left Aligned Hero

    justify-start
    text-left

CTA alignment

    self-start

### Center Aligned Hero

    justify-center
    text-center

CTA alignment

    self-center

### Right Aligned Hero

    justify-end
    text-right

CTA alignment

    self-end

### Alignment Rule Summary

  Text Alignment   CTA Alignment
  ---------------- ---------------
  Left             self-start
  Center           self-center
  Right            self-end

------------------------------------------------------------------------

# Hero Layout Rules

## Height

`600px`

Fixed across all breakpoints.

## Width

`100%`

Edge‑to‑edge layout with no container limit.

------------------------------------------------------------------------

# Hero Content Alignment

### Left

    justify-start
    text-left

### Center

    justify-center
    text-center

### Right

    justify-end
    text-right

### Vertical Alignment

    items-end
    pb-16

Content sits near the **bottom of the hero image**.

------------------------------------------------------------------------

# Hero Content Container

**Maximum Width** `512px`

**Padding**

Mobile `px-12`

Desktop `px-20`

------------------------------------------------------------------------

# Hero Gradient Overlay

### Left Alignment

    linear-gradient(
    to right,
    rgba(0,0,0,0.55) 0%,
    rgba(0,0,0,0.1) 60%,
    transparent 100%
    )

### Right Alignment

    linear-gradient(
    to left,
    rgba(0,0,0,0.55) 0%,
    rgba(0,0,0,0.1) 60%,
    transparent 100%
    )

### Center Alignment

    linear-gradient(
    to bottom,
    rgba(0,0,0,0.1) 0%,
    rgba(0,0,0,0.45) 100%
    )
