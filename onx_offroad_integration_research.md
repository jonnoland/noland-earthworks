# onX Offroad Integration Findings

## Verified capabilities

- onX Offroad supports waypoints, lines, area shapes, routes, and tracks from its mobile map tools. Area shapes can be used to measure a scoped work area, while tracks record a walked path.
- onX Offroad supports GPX import and export in the mobile app. KML import and export require the web map. Lines and areas exported as GPX are converted into tracks on import, so GPX is suitable for a property waypoint handoff but not a lossless area-polygon return path.
- No onX connector is configured for this task, and no supported public customer API or documented deep-link contract was identified during this review.

## Product decision

Implement a supported onX handoff rather than a claimed API synchronization: Noland Field should create a small GPX property waypoint from the selected Parcel ID/address centroid and provide a clear share/download action for import into onX Offroad. After walking and drawing the final work-area shape in onX, Jon will enter the measured work acreage and a short verification note in Noland Field. The field app will persist those values with the quote.

## Sources

1. https://onxor.zendesk.com/hc/en-us/articles/4406752134029-How-to-use-Map-Tools-in-onX-Offroad
2. https://onxor.zendesk.com/hc/en-us/articles/360057279192-Importing-and-Exporting-Markups
3. https://www.onxmaps.com/offroad/app/features/private-land-maps-for-off-roading
