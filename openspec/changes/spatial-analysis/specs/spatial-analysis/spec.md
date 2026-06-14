## ADDED Requirements

### Requirement: Buffer analysis on selected features

The system SHALL allow users to perform buffer analysis on map features.

#### Scenario: Draw geometry for buffer
- **WHEN** user clicks the buffer analysis button
- **THEN** drawing tools SHALL be available (point/line/polygon)
- **AND** a buffer radius input SHALL be shown

#### Scenario: Set buffer distance
- **WHEN** user has drawn a geometry
- **THEN** user SHALL be able to set buffer distance in meters
- **AND** click "执行分析" to run the buffer analysis

#### Scenario: Buffer result displayed
- **WHEN** buffer analysis completes
- **THEN** the buffer zone SHALL be displayed as a semi-transparent polygon on the map
- **AND** the original geometry SHALL remain visible

#### Scenario: Buffer on road network
- **WHEN** user selects a road (Road_L) and sets a buffer radius
- **THEN** features intersecting the buffer zone SHALL be listed

### Requirement: Overlay analysis between datasets

The system SHALL support overlay analysis between two datasets.

#### Scenario: Select overlay datasets
- **WHEN** user clicks the overlay analysis button
- **THEN** a form SHALL show with source dataset and operate dataset selectors
- **AND** operation type selector (UNION/INTERSECT/ERASE/UPDATE/CLIP/IDENTITY/XOR)

#### Scenario: Default overlay (Landuse_R + Geomor_R)
- **WHEN** user opens overlay analysis
- **THEN** source dataset SHALL default to "Landuse_R@Jingjin"
- **AND** operate dataset SHALL default to "Geomor_R@Jingjin"

#### Scenario: Overlay result displayed
- **WHEN** overlay analysis completes
- **THEN** the result SHALL be displayed as a colored polygon layer on the map
- **AND** a popup on each feature SHALL show attributes from both source and operate datasets
