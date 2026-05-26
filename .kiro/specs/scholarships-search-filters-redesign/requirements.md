# Requirements Document

## Introduction

The public scholarships browsing page (`/scholarships`) currently uses a dated search and filter UI: a plain text input, a 3-column grid of checkbox lists for Country / Funding / Level, a text "Clear all" button, and a basic native `<select>` for sort order. This feature redesigns the search bar and filter section with a modern look that matches the site's existing theme (teal/coral/sand/ink tokens, serif display headings, rounded corners, soft shadows, warm radial gradient background), while preserving every existing behavior: free-text search across title/country/funding/level/tags, multi-select filtering for country/funding/level, sort by best match / deadline / funding, URL sync of the `q` parameter, and a responsive layout. The admin scholarships page is explicitly out of scope for this spec.

## Glossary

- **Public_Scholarships_Page**: The Next.js client component rendered at `/scholarships` (`apps/web/src/app/scholarships/page.tsx`) that lists published scholarships.
- **Search_Bar**: The free-text input at the top of the filter section that filters scholarships by title, country, funding label, level label, and tags.
- **Filter_Section**: The container above the results grid that holds the Search_Bar, the per-facet filter controls (Country, Funding, Level), the active-filter chip row, the result count, and the "Clear all" affordance.
- **Filter_Facet**: A single multi-select filter group. The three facets are Country, Funding, and Level.
- **Filter_Chip**: A pill-shaped toggle button used to select or deselect a single facet value (e.g., a country, a funding type, a level).
- **Active_Filter_Chip**: A removable pill displayed in the active-filter row, showing one currently applied filter value with an "x" affordance to remove it.
- **Country_Picker**: The control that exposes the Country facet. Because country lists can be long, this control is allowed to be a popover/dropdown rather than an always-visible chip row.
- **Sort_Control**: The control that selects the result ordering. Its options are "Best match", "Deadline", and "Funding".
- **Result_Count**: A label that displays how many scholarships match the current search and filter state.
- **Clear_All_Affordance**: A control inside the Filter_Section that resets the search term, all selected facets, and the sort order to their defaults.
- **Mobile_Filter_Drawer**: A bottom sheet or side drawer that contains the full Filter_Section content on small viewports, opened from a "Filters" toggle button.
- **Theme_Tokens**: The CSS custom properties defined in `apps/web/src/app/globals.css` (e.g. `--teal-500`, `--teal-700`, `--coral-400`, `--coral-500`, `--sand-100`, `--sand-200`, `--ink-500`, `--ink-700`, `--ink-900`, `--sky-200`, `--shadow`, `--font-display`, `--font-body`).
- **Small_Viewport**: A viewport whose width is at most 820px (matching the existing breakpoint in `scholarships.module.css`).

## Requirements

### Requirement 1: Modernized Search Bar

**User Story:** As a Bangladeshi student browsing scholarships, I want a polished, easy-to-use search input, so that I can quickly type a query and see clear visual feedback while I search.

#### Acceptance Criteria

1. THE Search_Bar SHALL render a leading search icon visually inside the input on its leading edge.
2. THE Search_Bar SHALL use the body font at a font size of at least 15px and a placeholder color sourced from the `--ink-500` Theme_Token.
3. WHEN the Search_Bar input is focused, THE Public_Scholarships_Page SHALL render a focus ring using the `--teal-500` Theme_Token with a contrast ratio of at least 3:1 against the input background.
4. WHEN the Search_Bar input contains one or more characters, THE Search_Bar SHALL display a clear-input button at its trailing edge.
5. WHEN the user activates the clear-input button, THE Search_Bar SHALL set its value to the empty string and return keyboard focus to the input.
6. THE Search_Bar SHALL filter the results list by matching the case-insensitive trimmed query against each scholarship's title, country, mapped funding label, mapped level label, and tags, preserving the existing match logic in `apps/web/src/app/scholarships/page.tsx`.
7. WHEN the page loads with a `q` URL search parameter, THE Search_Bar SHALL initialize its value from that parameter.
8. THE Search_Bar SHALL use a border radius of at least 12px and a soft shadow consistent with the existing card styling in `scholarships.module.css`.

### Requirement 2: Chip-Based Filter Controls

**User Story:** As a student exploring scholarships, I want to toggle filters using modern chips instead of a wall of checkboxes, so that the interface feels lighter and easier to scan.

#### Acceptance Criteria

1. THE Filter_Section SHALL expose up to three Filter_Facets — Country, Funding, and Level — subject to the visibility rules in AC12 and AC13.
2. THE Funding facet SHALL render each available funding option as a Filter_Chip in a horizontally wrapping row.
3. THE Level facet SHALL render each available level option as a Filter_Chip in a horizontally wrapping row.
4. WHEN a Filter_Chip is in the unselected state, THE Filter_Chip SHALL render with a white or `--sand-100` background, a `--sand-200` border, and `--ink-700` text.
5. WHEN a Filter_Chip is in the selected state, THE Filter_Chip SHALL render with a `--teal-700` background and white text.
6. WHEN the user activates a Filter_Chip, THE Filter_Section SHALL toggle that value's membership in the corresponding selected list.
7. THE Country_Picker SHALL present its options inside a popover, dropdown, or accordion so that long country lists do not dominate the page layout.
8. WHEN the Country_Picker is open, THE Country_Picker SHALL allow the user to select and deselect multiple country values without closing between selections.
9. WHEN the Country_Picker is closed and one or more countries are selected, THE Country_Picker SHALL display a count of currently selected countries on its trigger.
10. THE Filter_Section SHALL filter the results list using the same multi-select logic currently in `apps/web/src/app/scholarships/page.tsx` (a scholarship matches when its country, mapped funding label, and mapped level label are each either unconstrained or present in the corresponding selected list).
11. THE Filter_Section SHALL derive each facet's available options from the loaded scholarships list, identical to the current `useMemo` derivations.
12. WHERE a Filter_Facet has zero available options for the loaded scholarships, THE Filter_Section SHALL hide that facet's control.
13. WHERE a Filter_Facet has exactly one available option for the loaded scholarships, THE Filter_Section SHALL render that facet's control with the single option visible as a Filter_Chip.

### Requirement 3: Active Filter Chips Row

**User Story:** As a student adjusting filters, I want to see all my currently applied filters in one place and remove them individually, so that I always know what is narrowing my results.

#### Acceptance Criteria

1. WHEN at least one of the search term, Country, Funding, or Level selections is non-empty, THE Filter_Section SHALL render an active-filters row that lists every currently applied selection as an Active_Filter_Chip.
2. THE Filter_Section SHALL render one Active_Filter_Chip per selected Country value, one per selected Funding value, one per selected Level value, and one for the search term when the search term is non-empty.
3. THE Active_Filter_Chip SHALL display the value's user-visible label and a removal affordance (e.g. an "×" icon button) with an accessible name of the form "Remove filter <label>".
4. WHEN the user activates an Active_Filter_Chip's removal affordance, THE Filter_Section SHALL remove that single value from its corresponding state and leave all other filters and the sort order unchanged.
5. WHEN the search term, Country, Funding, and Level selections are all empty, THE Filter_Section SHALL NOT render the active-filters row.

### Requirement 4: Themed Sort Control

**User Story:** As a student comparing scholarships, I want the sort control to look intentional and consistent with the rest of the page, so that the results header doesn't feel like a leftover form element.

#### Acceptance Criteria

1. THE Sort_Control SHALL offer exactly the options "Best match", "Deadline", and "Funding".
2. THE Sort_Control SHALL apply the same sort behavior as the existing `sortBy` logic in `apps/web/src/app/scholarships/page.tsx` for each option.
3. THE Sort_Control SHALL render with rounded corners of at least 12px, a `--sand-200` border, and the body font at a font size of at least 13px.
4. WHEN the Sort_Control is focused via keyboard, THE Public_Scholarships_Page SHALL render a focus ring using the `--teal-500` Theme_Token.
5. THE Sort_Control SHALL be operable using keyboard alone, including selecting any of the three options without a pointer.
6. WHEN the Sort_Control's selection changes, THE Public_Scholarships_Page SHALL re-render the results in the new order without performing a full page reload, while URL updates and browser history changes are permitted.

### Requirement 5: Result Count and Clear All

**User Story:** As a student narrowing my search, I want a visible count of matching scholarships and a one-click way to reset everything, so that I always know how my changes are affecting the list.

#### Acceptance Criteria

1. THE Filter_Section SHALL display the Result_Count using the format "<n> match" when n equals 1 and "<n> matches" otherwise, where n is the number of scholarships passing the current search and filters.
2. THE Filter_Section SHALL render the Clear_All_Affordance as a button styled consistently with the redesigned chips and inputs (rounded corners of at least 12px, theme-token colors).
3. WHEN the user activates the Clear_All_Affordance, THE Filter_Section SHALL set the search term to the empty string, clear the Country, Funding, and Level selections, and reset the Sort_Control to "Best match".
4. WHILE the search term is empty and the Country, Funding, and Level selections are all empty and the Sort_Control is set to "Best match", THE Clear_All_Affordance SHALL be either hidden or rendered in a visibly disabled state.
5. THE Result_Count SHALL update synchronously whenever the search term, any facet selection, or the loaded scholarships list changes.

### Requirement 6: Theme Consistency

**User Story:** As a visitor to the site, I want the new search and filter UI to look like it belongs to BairePorbo, so that the experience feels cohesive across pages.

#### Acceptance Criteria

1. THE Filter_Section SHALL use only color values that resolve to the existing Theme_Tokens (teal, coral, sand, ink, sky scales) plus white, transparent, and shadow values consistent with `var(--shadow)`.
2. THE Filter_Section SHALL apply container border radii of at least 16px and soft shadows consistent with the existing `.filters` rule in `scholarships.module.css`.
3. THE Filter_Section SHALL render section headings (e.g. facet labels) using the `--font-display` token at a font size of at least 13px.
4. THE Filter_Section SHALL render against the page's existing radial-gradient body background without introducing an opaque full-bleed background that hides the gradient, while semi-transparent backgrounds (e.g. white at less than 100% opacity) used to improve text readability are permitted.
5. THE Filter_Section SHALL preserve the spacing rhythm of the existing page (top-level gap of 32px between hero, filters, and results sections).

### Requirement 7: Functional Parity With Existing Behavior

**User Story:** As an existing user of the scholarships page, I want every search and filter behavior I rely on today to keep working after the redesign, so that nothing I depend on regresses.

#### Acceptance Criteria

1. THE Public_Scholarships_Page SHALL load published scholarships from the `scholarships` Supabase table with the same selected columns and ordering as the current implementation.
2. THE Public_Scholarships_Page SHALL apply the existing `FUNDING_MAP` and `LEVEL_MAP` translations when displaying funding and level labels in filter controls, Active_Filter_Chips, and result cards.
3. WHEN the Search_Bar value changes, THE Public_Scholarships_Page SHALL update the URL's `q` query parameter to match the current search term using client-side navigation that does not reload the page.
4. WHEN the page loads with `q` set in the URL, THE Public_Scholarships_Page SHALL apply that value as the initial search term.
5. THE Public_Scholarships_Page SHALL retain the existing results card grid, deadline badge styling, bookmark toggling, and "View details" link behavior unchanged by this redesign.
6. THE Filter_Section SHALL filter and sort the results client-side using the same combined predicate and ordering currently in `useMemo` in `apps/web/src/app/scholarships/page.tsx`.

### Requirement 8: Responsive and Mobile Layout

**User Story:** As a student browsing on a phone, I want the redesigned filters to collapse cleanly so they don't overwhelm the screen, so that I can still search and filter comfortably on a small device.

#### Acceptance Criteria

1. WHILE the viewport width is greater than 820px, THE Filter_Section SHALL render the Search_Bar, all visible Filter_Facets, the active-filter row, the Result_Count, and the Clear_All_Affordance inline within the page.
2. WHILE the viewport is a Small_Viewport, THE Filter_Section SHALL collapse all Filter_Facets behind a single "Filters" toggle button that opens a Mobile_Filter_Drawer.
3. WHEN the user activates the "Filters" toggle button, THE Mobile_Filter_Drawer SHALL open and contain the Country_Picker, Funding chips, Level chips, the active-filter row, the Result_Count, and the Clear_All_Affordance.
4. WHEN the Mobile_Filter_Drawer is open, THE Mobile_Filter_Drawer SHALL provide a visible close affordance and SHALL close when the user activates that affordance or presses the Escape key.
5. WHILE the viewport is a Small_Viewport, THE Search_Bar SHALL remain visible on the page outside the Mobile_Filter_Drawer.
6. WHILE the viewport is a Small_Viewport, THE Sort_Control SHALL remain reachable either above the results grid or inside the Mobile_Filter_Drawer.
7. WHEN the "Filters" toggle button is rendered and one or more filters are active, THE "Filters" toggle button SHALL display a numeric badge equal to the total count of active Country, Funding, and Level selections.

### Requirement 9: Accessibility

**User Story:** As a user relying on a keyboard or screen reader, I want the new filter controls to be fully usable and announced clearly, so that the redesign does not lock me out of the page.

#### Acceptance Criteria

1. THE Search_Bar SHALL associate a visible or screen-reader-only label with the input, identifying its purpose as searching scholarships.
2. THE Search_Bar's clear-input button SHALL have an accessible name of "Clear search".
3. THE Filter_Chips SHALL be implemented as toggle buttons that expose their pressed state to assistive technologies (for example via `aria-pressed`).
4. THE Country_Picker trigger SHALL expose its expanded state to assistive technologies (for example via `aria-expanded`) and SHALL identify the popover content via an `aria-controls` relationship.
5. WHEN the Country_Picker popover is open, THE Country_Picker SHALL trap or manage keyboard focus such that Tab cycles through the picker's options and Escape closes the picker and returns focus to its trigger.
6. WHILE the Country_Picker popover is closed, THE Country_Picker trigger SHALL be reachable via the page's natural Tab order and SHALL open the popover when activated by Enter or Space.
7. THE Active_Filter_Chip removal buttons SHALL each expose an accessible name of the form "Remove filter <label>".
8. THE Mobile_Filter_Drawer SHALL be implemented with `role="dialog"` (or equivalent), expose an accessible name, trap keyboard focus while open, and return focus to the "Filters" toggle button when closed.
9. THE redesigned Filter_Section SHALL maintain a color contrast ratio of at least 4.5:1 between text and its background for all body-sized text, and at least 3:1 for visual focus indicators against adjacent surfaces.
