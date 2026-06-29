Summary of Changes
Database
2026_venue_hospitality.sql — New migration: adds venue_id + venue_name columns to hospitality_assignments, extends the level enum with 'venue', recreates the unique key to include venue_id, and adds an index on venue_id.
API — PHP
HospitalityRepository.php
determineLevel() — venue_id resolves to level 'venue'
upsertAssignment() — inserts/updates venue_id + venue_name columns
removeAssignmentsAtScope(), findAssignmentByScope(), getAssignmentsAtScope() — all iterate venue_id in scope fields
resolveHospitalitiesForTicket() + resolveHospitalitiesForEvent() — accept ?string $venueId parameter; inject a venue-level SQL condition and include venueLevel in the deduplication merge order (most-specific wins: ticket > event > category > team > tournament > sport > venue)
New getAssignmentsForVenue() and replaceVenueAssignments() methods
getHospitalityStats() — includes venue_assignments count
HospitalityController.php — Three new methods: getVenueHospitalities, replaceVenueHospitalities, removeVenueHospitalities
Application.php — Three new admin routes under /admin/venue-hospitalities/{venueId}
PublicTicketEnhancementsController.php — Both getEventEffectiveHospitalities and getTicketEffectiveHospitalities now read venue_id from query params and forward it to the repository
Admin App
hospitalityService.ts — AssignmentLevel union extended with 'venue'; HospitalityAssignment gains venue_id/venue_name fields; HospitalityAssignmentScope gains venue_id/venue_name; new getVenueHospitalities, replaceVenueHospitalities, removeVenueHospitalities methods
VenueHospitalityManagement.tsx — New page: search/browse venues, select one, toggle hospitality packages on/off, save with a single PUT call
VenueHospitalityManagement.module.css — Styles for the page
App.tsx — Import + /venue-hospitality route added
DashboardLayout.tsx — Building2 icon imported; Venue Hospitality nav link added after Hospitality Services
Frontend App
hospitalityService.ts — ResolvedHospitality.level union extended with 'venue'; getResolvedEventHospitalities accepts and sends venue_id query param
usePublicEventHospitalities.ts — venueId parameter added, forwarded to the service
EventTicketsPage.tsx — event?.venue_id passed as the final argument to usePublicEventHospitalities