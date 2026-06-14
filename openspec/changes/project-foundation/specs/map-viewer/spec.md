## ADDED Requirements

### Requirement: Map container displays SuperMap iServer tile layer

The system SHALL display a MapboxGL map with SuperMap iServer tile service as the base layer.

#### Scenario: Map loads with default layer
- **WHEN** the application starts and MapContainer component mounts
- **THEN** a MapboxGL map instance SHALL be created
- **AND** the map SHALL display the `map-world` tile layer from SuperMap iServer as base map
- **AND** the `map-jingjin` layer SHALL be overlaid on top

#### Scenario: Map center defaults to Beijing-Tianjin region
- **WHEN** the map loads for the first time
- **THEN** the map center SHALL be at `[116.4, 39.9]` (Beijing-Tianjin region center)
- **AND** the initial zoom level SHALL be `8`

#### Scenario: Map fills container responsively
- **WHEN** the browser window is resized
- **THEN** the map SHALL automatically resize to fill its parent container
- **AND** no map artifacts or blank areas SHALL appear

### Requirement: Map supports multiple coordinate reference systems

The system SHALL support the default MapboxGL Web Mercator (EPSG:3857) projection.

#### Scenario: Web Mercator projection
- **WHEN** the map renders
- **THEN** the map SHALL use EPSG:3857 projection by default
- **AND** iServer layers SHALL display correctly aligned with the base map

### Requirement: Map displays loading state

The system SHALL display a loading indicator while map tiles are being fetched.

#### Scenario: Loading indicator shown during tile loading
- **WHEN** the map is loading tiles from iServer
- **THEN** a loading spinner or progress indicator SHALL be visible
- **AND** the indicator SHALL disappear when all tiles are loaded

### Requirement: Map handles iServer connection errors gracefully

The system SHALL display a user-friendly message when iServer services are unreachable.

#### Scenario: iServer unavailable
- **WHEN** the iServer service is not running or unreachable
- **THEN** the map area SHALL display an error message: "地图服务连接失败，请检查 iServer 是否运行"
- **AND** a retry button SHALL be provided
