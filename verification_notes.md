# Quote Form Verification Notes

- The public `/quote` preview loads successfully after the combined-service update.
- The service selector now states that Trail Cutting and Right-of-Way Clearing can be included alongside other services once their linear-footage measurements are entered.
- The selector exposes Forestry Mulching, Land Management, Vegetation Management, Right-of-Way Clearing, Brush Hogging, and Trail Cutting together.
- Selecting Forestry Mulching and Right-of-Way Clearing together keeps both choices active, retains the acreage slider, and reveals the right-of-way linear-footage and corridor-width controls.
- With an acreage-based service selected, the form displays the live preliminary range and a per-service contribution row before submission.
- Entering a 2,640-foot, 30-foot-wide right-of-way with one acre of forestry mulching produced a combined preliminary range of $1,791–$3,200 and correctly separated the $700–$1,200 forestry contribution from the $1,091–$2,000 right-of-way contribution.
- The refreshed public quote form loads with the dimensional-service selector intact and exposes the existing multi-service flow for unit-switch verification.
- Right-of-way selection reveals a Feet/Miles control next to Corridor Length. Switching to Miles leaves the canonical estimator flow in place while presenting the alternate measurement unit.
- Entering 0.5 miles and a 30-foot corridor correctly converted to 2,640 linear feet, produced the existing $1,091–$2,000 right-of-way range, and displayed the hover calculation explanation: `2,640 linear feet × 30 ft ÷ 43,560 = 1.82 acres × $600–$1,100 per acre; $750 minimum applied when needed.`
- Adding Trail Cutting alongside right-of-way exposes its own Feet/Miles selector without changing the existing right-of-way miles input or its calculated contribution.
- The refreshed quote form exposes Level, Rolling (+10%), and Steep/Wet/Rocky (+25%) terrain choices alongside a Clear All calculator control that explicitly preserves contact and address information.
- Selecting one acre of Forestry Mulching and Steep/Wet/Rocky terrain updated the live range from $700–$1,200 to $800–$1,500; the contribution breakdown now shows the `1.25` terrain factor and the terrain label.
- Selecting Clear All returned the calculator to no selected services, the default level terrain, and the 1-acre starting value; the live preliminary range and service breakdown were removed for a fresh calculation.
