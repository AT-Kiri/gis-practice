## ADDED Requirements

### Requirement: Toolbar provides distance measurement tool

The system SHALL provide a tool to measure distances on the map by clicking points.

#### Scenario: Distance measurement mode activated
- **WHEN** user clicks the distance measure button in the toolbar
- **THEN** the cursor SHALL change to crosshair to indicate measurement mode
- **AND** existing measurement results SHALL persist (unless cleared)

#### Scenario: Click points to measure distance
- **WHEN** user clicks multiple points on the map in distance measurement mode
- **THEN** a polyline SHALL be drawn connecting the clicked points
- **AND** the distance of each segment SHALL be labeled on the map
- **AND** the total cumulative distance SHALL be displayed

#### Scenario: Double-click ends measurement
- **WHEN** user double-clicks to finish measuring
- **THEN** the measurement polyline SHALL remain on the map for review
- **AND** the total distance result SHALL remain displayed

#### Scenario: Measurement displayed in appropriate units
- **WHEN** total distance is less than 1 km
- **THEN** it SHALL display in meters (m)
- **AND** when 1 km or more, it SHALL display in kilometers (km) with 2 decimal places

### Requirement: Toolbar provides area measurement tool

The system SHALL provide a tool to measure polygon areas on the map.

#### Scenario: Area measurement mode activated
- **WHEN** user clicks the area measure button in the toolbar
- **THEN** the cursor SHALL change to crosshair
- **AND** measurement mode SHALL be active

#### Scenario: Click points to measure area
- **WHEN** user clicks three or more points on the map in area measurement mode
- **THEN** a polygon SHALL be drawn connecting the clicked points
- **AND** the area SHALL be calculated and displayed

#### Scenario: Double-click completes area polygon
- **WHEN** user double-clicks to finish the area measurement
- **THEN** the polygon SHALL auto-close (connect last point to first)
- **AND** the calculated area SHALL be displayed on the polygon

#### Scenario: Area displayed in appropriate units
- **WHEN** the calculated area is less than 1 km²
- **THEN** it SHALL display in square meters (m²)
- **AND** when 1 km² or more, it SHALL display in square kilometers (km²) with 2 decimal places

### Requirement: Measurement results are clearable

The system SHALL allow users to clear all measurement graphics and results from the map.

#### Scenario: Clear all measurements
- **WHEN** user clicks the clear button
- **THEN** all measurement polylines, polygons, and labels SHALL be removed from the map
- **AND** the measurement result panel SHALL reset to empty state

### Requirement: Measurement tools are mutually exclusive

The system SHALL ensure only one measurement mode is active at a time.

#### Scenario: Switching measurement modes
- **WHEN** user activates area measurement while distance measurement is active
- **THEN** distance measurement SHALL be deactivated
- **AND** area measurement SHALL be activated
- **AND** previous measurement graphics SHALL remain visible
