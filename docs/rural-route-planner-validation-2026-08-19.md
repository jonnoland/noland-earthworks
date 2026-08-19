# Rural Route Planner Validation — August 19, 2026

The development Route Planner was opened under the owner session for a no-save representative check. The route used **Vanleer, TN 37181** as origin, **Charlotte, TN** as destination, an address stop of **Dickson, TN 37055**, and rural access notes directing the operator to verify the gate, bridge capacity, road firmness, gate width, and turnaround before departure.

The public Tennessee Comptroller Property Boundaries service was queried for one non-customer Dickson County reference parcel. It returned Parcel ID `022 001 00100 000 2026`, mapped to McConnell Road, with centroid **36.325274296248232, -87.508675151701709**. The reference was used only to validate Parcel ID route-stop handling and was not saved as a customer, lead, quote, job, or route record.

The first application lookup used the prior tolerant wildcard Parcel ID query and exceeded its timeout. The planner now first submits an exact, county-scoped formatted Parcel ID query and uses the tolerant normalized search only when no exact result is returned. The exact query and multi-stop aggregation are covered by regression tests; the live no-save verification is being repeated after the service restart.

For the repeat check, the same public reference Parcel ID, destination, address stop, and rural access notes were re-entered without saving a route record.

The improved exact query resolved the Dickson County reference parcel successfully and returned its McConnell Road location with Origin, Stop, and Destination controls. The Parcel ID is now being added as an ordered stop for the no-save Directions validation.

The validation route now contains two ordered stops: (1) the address stop `Dickson, TN 37055` and (2) the public Dickson County reference parcel. The planner request was submitted without using the Save Route control.

The no-save Directions calculation completed successfully. It returned a **52.3-mile**, **75-minute** route from Vanleer to Charlotte through the two ordered stops, placed each stop on the map, preserved the rural access notes in the route summary, and detected zero weigh stations. No route, customer, job, quote, or other business record was saved or changed.

For persistence validation, a clearly labeled disposable route named `Validation — Rural Parcel Route (delete)` was saved. The saved-route list retained the Vanleer-to-Charlotte route and the expected 52.3-mile / 75-minute summary. Reloading its addresses restored the same ordered address stop, Parcel ID stop, and rural access notes. The disposable record is now being deleted; no customer, job, lead, quote, or payment record was involved.

Source: `https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer/0/query`
