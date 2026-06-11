# Gallery Photo Sourcing Notes

## Goal
Rebuild homepage Before & After section and full Gallery page as a clean single-image showcase using royalty-free imagery, with **no false attribution** to Noland Earthworks jobs.

## Findings so far

### Rejected sources
- Competitor before/after images surfaced in search results, especially from Grounded Land Solutions. These cannot be used.
- General search results also surfaced competitor/service-company images and logging/deforestation content that would misrepresent forestry mulching.

### Pexels / direct-download tests
Downloaded files to `/home/ubuntu/webdev-static-assets/gallery/`.

#### Usable or potentially usable
- `overgrown-brush-1.jpg` — downloaded successfully; intended as dense overgrowth / before-type visual.
- `forestry-work-1.jpg` — land clearing / disturbed ground visual; may be usable as a general work image, but not ideal for forestry mulching.
- `open-pasture-1.jpg` — open field / finished-land visual; usable as an "after-type" result image in a generic sense.

#### Rejected after review
- `dense-forest-1.jpg` — aerial evergreen forest; not representative of the service.
- `dense-brush.jpg` — snowy woods; not relevant.
- `overgrown-woodland.jpg` — mature tree scene; not representative of overgrown brush clearing.

## Constraint
There do not appear to be strong royalty-free photo sets that accurately show true forestry mulching before/after results. Best path is to:
1. use the most relevant general land-clearing / overgrowth / open-land visuals available,
2. remove before/after claim language and hover mechanic,
3. avoid any captions that imply the photos are Jon's actual jobs.

## Next steps
- Continue sourcing a tighter set of royalty-free images focused on:
  - overgrown brush / fence line / wooded understory
  - tracked equipment / land clearing machinery
  - cleared open land / pasture / finished property
- Inspect homepage/gallery components and swap section to a cleaner single-image showcase.
- Upload final selected images with webdev-safe CDN URLs before wiring into the site.


## Second review pass — vetted images

### Strongest candidates so far

#### Overgrowth / before-type visuals
- `dense-foliage-bushes.jpg`
  - Source: Pexels photo 16688417
  - Summary: dense green grass and brush under trees; reads as unmanaged growth.
  - Status: usable.
- `overgrown-pathway.jpg`
  - Source: Pexels photo 29345274
  - Summary: overgrown wooded path with brush closing in.
  - Status: usable.
- `overgrown-fence-line.jpg`
  - Source: Pexels photo 13748624
  - Summary: broken/overgrown fence line; good for fence-row / neglected-property theme.
  - Status: usable, though visually dark.

#### Equipment / work visuals
- `forestry-mulcher-machine.jpg`
  - Source: Pexels photo 5851529
  - Summary: actual forestry machine working in the woods; strongest equipment image so far.
  - Status: usable.
- `heavy-machinery-forest.jpg`
  - Source: Pexels photo 11118633
  - Summary: forestry machinery in wooded setting.
  - Status: backup option.

#### Open-land / after-type visuals
- `open-land-treeline.jpg`
  - Source: Pexels photo 102728
  - Summary: open cleared ground bordered by tree line.
  - Status: usable.
- `open-pasture-1.jpg`
  - Source: previously downloaded from Pexels direct URL.
  - Summary: clean open field / pasture look.
  - Status: usable.
- `cleared-pasture-stumps.jpg`
  - Source: Pexels photo 21997930
  - Summary: open pasture with scattered stumps; suggests reclaimed land, though not polished.
  - Status: usable as a secondary gallery image.

### Rejected in second pass
- `thick-woods.jpg` — wrong content; beach rocks, not woods.
- `overgrown-understory.jpg` — mature tree canopy view, not overgrown brush.
- `dense-undergrowth.jpg` — still needs visual confirmation before use; not selected yet.
- `fence-in-forest.jpg` — too much forest, not enough land-clearing relevance.

### Implementation direction
Use a **single-image showcase** instead of hover before/after. Keep captions generic and honest, such as:
- Overgrown property conditions
- Forestry equipment at work
- Open land after clearing

Do not imply any image is from Jon's actual jobs.

