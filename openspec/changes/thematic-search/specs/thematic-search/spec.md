## ADDED Requirements

### Requirement: Keyword search across datasets

The system SHALL allow users to search features by keyword across all Jingjin datasets.

#### Scenario: Keyword search activated
- **WHEN** user enters a keyword in the search panel
- **THEN** the system SHALL query all datasets for features whose name or attributes match the keyword
- **AND** results SHALL be grouped by dataset

#### Scenario: Fuzzy matching
- **WHEN** searching with a partial keyword (e.g., "北京")
- **THEN** the system SHALL return features whose NAME field contains the keyword (LIKE %keyword%)
- **AND** match across multiple attribute fields where applicable

#### Scenario: No results
- **WHEN** no features match the search keyword
- **THEN** the system SHALL display "未找到匹配的要素" message

### Requirement: Filter by administrative level

The system SHALL support filtering search results by administrative level (province/county/township).

#### Scenario: Province level filter
- **WHEN** user selects "省级" filter
- **THEN** results SHALL include features at province level (County_P, Province_L data)

#### Scenario: County level filter
- **WHEN** user selects "县级" filter
- **THEN** results SHALL include features at county level

#### Scenario: Township level filter
- **WHEN** user selects "乡镇级" filter
- **THEN** results SHALL include township-level features (Town_P)

### Requirement: Search result details

The system SHALL display detailed attribute information for each search result.

#### Scenario: Click result to view details
- **WHEN** user clicks a result item
- **THEN** a detail panel SHALL show all available attribute fields
- **AND** the map SHALL fly to the feature's location
- **AND** a popup SHALL display on the map

#### Scenario: Result highlights on map
- **WHEN** search results are returned
- **THEN** all matching features SHALL be highlighted on the map
- **AND** different geometry types SHALL use different visual styles

### Requirement: Search history

The system SHALL show recent search queries for quick re-search.

#### Scenario: Recent searches
- **WHEN** user clicks the search input
- **THEN** recent search keywords SHALL be displayed below the input
- **AND** clicking a recent keyword SHALL re-execute the search

### Requirement: Results are clearable

The system SHALL allow users to clear search results and map highlights.

#### Scenario: Clear search
- **WHEN** user clicks the clear button
- **THEN** the search results SHALL be cleared
- **AND** all map highlights SHALL be removed
