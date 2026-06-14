## ADDED Requirements

### Requirement: Project scaffolding initializes with standard structure

The system SHALL provide a standardized project structure for both frontend and backend.

#### Scenario: Frontend project scaffold created
- **WHEN** developer runs `npm create vite@latest` with Vue3 template
- **THEN** the frontend directory contains `src/` with `components/`, `views/`, `router/`, `stores/`, `utils/`, `assets/` subdirectories
- **AND** `vite.config.js` is configured with proxy for `/iserver` requests

#### Scenario: Backend project scaffold created
- **WHEN** developer initializes SpringBoot project via Maven
- **THEN** the backend directory contains standard Maven structure (`src/main/java`, `src/main/resources`, `pom.xml`)

### Requirement: Frontend dependencies are correctly configured

The system SHALL declare all required frontend dependencies in `package.json`.

#### Scenario: Core dependencies installed
- **WHEN** developer runs `npm install`
- **THEN** `package.json` SHALL include `vue@^3.4`, `vue-router@^4`, `pinia`, `ant-design-vue@^4`, `@supermap/vue-iclient-mapboxgl`, `mapbox-gl`, `axios`
- **AND** all dependencies resolve without peer dependency warnings

#### Scenario: Dev dependencies installed
- **WHEN** developer runs `npm install`
- **THEN** `package.json` SHALL include `vite`, `@vitejs/plugin-vue` as devDependencies

### Requirement: Backend dependencies are correctly configured

The system SHALL declare all required backend dependencies in `pom.xml`.

#### Scenario: SpringBoot parent configured
- **WHEN** Maven builds the project
- **THEN** `pom.xml` SHALL use `spring-boot-starter-parent` as parent
- **AND** include `spring-boot-starter-web`, `spring-boot-starter-actuator` as dependencies

### Requirement: Project runs correctly in development mode

The system SHALL start without errors on both frontend and backend.

#### Scenario: Frontend dev server starts
- **WHEN** developer runs `npm run dev` in frontend directory
- **THEN** Vite dev server starts on `localhost:5173` (or configured port)
- **AND** displays the application without console errors

#### Scenario: Backend server starts
- **WHEN** developer runs `mvn spring-boot:run` in backend directory
- **THEN** SpringBoot starts on `localhost:8080`
- **AND** health endpoint returns `200 OK`
