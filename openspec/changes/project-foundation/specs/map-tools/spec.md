## ADDED Requirements

### Requirement: Toolbar provides zoom in/out buttons

The system SHALL provide zoom in and zoom out controls on the map.

#### Scenario: Zoom in button works
- **WHEN** user clicks the zoom in button (`+`)
- **THEN** the map zoom level SHALL increase by 1

#### Scenario: Zoom out button works
- **WHEN** user clicks the zoom out button (`-`)
- **THEN** the map zoom level SHALL decrease by 1

### Requirement: Map supports scroll wheel zoom

The system SHALL support standard mouse scroll wheel zoom interactions.

#### Scenario: Scroll wheel zooms map
- **WHEN** user scrolls up with mouse wheel over the map
- **THEN** the map SHALL zoom in
- **AND** when user scrolls down, the map SHALL zoom out

### Requirement: Map supports click-drag panning

The system SHALL support click-and-drag to pan the map.

#### Scenario: Mouse drag pans map
- **WHEN** user presses mouse button and drags on the map
- **THEN** the map view SHALL pan accordingly
- **AND** the map SHALL smoothly follow the cursor movement

### Requirement: Toolbar provides full extent button

The system SHALL provide a button to reset the map to its initial full extent.

#### Scenario: Full extent button resets view
- **WHEN** user clicks the full extent button (home icon)
- **THEN** the map SHALL smoothly animate back to the initial center `[116.4, 39.9]` at zoom level `8`

### Requirement: Map tools are visually grouped in a toolbar

The system SHALL display all map tool buttons in a unified floating toolbar on the map.

#### Scenario: Toolbar renders correctly
- **WHEN** the map loads
- **THEN** a vertical toolbar SHALL be displayed on the left side of the map
- **AND** the toolbar SHALL contain zoom in, zoom out, and full extent buttons
- **AND** each button SHALL have an icon and tooltip text
