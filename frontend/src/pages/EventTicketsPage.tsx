import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin,
  Users, 
  Tv2, 
  Shield, 
  MapPinned, 
  IdCard,
  ChefHat,
  Building2,
  Sparkles
} from 'lucide-react';
import { useEventDetails } from '../hooks/useEventDetails';
import { useTickets } from '../hooks/useTickets';
import { useEventGuestRequirements } from '../hooks/useEventGuestRequirements';
import { useMultiCurrencyConversion } from '../hooks/useMultiCurrencyConversion';
import { useSelectedCurrency } from '../contexts/CurrencyContext';
import { useEventEffectiveMarkups } from '../hooks/useTicketEnhancements';
import { calculateEffectiveMarkupAmount } from '../services/ticketEnhancementsService';
import { usePublicEventHospitalities } from '../hooks/usePublicEventHospitalities';
import DOMPurify from 'dompurify';
import VenueMap from '../components/VenueMap';
import CartPanel from '../components/CartPanel';
import type { Ticket } from '../services/apiRoutes';
import styles from './EventTicketsPage.module.css';
import { useSEO } from '../hooks/useSEO';

// CartItem — hospitality is now informational only (included with ticket)
export interface CartItem {
  ticket: Ticket;
  quantity: number;
  /** Read-only list of hospitalities included with this ticket (no pricing) */
  includedHospitalities?: { hospitality_id: number; name: string; description?: string | null }[];
}

const EventTicketsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [hoveredTicketCategory, setHoveredTicketCategory] = useState<string | null>(null);

  // Fixed-position hospitality tooltip state
  const [tooltipTicketId, setTooltipTicketId] = useState<string | null>(null);
  // iconRect: bounding rect of the icon that triggered the tooltip
  const [iconRect, setIconRect] = useState<DOMRect | null>(null);
  // Computed final position (set by useLayoutEffect after measuring the tooltip)
  const [tooltipFinalPos, setTooltipFinalPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const [tooltipPlacement, setTooltipPlacement] = useState<'above' | 'below'>('above');
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showHospitalityTooltip = useCallback((ticketId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setIconRect(e.currentTarget.getBoundingClientRect());
    setTooltipFinalPos(null);
    setTooltipTicketId(ticketId);
  }, []);

  // After the tooltip renders, measure it and compute a fully viewport-clamped position.
  // This runs synchronously before the browser paints, preventing any visible jump.
  useLayoutEffect(() => {
    if (!tooltipRef.current || !iconRect) return;
    const el = tooltipRef.current;
    const gap = 10;
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Cap the tooltip height so it never exceeds the viewport
    const naturalHeight = el.scrollHeight;
    const maxAllowedHeight = vh - pad * 2;
    const tooltipHeight = Math.min(naturalHeight, maxAllowedHeight);
    const tooltipWidth = el.offsetWidth;

    // Prefer above, fall back to below
    const spaceAbove = iconRect.top - gap - pad;
    const spaceBelow = vh - iconRect.bottom - gap - pad;
    let placement: 'above' | 'below';
    let top: number;

    if (spaceAbove >= tooltipHeight || spaceAbove >= spaceBelow) {
      placement = 'above';
      top = iconRect.top - tooltipHeight - gap;
    } else {
      placement = 'below';
      top = iconRect.bottom + gap;
    }

    // Clamp vertically so the tooltip never goes outside the viewport
    if (top < pad) top = pad;
    if (top + tooltipHeight > vh - pad) top = vh - pad - tooltipHeight;

    // Clamp horizontally (centred on the icon)
    let left = iconRect.left + iconRect.width / 2 - tooltipWidth / 2;
    if (left < pad) left = pad;
    if (left + tooltipWidth > vw - pad) left = vw - pad - tooltipWidth;

    setTooltipPlacement(placement);
    setTooltipFinalPos({ top, left, maxHeight: tooltipHeight });
  }, [tooltipTicketId, iconRect]);

  const hideHospitalityTooltip = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipTicketId(null);
      setIconRect(null);
      setTooltipFinalPos(null);
    }, 100);
  }, []);
  
  // Fetch event details and tickets
  const { event, loading: eventLoading, error: eventError } = useEventDetails(eventId);
  // Apply SEO – use the event name as a dynamic title suffix once loaded
  useSEO('event-tickets', { titleSuffix: event?.event_name ?? undefined });
  const { tickets, loading: ticketsLoading, error: ticketsError } = useTickets({ event_id: eventId });
  
  // Get user-selected currency from global context
  const { selectedCurrencyCode } = useSelectedCurrency();
  
  // Get all unique currencies from tickets for multi-currency conversion
  // Always include 'USD' so we can convert fixed markup amounts
  const ticketCurrencies = useMemo(() => {
    const codes = tickets.map(t => t.currency_code).filter(Boolean);
    if (!codes.includes('USD')) {
      codes.push('USD');
    }
    return codes;
  }, [tickets]);
  
  // Multi-currency conversion to the user-selected currency
  const { 
    convertAmount, 
    getExchangeRate,
    hasConversion: hasConversionForCurrency,
    isLoading: currencyLoading
  } = useMultiCurrencyConversion(ticketCurrencies, selectedCurrencyCode);
  
  // Fetch guest requirements for this event
  const { 
    requirements: guestRequirements, 
    loading: requirementsLoading, 
    error: requirementsError,
    fetchRequirements 
  } = useEventGuestRequirements();

  // Collect ticket IDs for hierarchical markup resolution
  const ticketIds = useMemo(() => tickets.map(t => t.ticket_id), [tickets]);

  // Collect XS2Event category_ids aligned to ticketIds for category-level hospitality resolution
  const categoryIds = useMemo(() => tickets.map(t => t.category_id), [tickets]);

  // Deduplicated category IDs that have purchasable tickets — drives venue map availability dimming
  const availableCategoryIds = useMemo(
    () => [...new Set(tickets.map(t => t.category_id))],
    [tickets]
  );

  // Fetch effective (hierarchically-resolved) markup pricing for this event
  // Priority: legacy ticket > ticket rule > event rule > team rule > tournament rule > sport rule
  const { 
    effectiveMarkupsByTicket: markupsByTicket,
    loading: markupLoading
  } = useEventEffectiveMarkups(
    eventId,
    event?.sport_type,
    ticketIds,
    event?.tournament_id,
    event?.hometeam_id
  );

  // Fetch hierarchically resolved hospitality assignments for this event (PUBLIC API)
  // Both hometeam_id and visiting_id are passed so team-level assignments for either team are shown.
  const {
    ticketHasHospitalities,
    getHospitalitiesForTicket
  } = usePublicEventHospitalities(
    eventId,
    event?.sport_type,
    ticketIds,
    event?.tournament_id,
    event?.hometeam_id,
    categoryIds,
    event?.visiting_id,
    event?.venue_id
  );

  // Registration form state
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [regStatus, setRegStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle');
  const [regMessage, setRegMessage] = useState('');

  // Fetch guest requirements when event loads (Phase 1: Step 2)
  useEffect(() => {
    if (eventId && event && !guestRequirements && !requirementsLoading) {
      fetchRequirements(eventId);
    }
  }, [eventId, event, guestRequirements, requirementsLoading, fetchRequirements]);

  // Filter tickets based on availability
  const filteredTickets = showAvailableOnly 
    ? tickets.filter(ticket => ticket.ticket_status === 'available' && ticket.stock > 0)
    : tickets;

  // Format event date for display based on single vs multi-day events
  const formatEventDate = (event: any) => {
    const startDate = new Date(event.date_start);
    const endDate = new Date(event.date_stop);

    // Check if it's a single day event (same date, different times)
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const startTime = startDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const endTime = endDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    if (startDateOnly.getTime() === endDateOnly.getTime()) {
      // Single day event - format as 'Tuesday, 30-Sep-2025, 14:00 - 16:00'
      const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
      const day = startDate.getDate();
      const month = startDate.toLocaleDateString('en-US', { month: 'short' });
      const year = startDate.getFullYear();
      return `${dayName}, ${day}-${month}-${year}, ${startTime} - ${endTime}`;
    } else {
      // Multi-day event - format as 'From Friday, 03-Oct-2025, 14:00 to Sunday, 05-Oct-2025, 16:00'
      const startDayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
      const endDayName = endDate.toLocaleDateString('en-US', { weekday: 'long' });
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      // Handle year difference if it's a multi-year event
      const startDateStr = `${startDay}-${startMonth}-${startYear}`;
      const endDateStr = endYear !== startYear ? `${endDay}-${endMonth}-${endYear}` : `${endDay}-${endMonth}-${endYear}`;

      return `From ${startDayName}, ${startDateStr}, ${startTime} to ${endDayName}, ${endDateStr}, ${endTime}`;
    }
  };

  // Check if this is a team sport (has both home and visiting teams)
  const isTeamSport = (event: any) => {
    return event.hometeam_name && event.visiting_name && event.hometeam_name !== event.visiting_name;
  };

  // All three must finish before we show any price — prevents raw supplier price flashing.
  const priceReady = !ticketsLoading && !currencyLoading && !markupLoading;

  // Format price with correct currency and apply hierarchical markup pricing if available.
  // Only called once priceReady === true so exchange rates and markups are guaranteed to be loaded.
  const formatPrice = (ticket: Ticket) => {
    const currency = ticket.currency_code || 'USD';
    const price = ticket.face_value || 0;

    const markup = markupsByTicket.get(ticket.ticket_id) ?? null;

    const convertUsdToSelected = (usdAmount: number): number => {
      if (selectedCurrencyCode === 'USD') return usdAmount;
      if (hasConversionForCurrency('USD')) return convertAmount(usdAmount, 'USD');
      return usdAmount;
    };

    // Convert from ticket currency to selected display currency
    const basePrice = (hasConversionForCurrency(currency) && currency !== selectedCurrencyCode)
      ? convertAmount(price, currency)
      : price;

    const markupAmount = calculateEffectiveMarkupAmount(basePrice, markup, convertUsdToSelected);
    const finalPrice = basePrice + markupAmount;

    return `${selectedCurrencyCode} ${finalPrice.toFixed(2)}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setRegStatus('error');
      setRegMessage('Please provide a valid email address.');
      return;
    }

    setRegStatus('loading');
    try {
      const response = await fetch(`${import.meta.env.VITE_CUSTOMER_API_BASE_URL}/api/v1/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          submit_from: 'Interest register'
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.already) {
          setRegStatus('already');
          setRegMessage('You are already registered for interest updates!');
        } else {
          setRegStatus('success');
          setRegMessage('Thank you for your interest! We will contact you soon.');
          setFormData({ name: '', email: '' });
        }
      } else {
        setRegStatus('error');
        setRegMessage(result.message || 'Failed to register your interest. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setRegStatus('error');
      setRegMessage('An error occurred. Please try again.');
    }
  };

  // Handle add ticket — hospitalities are now included with the ticket (no selection modal)
  const handleAddTicket = (ticket: Ticket) => {
    // Gather included hospitalities (informational only — no pricing)
    const hospitalities = getHospitalitiesForTicket(ticket.ticket_id).map(h => ({
      hospitality_id: h.hospitality_id,
      name: h.name,
      description: h.description
    }));

    addTicketToCart(ticket, hospitalities);
  };

  // Add ticket to cart with included hospitality info (read-only, no pricing)
  const addTicketToCart = (ticket: Ticket, hospitalities: { hospitality_id: number; name: string; description?: string | null }[]) => {
    const existingItem = cartItems.find(item => item.ticket.ticket_id === ticket.ticket_id);
    
    if (existingItem) {
      // Update quantity if item already exists (merge hospitalities)
      setCartItems(cartItems.map(item =>
        item.ticket.ticket_id === ticket.ticket_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item to cart with included hospitalities
      setCartItems([...cartItems, { ticket, quantity: 1, includedHospitalities: hospitalities }]);
    }
    
    // Open cart panel
    setIsCartOpen(true);
  };

  // Cart management functions
  const handleUpdateQuantity = (ticketId: string, quantity: number) => {
    setCartItems(cartItems.map(item =>
      item.ticket.ticket_id === ticketId
        ? { ...item, quantity }
        : item
    ));
  };

  const handleRemoveItem = (ticketId: string) => {
    setCartItems(cartItems.filter(item => item.ticket.ticket_id !== ticketId));
  };

  const handleCloseCart = () => {
    setIsCartOpen(false);
  };

  // Handle opening checkout flow
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      return; // Don't navigate if cart is empty
    }

    // Prepare event data for checkout page
    const eventData = {
      event_name: event?.event_name || '',
      tournament_name: event?.tournament_name || '',
      season: event?.season || '',
      date_start: event?.date_start || '',
      venue_name: event?.venue_name || '',
      city: event?.city || ''
    };

    // Calculate final prices for each cart item (with markup and currency conversion)
    // Converts to the user-selected currency using live exchange rates
    // Note: hospitality is now inclusive — no separate pricing
    const cartItemsWithFinalPrices = cartItems.map(item => {
      const currency = item.ticket.currency_code || 'USD';
      const faceValue = item.ticket.face_value || 0;
      
      // Get effective markup for this ticket (from hierarchical resolution)
      const markup = markupsByTicket.get(item.ticket.ticket_id);
      
      // Helper: convert a USD amount to the selected currency
      const convertUsdToSelected = (usdAmount: number): number => {
        if (selectedCurrencyCode === 'USD') return usdAmount;
        if (hasConversionForCurrency('USD')) return convertAmount(usdAmount, 'USD');
        return usdAmount;
      };
      
      // Mirror CartPanel.getTicketFinalPrice() exactly — 3 branches:
      // 1. Conversion available + ticket currency ≠ selected → convert then apply markup
      // 2. Ticket currency already matches selected → apply markup directly
      // 3. No conversion available + currency mismatch → use raw face_value, no markup
      // This guarantees the checkout page shows the same price as the cart panel.
      let basePrice = faceValue;
      let markupAmount = 0;

      if (hasConversionForCurrency(currency) && currency !== selectedCurrencyCode) {
        basePrice = convertAmount(faceValue, currency);
        markupAmount = calculateEffectiveMarkupAmount(basePrice, markup ?? null, convertUsdToSelected);
      } else if (currency === selectedCurrencyCode) {
        markupAmount = calculateEffectiveMarkupAmount(basePrice, markup ?? null, convertUsdToSelected);
      }
      // else: no conversion available — use raw face_value with no markup (matches CartPanel)
      
      // Final price in selected currency
      const finalPrice = basePrice + markupAmount;
      
      return {
        ...item,
        finalPriceUSD: finalPrice,
        markupAmount,
        totalPricePerTicket: finalPrice
      };
    });

    // Convert markupsByTicket Map to plain object for serialization
    const markupsObject: Record<string, any> = {};
    markupsByTicket.forEach((value, key) => {
      markupsObject[key] = value;
    });

    setIsCartOpen(false);
    
    // Navigate directly to login page to start authentication-first checkout flow
    navigate('/checkout/login', {
      state: {
        cartItems: cartItemsWithFinalPrices,
        eventData,
        guestRequirements: guestRequirements || null,
        markupsData: markupsObject,
        selectedCurrencyCode
      }
    });
  };

  if (eventLoading || ticketsLoading) {
    return (
      <div className={styles.eventTicketsPage}>
        <div className={styles.container}>
          <div className={styles.pageGrid}>
            {/* Left Column */}
            <div className={styles.leftColumn}>
              {/* Event Details Skeleton */}
              <div className={styles.eventDetails}>
                <div className={styles.skeletonEventTitle}></div>
                
                <div className={styles.skeletonEventInfo}>
                  <div className={styles.skeletonInfoItem}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonInfoText}></div>
                  </div>
                  
                  <div className={styles.skeletonInfoItem}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonInfoText}></div>
                  </div>
                  
                  <div className={styles.skeletonInfoItem}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonInfoTextLong}></div>
                  </div>
                </div>

                <div className={styles.skeletonEventMeta}>
                  <div className={styles.skeletonTournament}></div>
                  <div className={styles.skeletonTeamVs}>
                    <div className={styles.skeletonTeamName}></div>
                    <div className={styles.skeletonVs}></div>
                    <div className={styles.skeletonTeamName}></div>
                  </div>
                </div>
              </div>

              {/* Tickets Skeleton */}
              <div className={styles.ticketsSection}>
              <div className={styles.ticketsHeader}>
                <div className={styles.skeletonTicketsTitle}></div>
                <div className={styles.skeletonCheckbox}>
                  <div className={styles.skeletonCheckboxInput}></div>
                  <div className={styles.skeletonCheckboxLabel}></div>
                </div>
              </div>

              <div className={styles.ticketsList}>
                {[...Array(3)].map((_, index) => (
                  <div key={index} className={styles.skeletonTicketCard}>
                    <div className={styles.skeletonTicketInfo}>
                      <div className={styles.skeletonTicketHeader}>
                        <div className={styles.skeletonTicketTitle}></div>
                        <div className={styles.skeletonCategoryType}></div>
                      </div>
                      
                      <div className={styles.skeletonTicketDetails}>
                        <div className={styles.skeletonTicketMeta}>
                          <div className={styles.skeletonCategoryName}></div>
                          <div className={styles.skeletonTicketStatus}></div>
                        </div>
                        
                        <div className={styles.skeletonStockInfo}></div>
                      </div>
                    </div>

                    <div className={styles.skeletonTicketPrice}>
                      <div className={styles.skeletonPriceAmount}></div>
                      <div className={styles.skeletonAddButton}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Right Column */}
            <div className={styles.rightColumn}>
              {/* Venue Map Skeleton */}
              <div className={styles.venueImages}>
                <div className={styles.skeletonVenueMapContainer}>
                  <div className={styles.skeletonMapControls}>
                    <div className={styles.skeletonMapTitle}></div>
                    <div className={styles.skeletonMapSubtitle}></div>
                  </div>
                  
                  <div className={styles.skeletonSvgContainer}>
                    <div className={styles.skeletonVenueMapPlaceholder}>
                      <div className={styles.skeletonVenueIcon}></div>
                    </div>
                  </div>
                  
                  <div className={styles.skeletonCategoryLegend}>
                    <div className={styles.skeletonLegendTitle}></div>
                    <div className={styles.skeletonCategoryList}>
                      {[...Array(4)].map((_, index) => (
                        <div key={index} className={styles.skeletonCategoryItem}>
                          <div className={styles.skeletonCategoryColor}></div>
                          <div className={styles.skeletonCategoryName}></div>
                          <div className={styles.skeletonCategoryPrice}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Form Skeleton */}
              <div className={styles.registrationSection}>
              <div className={styles.registrationCard}>
                <div className={styles.skeletonRegistrationTitle}></div>
                <div className={styles.skeletonRegistrationText}></div>
                
                <div className={styles.skeletonRegistrationForm}>
                  <div className={styles.skeletonFormInput}></div>
                  <div className={styles.skeletonFormInput}></div>
                  <div className={styles.skeletonSubmitButton}></div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (eventError || ticketsError) {
    return (
      <div className={styles.eventTicketsPage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <p>Error loading event: {eventError || ticketsError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.eventTicketsPage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <p>Event not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.eventTicketsPage}>
      <div className={styles.container}>
        <div className={styles.pageGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            {/* Event Details */}
            <div className={styles.eventDetails}>
              <h1 className={styles.eventTitle}>{event.event_name}</h1>
              
              <div className={styles.eventInfo}>
                <div className={styles.infoItem}>
                  <Calendar className={styles.infoIcon} size={20} />
                  <span>{formatEventDate(event)}</span>
                </div>
                
                <div className={styles.infoItem}>
                  <MapPin className={styles.infoIcon} size={20} />
                  <span>{event.venue_name}, {event.city}, {event.iso_country}</span>
                </div>

                <div className={styles.tournament}>
                  <strong>{event.tournament_name}</strong> - {event.season}
                </div>

              </div>
            </div>

            {/* Tickets Section */}
            <div className={styles.ticketsSection}>
            <div className={styles.ticketsHeader}>
              <div className={styles.ticketsTitle}>
                <h2>Available Tickets</h2>
                <p className={styles.ticketsSubtitle}>
                  <MapPin size={14} />
                  Hover over tickets to see their location on the venue map
                </p>
              </div>
              <div className={styles.ticketFilters}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={showAvailableOnly}
                    onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  />
                  <span>Show available tickets</span>
                </label>
              </div>
            </div>

            <div className={styles.ticketsList}>
              {filteredTickets.length === 0 ? (
                <div className={styles.emptyTickets}>
                  <p>No tickets available</p>
                </div>
              ) : (
                filteredTickets.map(ticket => (
                  <div 
                    key={ticket.ticket_id} 
                    className={styles.ticketCard}
                    onMouseEnter={() => setHoveredTicketCategory(ticket.category_id)}
                    onMouseLeave={() => setHoveredTicketCategory(null)}
                  >
                    <div className={styles.ticketInfo}>
                      <div className={styles.ticketHeader}>
                        <div className={styles.titleRow}>
                          <h3 className={styles.ticketTitle}>
                            {ticket.ticket_title}
                          </h3>
                        </div>

                        {/* Seat Options & Features */}
                        <div className={styles.seatFeatures}>
                          {ticket.options?.pairs_only && (
                            <div className={styles.featureIcon} data-tooltip="Tickets must be sold in pairs">
                              <Users size={16} />
                            </div>
                          )}
                          {ticket.options?.videowall && (
                            <div className={styles.featureIcon} data-tooltip="This place offers you a large video wall to follow all the action">
                              <Tv2 size={16} />
                            </div>
                          )}
                          {ticket.options?.covered_seat && (
                            <div className={styles.featureIcon} data-tooltip="This ticket offers you covered area">
                              <Shield size={16} />
                            </div>
                          )}
                          {ticket.options?.numbered_seat && (
                            <div className={styles.featureIcon} data-tooltip="This ticket offers you numbered seating">
                              <MapPinned size={16} />
                            </div>
                          )}
                          {ticket.options?.customer_details_required && (
                            <div className={styles.featureIcon} data-tooltip="Customer information is required">
                              <IdCard size={16} />
                            </div>
                          )}
                          {ticket.category_type === 'grandstand' && (
                            <div className={styles.featureIcon} data-tooltip="This place offers you a seat on a grandstand">
                              <Building2 size={16} />
                            </div>
                          )}
                          {ticketHasHospitalities(ticket.ticket_id) && (
                            <div
                              className={`${styles.featureIcon} ${styles.hospitalityIcon}`}
                              onMouseEnter={(e) => showHospitalityTooltip(ticket.ticket_id, e)}
                              onMouseLeave={hideHospitalityTooltip}
                            >
                              <ChefHat size={16} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.ticketPrice}>
                      <div className={styles.priceDisplay}>
                        {priceReady ? (
                          <span className={styles.priceAmount}>
                            {formatPrice(ticket)}
                          </span>
                        ) : (
                          <span className={styles.priceSkeleton} aria-hidden="true" />
                        )}
                      </div>
                      
                      {ticket.ticket_status === 'available' && ticket.stock > 0 ? (
                        <button 
                          className={styles.addTicketButton}
                          onClick={() => handleAddTicket(ticket)}
                        >
                          Add Ticket
                        </button>
                      ) : (
                        <button 
                          className={styles.addTicketButton}
                          disabled
                        >
                          {ticket.ticket_status === 'disabled' ? 'Not Available' : 'Sold Out'}
                        </button>
                      )}
                      
                      <div className={styles.ticketMeta}>
                        <span className={styles.ticketStatus} data-status={ticket.ticket_status}>
                          {ticket.ticket_status.charAt(0).toUpperCase() + ticket.ticket_status.slice(1)}
                        </span>
                        {ticket.stock > 0 && (
                          <span className={styles.stockInfo}>
                            {ticket.stock}+ Tickets Left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>

          {/* Right Column */}
          <div className={styles.rightColumn}>
            {/* Venue Map */}
            <div className={styles.venueImages}>
              {eventId && (
                <VenueMap
                  venueId={event.venue_id}
                  eventId={eventId}
                  className={styles.venueMapContainer}
                  externalHoveredCategory={hoveredTicketCategory}
                  availableCategoryIds={availableCategoryIds}
                />
              )}
            </div>

            {/* Registration Form */}
            <div className={styles.registrationSection}>
              <div className={styles.registrationCard}>
                <h2>Can't find the ticket you are looking for?</h2>
                <p>Please register your interest below to get updates to future {isTeamSport(event) ? `${event.hometeam_name} matches` : `${event.event_name} events`}.</p>
                
                <form onSubmit={handleSubmit} className={styles.registrationForm}>
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      placeholder="Name"
                      value={formData.name}
                      onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setRegStatus('idle'); }}
                      required
                      className={styles.formInput}
                      disabled={regStatus === 'loading' || regStatus === 'success'}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setRegStatus('idle'); }}
                      required
                      className={styles.formInput}
                      disabled={regStatus === 'loading' || regStatus === 'success'}
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={regStatus === 'loading' || regStatus === 'success'}
                  >
                    {regStatus === 'loading' ? 'Registering…' : 'REGISTER YOUR INTEREST'}
                  </button>
                  
                  {regStatus !== 'idle' && regMessage && (
                    <p className={`${styles.registrationMsg} ${styles[`registrationMsg__${regStatus}`]}`}>
                      {regMessage}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={handleCloseCart}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        eventData={event ? {
          event_name: event.event_name,
          tournament_name: event.tournament_name,
          season: event.season,
          date_start: event.date_start,
          venue_name: event.venue_name,
          city: event.city
        } : undefined}
        guestRequirements={guestRequirements}
        guestRequirementsLoading={requirementsLoading}
        guestRequirementsError={requirementsError}
        currencyConversion={{
          hasConversion: true,
          convertAmount,
          getExchangeRate,
          hasConversionForCurrency,
          targetCurrencyCode: selectedCurrencyCode
        }}
        markupsByTicket={markupsByTicket}
      />

      {/* Fixed-position hospitality tooltip rendered via portal */}
      {tooltipTicketId && createPortal(
        <div
          ref={tooltipRef}
          className={`${styles.hospitalityTooltipFixed} ${tooltipPlacement === 'below' ? styles.tooltipBelow : styles.tooltipAbove}`}
          style={tooltipFinalPos ? {
            top: tooltipFinalPos.top,
            left: tooltipFinalPos.left,
            visibility: 'visible',
          } : {
            visibility: 'hidden',
          }}
          onMouseEnter={() => { if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); }}
          onMouseLeave={hideHospitalityTooltip}
        >
          <div className={styles.tooltipArrow} />
          <div className={styles.tooltipHeader}>
            <ChefHat size={14} />
            <span>Included Hospitality</span>
          </div>
          <ul
            className={styles.tooltipList}
            style={tooltipFinalPos ? { maxHeight: tooltipFinalPos.maxHeight - 52, overflowY: 'auto' } : undefined}
          >
            {getHospitalitiesForTicket(tooltipTicketId).map(h => (
              <li key={h.hospitality_id} className={styles.tooltipItem}>
                <Sparkles size={12} className={styles.tooltipItemIcon} />
                <div className={styles.tooltipItemContent}>
                  <span className={styles.tooltipItemName}>{h.name}</span>
                  {h.description && (
                    <div
                      className={styles.tooltipItemDescription}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(h.description) }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}

    </div>
  );
};

export default EventTicketsPage;
