## ADDED Requirements

### Requirement: Toolbar provides spatial query drawing tools

The system SHALL provide three spatial query drawing modes: point selection, rectangle selection, and circle selection.

#### Scenario: Point selection mode
- **WHEN** user clicks the point selection button in the spatial query toolbar
- **THEN** the cursor SHALL change to crosshair
- **AND** when user clicks a location on the map, a marker SHALL be placed
- **AND** the system SHALL query features within a default buffer distance (500m) of that point

#### Scenario: Rectangle selection mode
- **WHEN** user clicks the rectangle selection button
- **THEN** the cursor SHALL change to crosshair
- **AND** when user clicks and drags on the map, a rectangle SHALL be drawn
- **AND** when user releases the mouse, the system SHALL query features within that rectangle

#### Scenario: Circle selection mode
- **WHEN** user clicks the circle selection button
- **THEN** the cursor SHALL change to crosshair
- **AND** when user clicks a center point, then clicks again to set radius, a circle SHALL be drawn
- **AND** the system SHALL query features within that circle

#### Scenario: Drawing modes are mutually exclusive
- **WHEN** user activates a new drawing mode while another is active
- **THEN** the previous mode SHALL be deactivated
- **AND** any previous selection graphic SHALL be cleared

### Requirement: System queries multiple datasets

The system SHALL query the following Jingjin datasets for features intersecting the selection geometry:
- `County_P`（县级市）
- `Town_P`（乡镇）
- `Road_L`（道路）
- `Railway_L`（铁路）
- `River_L`（河流）
- `Lake_R`（湖泊）
- `Landuse_R`（土地利用）
- `Geomor_R`（地貌）
- `Coastline_L`（海岸线）

#### Scenario: Query across all datasets
- **WHEN** a selection geometry is drawn
- **THEN** the system SHALL query all configured datasets for features intersecting the geometry
- **AND** return unified results with dataset name and feature attributes

### Requirement: Query results displayed in paged list

The system SHALL display query results in a paginated panel.

#### Scenario: Results panel shows query statistics
- **WHEN** query completes
- **THEN** the results panel SHALL show total count and number of datasets queried

#### Scenario: Results paginated
- **WHEN** query returns more than 10 results
- **THEN** results SHALL be paginated with 10 items per page
- **AND** pagination controls SHALL be provided

#### Scenario: Each result item shows key info
- **WHEN** a result item is displayed
- **THEN** it SHALL show the feature name (if available), dataset name, and key attribute

### Requirement: Results highlighted on map

The system SHALL highlight query result features on the map.

#### Scenario: Results styled distinctly
- **WHEN** results are returned
- **THEN** point features SHALL be displayed as markers with a distinctive icon (blue)
- **AND** line features SHALL be drawn as colored lines (blue, 3px)
- **AND** polygon features SHALL be filled with semi-transparent blue

#### Scenario: Hover highlights individual feature
- **WHEN** user hovers over a result item in the list
- **THEN** the corresponding feature on the map SHALL be highlighted (brighter color / larger size)

### Requirement: Click result shows attribute details

The system SHALL display full attribute information when a result is clicked.

#### Scenario: Click result item shows popup
- **WHEN** user clicks a result item in the list
- **THEN** the map SHALL fly to that feature's location
- **AND** a popup SHALL display showing all available attribute fields and values

#### Scenario: Click map feature shows popup
- **WHEN** user clicks a highlighted feature on the map
- **THEN** a popup SHALL display with the feature's attributes

### Requirement: Query results are clearable

The system SHALL allow users to clear query results and selection graphics.

#### Scenario: Clear button
- **WHEN** user clicks the clear button in the spatial query toolbar
- **THEN** all selection graphics SHALL be removed
- **AND** all result markers and highlights SHALL be removed
- **AND** the results list SHALL be cleared
