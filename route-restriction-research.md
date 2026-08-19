# Route Restriction Reference Sources

The Route Planner treats OpenStreetMap restriction data only as a route-planning reference. It never treats a missing map tag as proof that a road, bridge, or clearance is suitable for the selected equipment profile.

| Mapped key | Route Planner use | Source |
|---|---|---|
| `maxheight=*` | Legal maximum-height alert | [OpenStreetMap Wiki — Key:maxheight](https://wiki.openstreetmap.org/wiki/Key:maxheight) |
| `maxheight:physical=*` | Physical-clearance alert | [OpenStreetMap Wiki — Key:maxheight](https://wiki.openstreetmap.org/wiki/Key:maxheight) |
| `maxweight=*` | Maximum actual-weight alert | [OpenStreetMap Wiki — Key:maxweight](https://wiki.openstreetmap.org/wiki/Key:maxweight) |
| `maxweightrating=*` | Maximum gross-weight-rating alert | [OpenStreetMap Wiki — Key:maxweight](https://wiki.openstreetmap.org/wiki/Key:maxweight) |
| `maxaxleload=*` | Maximum axle-load alert | [OpenStreetMap Wiki — Key:maxweight](https://wiki.openstreetmap.org/wiki/Key:maxweight) |

The source documentation specifies that `maxheight=*` represents a maximum height limit for vehicles using the tagged way and distinguishes legal from physical limits using `maxheight:physical=*`. The `maxweight=*` documentation distinguishes actual vehicle weight from registered or gross weight restrictions represented by `maxweightrating=*`. Values and current road conditions must be verified against official records and posted signs before hauling.
