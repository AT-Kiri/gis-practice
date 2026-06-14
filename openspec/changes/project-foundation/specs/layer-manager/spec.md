## ADDED Requirements

### Requirement: Layer manager panel displays all loaded layers

The system SHALL display a panel listing all map layers with their names and types.

#### Scenario: Layer panel renders with layer list
- **WHEN** the map is loaded with layers
- **THEN** a layer management panel SHALL be available (as sidebar or overlay)
- **AND** each layer SHALL be listed with its display name (Chinese)
- **AND** the base map layer SHALL be visually distinguished from overlay layers

### Requirement: Layer visibility can be toggled

The system SHALL allow users to show or hide individual layers.

#### Scenario: Toggle layer visibility on
- **WHEN** user checks a layer in the layer panel that is currently hidden
- **THEN** the layer SHALL immediately become visible on the map

#### Scenario: Toggle layer visibility off
- **WHEN** user unchecks a layer in the layer panel that is currently visible
- **THEN** the layer SHALL immediately become hidden on the map

### Requirement: Layer transparency can be adjusted

The system SHALL allow users to adjust the opacity/transparency of individual layers.

#### Scenario: Layer opacity slider works
- **WHEN** user drags the opacity slider for a layer
- **THEN** the layer opacity SHALL update in real-time on the map
- **AND** the slider SHALL range from 0 (fully transparent) to 1 (fully opaque)

### Requirement: Layer order can be rearranged

The system SHALL support drag-and-drop reordering of overlay layers.

#### Scenario: Drag layer to reorder
- **WHEN** user drags a layer up or down in the layer list
- **THEN** the layer's draw order on the map SHALL update accordingly
- **AND** layers at the top of the list SHALL render on top

### Requirement: Layer panel can be shown/hidden

The system SHALL allow toggling the visibility of the layer management panel.

#### Scenario: Toggle layer panel
- **WHEN** user clicks the layer manager toggle button
- **THEN** the layer panel SHALL collapse if expanded
- **AND** SHALL expand if collapsed
