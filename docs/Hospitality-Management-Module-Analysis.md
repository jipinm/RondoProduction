# Hospitality Management Module
## Analysis & Enhancement Proposal

**Document Type:** Client-Facing Analysis  
**Prepared for:** Rondo Sports  
**Date:** March 24, 2026  
**Status:** Functional Gap Identified — Enhancement Required  
**External Platform:** XS2Event API (https://docs.xs2event.com/)

---

## Executive Summary

The Rondo platform includes a Hospitality Management Module that allows administrators to configure and attach hospitality services (e.g., VIP lounge access, premium experiences) to sporting events. The system currently supports a flexible hierarchy for assigning these services across sport types, tournaments, and teams — but there is a critical gap at the **Ticket Category** level.

Hospitality services **cannot currently be assigned directly to an XS2Event Category** in a way that automatically applies across all events using that category. This forces administrators to configure hospitality services repeatedly for each individual event, which is inefficient and error-prone at scale.

This document explains how the current system works, identifies the precise gap — informed by the official XS2Event API documentation — and describes the required enhancement.

---

## 1. What Is a Hospitality Service?

A **Hospitality Service** is a premium add-on offering that can be made available to customers purchasing tickets for sporting events. Examples include:

- VIP Hospitality Lounge Access
- Pre-match fine dining experience
- Post-match meet & greet
- Premium seating package with catering (e.g., "100 Club")

Hospitality services are created by administrators and can be offered alongside standard ticketing. Each service has a name, description, and optional pricing.

---

## 2. Current System Architecture

### 2.1 Understanding the XS2Event Data Model

Rondo's platform is built on top of the **XS2Event API**, an external sports ticketing data provider. Before describing how the hospitality module works, it is important to understand the key entities XS2Event provides, as they form the foundation of the entire assignment hierarchy:

| XS2Event Resource | What It Represents | Stability |
|---|---|---|
| **Sport** | The sport type (e.g., `soccer`, `formula1`) | Permanent |
| **Tournament** | A seasonal competition (e.g., La Liga 2025/26) | Seasonal |
| **Team** | A participating team (e.g., Real Madrid) | Long-lived |
| **Event** | A single match on a specific date and time | Per-fixture |
| **Category** | A named section of the venue (e.g., "VIP Tribune", "100 Club") tied to the venue itself | Venue-scoped — reused across events |
| **Ticket** | A purchasable unit offered by a specific supplier for a category at an event | Event + supplier-specific |

> **Key insight from XS2Event documentation:** A `category_id` is scoped to the **venue**, not the event. The same category (e.g., the "100 Club" section of the Bernabéu) appears in every Real Madrid home match at that venue. Categories can be safely cached for up to one week — unlike tickets, which change too frequently. Every ticket in XS2Event belongs to exactly **one** Category.

### 2.2 How the Rondo Hospitality Module Is Structured

The hospitality module is built around two core concepts:

**Hospitality Services (the "what")**  
A catalogue of hospitality offerings managed by administrators. Each service is created once and can be reused across any number of events, teams, tournaments, or sports.

**Hospitality Assignments (the "where")**  
Rules that connect a hospitality service to a part of the sports catalogue. These assignments determine which customers are shown which hospitality options when browsing events.

### 2.3 The Assignment Hierarchy (Current State)

The system supports a five-level hierarchy for assigning hospitality services. Each level is progressively more specific:

```
SPORT LEVEL          (XS2Event: sport_type e.g. "soccer")
│   Applies to: ALL events across an entire sport
│
└── TOURNAMENT LEVEL (XS2Event: tournament_id)
    │   Applies to: ALL matches within one tournament (e.g., all La Liga fixtures)
    │
    └── TEAM LEVEL   (XS2Event: team_id)
        │   Applies to: ALL events involving a specific team (e.g., all Real Madrid matches)
        │
        └── EVENT LEVEL  (XS2Event: event_id)
            │   Applies to: ONE specific match only (e.g., Real Madrid vs Barcelona on 12 Apr)
            │
            └── TICKET LEVEL  ⚠️  (XS2Event: ticket_id — currently tied to a specific event AND supplier)
                    Applies to: ONE specific supplier ticket within ONE specific event
```

> ⚠️ **Important clarification:** The current "Ticket Level" in the system uses `ticket_id` from XS2Event, which is supplier- and event-specific. This is **not** the same as a reusable Category. See Section 4 for the full gap analysis.

### 2.4 How Assignments Work Today — The Additive Model

The platform uses what is called an **additive, most-specific-wins model**:

- When a customer views a ticket, the system collects hospitality services from **all** matching levels simultaneously
- If the same service appears at multiple levels, only the **most specific** assignment is applied (to avoid duplicates)
- Services from broader levels (e.g., sport or tournament) are automatically inherited by every event within that scope

**Example in practice:**  
If "VIP Lounge Access" is assigned at the *Tournament Level* for La Liga, it will automatically appear for every La Liga match — without any additional configuration needed per match.

### 2.5 Legacy System (Historical Context)

Prior to the current hierarchy system, hospitality services could only be attached via a simpler mechanism: **directly to a specific ticket within a specific event**. This system (referred to internally as `ticket_hospitalities`) required administrators to manually add the same service to every individual match, one by one.

The hierarchy system described above was introduced to address this scalability problem at the sport, tournament, team, and event levels. However, as described in Section 4 below, the Ticket Category level was not fully resolved.

---

## 3. Business Scenario — The Real Madrid Use Case

### 3.1 The Situation

Real Madrid FC offers premium hospitality packages for every home match played at the Bernabéu. Two consistent offerings are available for every home fixture:

- **Hospitality Package A** — "100 Club" — VIP lounge with complimentary dining
- **Hospitality Package B** — "Director's Box" — executive-level premium seating

These offerings do not change match-to-match. They are always available for the same ticket categories (e.g., the "VIP Seat" category used in every home match).

### 3.2 The Current Problem

Under the current system, an administrator must:

1. Open each individual Real Madrid home match (event by event)
2. Navigate to the hospitality configuration for that event
3. Manually attach "Hospitality A" and "Hospitality B" to the relevant ticket type within that event
4. Repeat this process for every upcoming match — typically 20–30 times per season

This creates several problems:

| Problem | Impact |
|---|---|
| High manual effort | Administrator time wasted on repetitive configuration |
| Risk of omission | A match could go live without hospitality services if a step is missed |
| Inconsistency | Configuration differences may appear between matches unintentionally |
| Difficult to change | Updating or removing a hospitality offering requires editing every event individually |

### 3.3 The Ideal Workflow

An administrator should be able to:

1. Define the ticket category once (e.g., "Real Madrid VIP Seat")
2. Assign "Hospitality A" and "Hospitality B" to that ticket category once
3. Have those services automatically appear for every event that includes that ticket category — with no further configuration required

---

## 4. Gap Analysis — Ticket Category Level Assignment

### 4.1 What XS2Event Calls a "Category"

According to the official **XS2Event API documentation**, a **Category** is defined as:

> *"A specific section in the venue. Tickets are always part of ONE category."*

Key characteristics of an XS2Event Category:

- Identified by a stable, permanent **`category_id`** (e.g., `7df2fbc7f06e4985be92fb263b1f9c63_ctg`)
- **Scoped to the venue**, not to any individual event — meaning `category_id` is the same for the "100 Club" section across every Real Madrid home match at the Bernabéu
- Has a human-readable **`category_name`** (e.g., `"Omar Sivori Club"`), multilingual `description`, and a **`category_type`** classification
- The `category_type` field includes values specifically for premium areas: `hospitality`, `offsite_hospitality`, `grandstand`, `generaladmission`, and others
- Categorised as **cacheable weekly** by XS2Event — confirming it is stable, long-lived data
- Every ticket purchased belongs to exactly **one** category

This is the correct concept to use as the "Ticket Category Level" — `category_id` is precisely the persistent, reusable venue-section identifier.

### 4.2 Why `ticket_id` Is the Wrong Identifier

The current Rondo system stores **`ticket_id`** (the XS2Event ticket identifier) at the most specific level of the assignment hierarchy. According to XS2Event documentation:

- A `ticket_id` identifies a ticket offered by a **specific supplier** for a **specific event** — it is both event-scoped and supplier-scoped
- Multiple `ticket_id`s can exist for the same physical seat at the same event (one per supplier)
- `ticket_id` values are **explicitly documented as not cacheable** — they change too frequently
- XS2Event warns: *"Each `ticket_id` implies a different supplier and means we cannot guarantee sitting together if you buy several tickets with different `ticket_id`""

Using `ticket_id` as the category level is therefore incorrect — it does not represent a reusable category at all. It represents one supplier's inventory listing for a single event.

### 4.3 The Correct Grouping Model

XS2Event documentation explicitly states that tickets should be grouped by:

```
event_id  +  category_id  +  sub_category
```

This grouping — particularly `category_id` — is the stable, reusable unit that makes sense as a hospitalilty assignment target. Assigning hospitality at the **Category Level** means:

> *"Whenever any event at this venue includes the [Category Name] section, include these hospitality services automatically — regardless of which supplier's tickets are displayed."*

### 4.4 Confirmed Gap

> ❌ **Category-level hospitality assignment (using XS2Event `category_id`) is NOT currently implemented.**

The gap exists at the data model, assignment logic, and user interface levels:

- **Data model gap:** The `hospitality_assignments` table stores `ticket_id` (XS2Event's supplier+event-specific identifier) but has no `category_id` column. There is no way to assign a hospitality service to a venue category.
- **Assignment gap:** There is no mechanism to say "assign Hospitality A to the '100 Club' category (`category_id = ...`) so it applies to all events at the Bernabéu that include this section."
- **UI gap:** The current admin assignment wizard navigates through sport → tournament → team → event → ticket, requiring an event to always be chosen before a ticket can be selected. There is no pathway for selecting a category independently.

### 4.5 Why This Gap Matters

| Scenario | Without the Enhancement | With the Enhancement |
|---|---|---|
| New Real Madrid match added | Admin must manually attach hospitality to each ticket type | Hospitality services apply automatically via `category_id` |
| Season with 20 home matches | 40+ manual assignment actions (2 hospitalities × 20 matches) | 2 assignment actions, done once |
| Hospitality offering updated | Must update every event individually | Update the category assignment once |
| New season starts | Entire setup must be repeated from scratch | No action needed — `category_id` persists across seasons at the same venue |

---

## 5. Target Assignment Hierarchy — After Enhancement

The following describes the intended hierarchy once the Ticket Category Level is introduced:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  LEVEL             │  XS2Event Identifier  │  SCOPE / EXAMPLE                     │
├───────────────────────────────────────────────────────────────────────────────────┤
│  Sport             │  sport_type           │  All Soccer events globally           │
│  Tournament        │  tournament_id        │  All La Liga 2025/26 matches          │
│  Team              │  team_id              │  All Real Madrid matches              │
│  Category  ★ NEW   │  category_id          │  All events at Bernabéu with          │
│                    │  (venue-scoped)       │  "100 Club" section                  │
│  Event             │  event_id             │  Real Madrid vs Barcelona 12 Apr only │
└───────────────────────────────────────────────────────────────────────────────────┘
★ Category level (XS2Event category_id) is the new addition required.
  It replaces the current misuse of ticket_id at the most specific level.
```

### 5.1 Hierarchy Behaviour

- Assignments from **broader levels** (Sport, Tournament, Team) are inherited automatically by all events within that scope
- The **Category** level (new) adds services that apply wherever a specific `category_id` is offered at any event — since `category_id` is venue-scoped, this automatically covers all future events at that venue that include the same seating section
- The **Event** level remains available for one-off, exception-based configurations (e.g., a special gala match with unique hospitality)
- If the same service is assigned at multiple levels, the **most specific level wins** (no duplicate services shown to customers)

### 5.2 Recommended Usage After Enhancement

| Assignment Level | When to Use |
|---|---|
| Sport | Hospitality services available for every event in an entire sport type |
| Tournament | Services exclusive to a specific competition (e.g., Champions League hospitality) |
| Team | Services tied to all events for a specific team |
| **Category (XS2Event `category_id`)** ★ | **Services linked to a named venue section — applies across all events at that venue using that section** |
| Event | One-time or exception hospitality for a unique fixture |

> **Best Practice:** The Event Level should be used sparingly — only for special circumstances. Most configuration should happen at the Team or Ticket Category level to keep the system maintainable.

---

## 6. Required Enhancement — Definition

### 6.1 What Needs to Be Built

| Component | Change Required |
|---|---|
| **Data Model** | Add a `category_id` column to the `hospitality_assignments` table. Since `category_id` is a stable XS2Event identifier (venue-scoped), no separate local master table is required — the ID itself is the reference |
| **Assignment Logic** | Allow hospitality services to be assigned using a `category_id` value and a `category_name` (for display), independent of any `event_id`. This creates a new assignment level between Team and Event in the hierarchy |
| **Resolution Engine** | When resolving hospitalities for a ticket at checkout, include a check: does the ticket's `category_id` have any hospitality assignments? If so, include those services in the result |
| **Admin Interface** | Add a "Category" step in the assignment wizard that allows an admin to enter or look up a `category_id` (fetched from the XS2Event `/v1/categories` endpoint) and assign hospitality services to it without selecting an event |

> **Note on XS2Event Category Types:** The XS2Event API classifies categories by `category_type`, with `hospitality` and `offsite_hospitality` as dedicated types. When browsing or filtering categories in the admin interface, these types should be surfaced prominently to help administrators quickly identify premium seating sections.

### 6.2 What Should Not Change

- All existing assignments at the Sport, Tournament, Team, and Event levels remain unchanged and fully functional
- The existing use of `ticket_id` at the most specific level can remain for edge cases (e.g., one specific supplier's ticket at one event), but it should no longer be the primary mechanism for reusable hospitality configuration
- Existing bookings and historical hospitality records are unaffected
- The additive, most-specific-wins model continues to apply

---

## 7. Expected Outcomes

Once the Ticket Category Level assignment is implemented, the following outcomes are expected:

### 7.1 Operational Efficiency
- Hospitality configuration for a team like Real Madrid is completed **once**, not repeated for every match
- New events added to the system automatically inherit hospitality services from their ticket categories — **zero additional configuration required**

### 7.2 Data Consistency
- All fans purchasing the same ticket type across different matches see the same hospitality options
- No risk of missed or inconsistent configuration between events

### 7.3 Reduced Maintenance Burden
- Updating a hospitality offering (e.g., changing the description of "100 Club") requires a single change that automatically propagates to all associated events
- Seasonal resets require no hospitality reconfiguration

### 7.4 Scalability
- As the platform grows to support more teams, leagues, and events, the Ticket Category level ensures hospitality configuration scales linearly with the number of ticket categories — not with the number of events

---

## 8. Current System Strengths (What Is Already Working Well)

It is important to note that the Rondo platform already has a solid foundation:

✅ **Hospitality service catalogue** — Services are defined once and reused freely across the platform  
✅ **Multi-level hierarchy** — Sport, Tournament, and Team level assignments work correctly and efficiently  
✅ **Additive model** — Services from multiple levels are combined intelligently, avoiding duplicates  
✅ **Admin management interface** — A dedicated admin panel exists for managing services and assignments  
✅ **Customer-facing resolution** — When a customer views an event, the correct services are resolved and displayed automatically  
✅ **Audit trail** — All assignments and bookings record who made changes and when

The Ticket Category Level enhancement builds directly on this existing infrastructure and does not require a redesign of the system — only a targeted addition.

---

## 9. Summary

| Topic | Current State | After Enhancement |
|---|---|---|
| Sport-level assignment (`sport_type`) | ✅ Implemented | ✅ Unchanged |
| Tournament-level assignment (`tournament_id`) | ✅ Implemented | ✅ Unchanged |
| Team-level assignment (`team_id`) | ✅ Implemented | ✅ Unchanged |
| **Category-level assignment (`category_id`)** | ❌ Not implemented | ✅ To be built |
| Event-level assignment (`event_id`) | ✅ Implemented (for exceptions) | ✅ Unchanged |
| Ticket/supplier-level assignment (`ticket_id`) | ✅ Implemented (legacy, event-scoped) | ✅ Retained for edge cases |
| Auto-assignment on new events | Partial (sport/tournament/team only) | Full (includes XS2Event categories) |
| Manual effort per-match | Required for category-level hospitality | Eliminated |

---

*This document was prepared based on a review of the Rondo platform codebase as of March 2026, including the database schema, backend business logic, admin interface, and public-facing APIs. The gap analysis is informed by the official XS2Event API documentation at https://docs.xs2event.com/, specifically the Category resource definition and the ticket grouping model (`event_id` + `category_id` + `sub_category`).*
