## ADDED Requirements

### Requirement: Map displays an overview (eagle eye) window

The system SHALL display a small overview map in the corner showing the full extent with a rectangle indicating the current viewport.

#### Scenario: Overview map renders
- **WHEN** the main map loads
- **THEN** a small overview map SHALL appear in the bottom-right corner
- **AND** the overview map SHALL show a reduced-scale view of the same area
- **AND** a colored rectangle SHALL indicate the current main map viewport extent

#### Scenario: Overview rectangle updates on map pan
- **WHEN** user pans the main map
- **THEN** the extent rectangle in the overview map SHALL move accordingly
- **AND** the update SHALL be real-time (no manual refresh needed)

#### Scenario: Overview rectangle updates on map zoom
- **WHEN** user zooms in/out on the main map
- **THEN** the extent rectangle in the overview map SHALL resize accordingly

### Requirement: Overview map supports toggle visibility

The system SHALL allow users to show or hide the overview map.

#### Scenario: Toggle overview visibility
- **WHEN** user clicks the overview toggle button
- **THEN** the overview map panel SHALL hide if currently visible
- **AND** SHALL show if currently hidden

### Requirement: Clicking overview map re-centers main map

The system SHALL allow users to click a location on the overview map to re-center the main map there.

#### Scenario: Click overview re-centers main map
- **WHEN** user clicks a point on the overview map
- **THEN** the main map SHALL smoothly animate to center on the clicked location
