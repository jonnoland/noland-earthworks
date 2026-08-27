# Nashville Parcel Viewer Research Notes

Source inspected: https://maps.nashville.gov/ParcelViewer/ on 2026-08-27.

The public Nashville Parcel Viewer is a Metro Nashville application for **Davidson County** parcels. Its notice states that it exposes parcel ownership, zoning, permits, and several other map layers, and that its information is updated daily. The site also states that Metro does not guarantee the accuracy or completeness of the data.

The live viewer is an Esri-based map application. The visible workflow supports parcel selection and details, plus search, basemap, layer list, street-view/oblique imagery, print, coordinate, legend, and measurement controls. Detail panels include General Info, Ownership History, Property History, Zoning History, Assessment History, and Building and Trade Permits.

The viewer's public configuration identifies its authoritative parcel boundary service as `https://maps.nashville.gov/arcgis/rest/services/Cadastral/Parcels/MapServer/0`. It is a queryable polygon feature layer for Nashville/Davidson County with `APN` as its display and parcel ID field. Relevant property fields include `PropAddr`, `PropCity`, `PropZip`, `Owner`, `Acres`, `DeededAcreage`, and parcel geometry. A sampled public record used the APN format `00300000500`. The viewer accepts an APN through `https://maps.nashville.gov/ParcelViewer/?parcelID=<APN>`.

Integration implication: keep the existing statewide Tennessee parcel service as the default. Use Nashville Parcel Viewer only as a Davidson County-specific, attributed source and preserve the current exact-match/manual-review safeguards before attaching a parcel to a quote.

## Sources

- https://maps.nashville.gov/ParcelViewer/
- https://developer.android.com/tools/sdkmanager
