# Free Tennessee Parcel Identification Sources

**Prepared for:** Noland Earthworks, LLC  
**Purpose:** Identify no-cost, defensible sources that can help find a county assessor Parcel ID from an address or field location when the Tennessee Property Viewer does not cover the county.  
**Prepared by:** Manus AI  
**Date:** September 24, 2026

## Conclusion

Tennessee already has a strong public statewide source for **86 counties**, but the nine counties excluded from the Tennessee Property Viewer use different assessment systems. The research found three excluded counties with verified public GIS query services that can support an automatic **candidate** lookup: **Davidson, Montgomery, and Rutherford**. The remaining six excluded counties provide free public portals, but the evidence supports only a user-driven lookup. Their visual maps and search pages should not be scraped or treated as undocumented APIs.

The practical no-cost approach is therefore a **two-tier model**. The existing Tennessee Comptroller workflow remains the primary source for covered counties. Davidson, Montgomery, and Rutherford can receive county-specific address and map-point lookup adapters. Chester, Hamilton, Hickman, Knox, Shelby, and Williamson should show their official portal, copy the available address or GPS point for the user, and require the displayed Parcel ID to be confirmed and entered manually. This uses public data without creating a brittle or noncompliant dependency on commercial aggregators or private portal automation.

> **Reference-only data:** Parcel identifiers, ownership details, and map boundaries are administrative reference information. They do not establish a legal boundary, title, access right, or survey line. The quoted property owner or authorized agent still needs to confirm the work area and access conditions.

## What the statewide sources can and cannot do

The [Tennessee Property Viewer][1] and the Comptroller’s parcel-data program cover the **86 counties using the state assessment system**. The Comptroller provides county parcel downloads in shapefile format and a linked assessment table, with the maintained files updated weekly. However, it explicitly excludes Chester, Davidson, Hamilton, Hickman, Knox, Montgomery, Rutherford, Shelby, and Williamson. [2]

The public statewide ArcGIS parcel layer is useful for visual reference and normal field work in covered counties, but its metadata says it is **not intended for commercial use**. It also excludes the same nine counties. It should therefore remain a reference layer, not become a substitute commercial data feed. [3]

| Source | Coverage | No-cost use | Appropriate role in the quote workflow |
|---|---|---:|---|
| Tennessee Property Viewer / Comptroller downloads | 86 state-system counties | Yes | Continue as the primary Parcel ID and boundary reference for covered counties. |
| Tennessee statewide public ArcGIS layer | 86 state-system counties | Yes, with stated public-use restriction | Visual reference only; do not rely on it as an unlicensed commercial redistribution feed. |
| County-published ArcGIS service | Davidson, Montgomery, Rutherford | Yes | Automatic candidate lookup by address, Parcel ID, or GPS/map point, with human confirmation. |
| County assessor or GIS portal | Chester, Hamilton, Hickman, Knox, Shelby, Williamson | Yes | Manual Parcel ID verification with the official county source. |

## Three county sources suitable for automatic candidate lookup

### Davidson County — strongest source

Metro Nashville publishes a public parcel polygon FeatureServer that exposes the **Assessor Parcel Number (`STANPAR`)**, a separate Parcel ID (`ParID`), property address fields, and parcel geometry. The official data page says the dataset is updated daily. A live read-only query returned both identifier fields and a property address during this review. [4] [5]

This is suitable for three controlled lookup methods: a normalized street-address search, a spatial-intersection search using a selected map point or current GPS coordinate, and a direct `STANPAR` or `ParID` search when an identifier is already known. The service uses Nashville State Plane coordinates, so the application must explicitly transform WGS84 phone GPS values or send the appropriate input spatial-reference parameter. The result must be shown as a candidate for Jon to select, rather than silently assigning a parcel when a road frontage, condominium, or boundary-edge search returns more than one record.

### Montgomery County — usable county GIS service

Montgomery County publishes its PublicParcels MapServer and documents the county GIS service from its assessor pages. The parcel layer exposes `GISLINK`, `ParcelNo`, property-address fields, and geometry. It supports normal ArcGIS query operations and can use an attribute filter or a spatial query. [6] [7]

A production lookup should normalize the address, constrain every request to a small result set, and then let the user confirm the returned parcel. The source uses Tennessee State Plane feet, so a map-point lookup requires the same coordinate handling described for Davidson. The county does not publish a firm refresh commitment in the reviewed materials, which makes an official county portal link and retrieval timestamp important on every returned result.

### Rutherford County — usable county GIS service

Rutherford County publishes a public Parcels FeatureServer layer with `ParcelID`, formatted location fields, related map-and-parcel fields, and polygon geometry. Its GIS materials connect the service to the county property-assessment workflow. A live query returned a Parcel ID and formatted location during this review. [8] [9]

The layer supports the same controlled workflow as Davidson and Montgomery: narrow address lookup, direct Parcel ID lookup, or spatial intersection from a GPS/map point. Results must remain informational and include a link back to the county’s property-data portal. The county describes its GIS data as reference material and does not provide a published service-level guarantee, so the app should handle changed fields, unavailable services, zero matches, and multiple matches by falling back to manual verification.

## Six counties that should remain manual portal workflows

The six sources below are useful and free for an owner-operator, but they do **not** have a verified public machine-readable parcel endpoint that should be placed behind an automated lookup button. In particular, no app should scrape a CaptureCAMA form, visual GIS viewer, or restricted property portal simply because a human can see the data in a browser.

| County | Free official source | Inputs a person can use | Why it should remain manual |
|---|---|---|---|
| Chester | [Citizen Access Portal][10] | Property address, mailing address, owner name, and assessor parcel-number components | The CaptureCAMA portal supports human searches, but no verified public GIS query service or coordinate lookup was found. |
| Hamilton | [Assessor portal][11] and [GISMO viewer][12] | Address, owner, parcel/tax-map number, and visual map-point investigation | The official viewer has parcel tools, but no verified public parcel REST query endpoint was found. |
| Hickman | [Citizen Access Portal][13] | Address, owner, and multipart control-map/group/parcel inputs | The public CaptureCAMA portal supports manual search, but no verified GIS query service or coordinate lookup was found. |
| Knox | [Property Lookup][14] and [KGIS Maps][15] | Address, owner, Parcel ID, and map selection | KGIS supports field verification, but the available machine endpoint was not publicly queryable. The property portal expressly restricts data mining and extraction. |
| Shelby | [Register GIS portal][16] and [Assessor search][17] | Address, owner, Parcel ID, and tax map | The public site presents parcel information to a person, but no verified machine-readable county parcel endpoint was found. |
| Williamson | [Property Search][18] | Address, owner, subdivision, map number, and parcel number | The public search is manual and restricts bulk collection and redistribution. No usable public parcel query layer was verified. |

## Other free or open data options considered

**County downloads and open-data hubs** are worth checking when a county changes vendors or publishes a new GIS hub. This is a monitoring opportunity, not a second permanent system today. Davidson, Montgomery, and Rutherford already demonstrate the pattern: an official ArcGIS service can offer a stable public endpoint, but each county uses different fields, coordinate systems, update practices, and terms.

**OpenStreetMap, Google Maps, and street-address geocoders** can help place a site on the map but are not authoritative Parcel ID sources. They may provide a road address or coordinates, but they cannot replace the assessor record needed to identify a county-specific Parcel ID.

**onX Offroad** is useful in the field as a reference for private-land boundaries, landowner information, acreage, and site orientation. It is not an automatic Parcel ID source for this application because it does not expose a supported public parcel-lookup API. Its private-land data is also refreshed on a one-to-two-year cycle and remains reference-only. [19] [20]

**Federal land layers** can identify public-land management and general boundaries, but they do not provide local Tennessee assessor Parcel IDs. They are not a substitute for a county assessor record on private-land quotes.

## Recommended implementation path

The lowest-maintenance path is to keep the existing county-specific portal cards and add automatic adapters only where the county has a verified public GIS query contract.

First, retain the current Tennessee Comptroller Property Viewer path for the 86 covered counties. It is already the correct first choice for those counties.

Second, add three explicit source adapters for Davidson, Montgomery, and Rutherford. Each adapter should return **candidate parcels**, not an automatic final selection. A shared result should include the county, original source identifier, display address, optional official boundary, source URL, retrieval time, and a statement that the result needs field confirmation. Address lookups should request a small maximum result count. Map-point lookups should use a spatial intersection query and specify the correct coordinate reference system. Geometry should be requested only after the user selects a candidate, which keeps responses smaller and avoids unnecessary data use.

Third, keep Chester, Hamilton, Hickman, Knox, Shelby, and Williamson as manual official-portal cards. The quote screen and Noland Field can open the county portal, copy the address or current coordinates, and retain a “Parcel ID confirmed from county portal” control. For Knox and Williamson in particular, this avoids prohibited extraction activity. The existing onX handoff remains a good field aid for checking location and drawing the actual work area, but it should not populate the assessor Parcel ID automatically.

Finally, store county-specific identifiers in their original format. `STANPAR`, `ParID`, `GISLINK`, `ParcelNo`, Rutherford `ParcelID`, and CaptureCAMA multipart values are not interchangeable. Every saved parcel record should retain the county, the raw displayed identifier, source URL, and retrieval time. This prevents a valid identifier from one county being mistaken for a different statewide format.

## Decision summary

| Priority | Action | Reason |
|---|---|---|
| 1 | Keep Tennessee Property Viewer for its 86 covered counties. | It remains the official statewide reference already in use. |
| 2 | Add automatic candidate lookups for Davidson, Montgomery, and Rutherford only. | These are the three excluded counties with verified, no-cost, machine-readable county GIS services. |
| 3 | Retain official manual portals for Chester, Hamilton, Hickman, Knox, Shelby, and Williamson. | The research supports person-driven searches but not resilient or compliant automation. |
| 4 | Keep onX Offroad as a field-reference tool. | It adds boundary and ownership context but does not provide a supported automatic Parcel ID interface. |

## References

[1]: https://tnmap.tn.gov/assessment/ "Tennessee Property Viewer"
[2]: https://comptroller.tn.gov/office-functions/pa/gisredistricting/redistricting-and-land-use-maps/parcel-data.html "Tennessee Comptroller Parcel Data"
[3]: https://www.arcgis.com/home/item.html?id=e356f1a241844d6f9025f2fa4e977df3 "Tennessee Property Boundaries Public Use"
[4]: https://datanashvillegov-nashville.hub.arcgis.com/datasets/fa26cd9326c446179be059e00449cb1f_0/about "Metro Nashville Parcels Open Data"
[5]: https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Parcels_view/FeatureServer/0 "Metro Nashville Parcels FeatureServer Layer"
[6]: https://montgomerytn.gov/assessor/public-parcels "Montgomery County Public Parcels"
[7]: https://gis.montgomerytn.gov/gisserver/rest/services/PublicParcels/MapServer/0 "Montgomery County PublicParcels MapServer Layer"
[8]: https://rutherfordcountytn.gov/gis "Rutherford County Geographic Information Systems"
[9]: https://services5.arcgis.com/A5C0MR9xfkxVRwat/arcgis/rest/services/Parcel_Data/FeatureServer/1 "Rutherford County Parcel Data FeatureServer Layer"
[10]: https://chester.capturecama.com/CAMA/CAPortal/CZ_MainPage.aspx "Chester County Citizen Access Portal"
[11]: https://assessor.hamiltontn.gov/ "Hamilton County Assessor of Property"
[12]: https://gismaps.hamiltontn.gov/hcgis "Hamilton County GISMO"
[13]: https://hickman.capturecama.com/CAMA/CAPortal/CZ_MainPage.aspx "Hickman County Citizen Access Portal"
[14]: https://propertyinfo.knoxcountytn.gov/ "Knox County Property Lookup"
[15]: https://www.kgis.org/kgismaps/map.htm "KGIS Maps"
[16]: https://gis.register.shelby.tn.us/ "Shelby County Register GIS Portal"
[17]: https://www.assessormelvinburgess.com/PropertySearch "Shelby County Assessor Property Search"
[18]: https://inigo.williamson-tn.org/property_search/ "Williamson County Property Search"
[19]: https://onxor.zendesk.com/hc/en-us/articles/5024120887181-Viewing-Private-Lands "Viewing Private Lands in onX Offroad"
[20]: https://onxor.zendesk.com/hc/en-us/articles/8663395425677-onX-Offroad-data-accuracy-and-update-frequency-FAQ "onX Offroad Data Accuracy and Update Frequency FAQ"
