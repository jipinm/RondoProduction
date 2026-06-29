import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useMultiCurrencyConversion } from '../../hooks/useMultiCurrencyConversion';
import { useSelectedCurrency } from '../../contexts/CurrencyContext';
import { useEventMinPrices } from '../../hooks/useEventMinPrices';
import type { Event } from '../../services/apiRoutes';
import styles from './FeaturedEvents.module.css';

// ─── Filter Dropdown ──────────────────────────────────────────────────────────

const FilterDropdown: React.FC<{
  value: string;
  options: string[];
  onChange: (value: string) => void;
}> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`${styles.filterDropdown} ${isOpen ? styles.open : ''}`}>
      <button className={styles.filterButton} onClick={() => setIsOpen(!isOpen)}>
        {value}
        <span className={styles.filterIcon}>▼</span>
      </button>
      {isOpen && (
        <div className={styles.filterDropdownMenu}>
          {options.map(option => (
            <button
              key={option}
              onClick={() => { onChange(option); setIsOpen(false); }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FeaturedEvents: React.FC = () => {
  const navigate = useNavigate();

  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [priceFilter, setPriceFilter] = useState('Price');

  // Fetch all events (no sport/team filter — show everything)
  const { events, loading, totalSize, hasMore, loadMore, loadingMore } = useEvents({});

  const { selectedCurrencyCode } = useSelectedCurrency();

  // Fetch actual min ticket prices from real ticket data (native currency per event)
  const eventIds = useMemo(() => events.map(e => e.event_id), [events]);
  const { eventMinPrices, loading: minPricesLoading } = useEventMinPrices(eventIds);

  // Derive all currencies present in real ticket data so conversion rates are fetched for them
  const allTicketCurrencies = useMemo(() => {
    // GBP is pre-included so its rate is fetched before min prices arrive,
    // preventing a one-render window where GBP prices fall back to EUR estimate.
    const set = new Set(['EUR', 'USD', 'GBP']);
    eventMinPrices.forEach(prices => Object.keys(prices).forEach(c => set.add(c)));
    return [...set];
  }, [eventMinPrices]);

  const { convertAmount, hasConversion: hasConversionForCurrency, isLoading: currencyLoading } = useMultiCurrencyConversion(
    allTicketCurrencies,
    selectedCurrencyCode
  );

  // ── Build city options directly from the loaded events ─────────────────────
  // event.city already contains the human-readable city name (e.g. "London"),
  // so no secondary API call is needed.
  const locationOptions = useMemo(() => {
    const cities = Array.from(new Set(events.map(e => e.city).filter(Boolean))).sort();
    return ['All Locations', ...cities];
  }, [events]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const formatDateColumn = (dateString: string) => {
    const d = new Date(dateString);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    };
  };

  const formatEventDate = (event: Event) => {
    const start = new Date(event.date_start);
    const end = new Date(event.date_stop);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const fmt = (d: Date) =>
      `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.getDate()}-${d.toLocaleDateString('en-US', { month: 'short' })}-${d.getFullYear()}`;

    if (startDay.getTime() === endDay.getTime()) return fmt(start);
    return `From ${fmt(start)} to ${fmt(end)}`;
  };

  const formatPrice = (event: Event): string => {
    // Prefer native-currency min prices from real ticket data to avoid stale EUR cross-rate error
    const nativePrices = eventMinPrices.get(event.event_id);
    if (nativePrices && Object.keys(nativePrices).length > 0) {
      let minConverted = Infinity;
      for (const [currency, price] of Object.entries(nativePrices)) {
        const converted =
          currency === selectedCurrencyCode
            ? price
            : hasConversionForCurrency(currency)
            ? convertAmount(price, currency)
            : null;
        if (converted !== null && converted < minConverted) minConverted = converted;
      }
      // Return correct price if any rate was available; return '' (not EUR fallback)
      // if rates are still loading — avoids showing stale EUR cross-rate while waiting.
      return minConverted !== Infinity ? `${selectedCurrencyCode} ${minConverted.toFixed(2)}` : '';
    }

    // No native data — fall back to XS2Event EUR estimate
    if (!event.min_ticket_price_eur || event.min_ticket_price_eur === 0) return '';
    const converted = convertAmount(event.min_ticket_price_eur, 'EUR');
    return `${selectedCurrencyCode} ${converted.toFixed(2)}`;
  };

  // ── Filter + sort ────────────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    let list = [...events];

    // Location — filter by event.city
    if (locationFilter !== 'All Locations') {
      list = list.filter(e => e.city === locationFilter);
    }

    // Date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'Today') {
      list = list.filter(e => {
        const d = new Date(e.date_start);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return day.getTime() === today.getTime();
      });
    } else if (dateFilter === 'This Week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      list = list.filter(e => {
        const d = new Date(e.date_start);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return day >= weekStart && day <= weekEnd;
      });
    } else if (dateFilter === 'This Month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      list = list.filter(e => {
        const d = new Date(e.date_start);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return day >= monthStart && day <= monthEnd;
      });
    }

    // Price sort
    if (priceFilter === 'Low to High') {
      list.sort((a, b) => (a.min_ticket_price_eur || 0) - (b.min_ticket_price_eur || 0));
    } else if (priceFilter === 'High to Low') {
      list.sort((a, b) => (b.min_ticket_price_eur || 0) - (a.min_ticket_price_eur || 0));
    } else {
      // Default: chronological
      list.sort((a, b) => {
        const tA = a.date_start ? new Date(a.date_start).getTime() : NaN;
        const tB = b.date_start ? new Date(b.date_start).getTime() : NaN;
        if (isNaN(tA) && isNaN(tB)) return 0;
        if (isNaN(tA)) return 1;
        if (isNaN(tB)) return -1;
        return tA - tB;
      });
    }

    return list;
  }, [events, locationFilter, dateFilter, priceFilter]);

  const clearFilters = () => {
    setLocationFilter('All Locations');
    setDateFilter('All Dates');
    setPriceFilter('Price');
  };

  const isFiltered = locationFilter !== 'All Locations' || dateFilter !== 'All Dates' || priceFilter !== 'Price';

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonSubtitle} />
            </div>
            <div className={styles.filtersRow}>
              {[...Array(3)].map((_, i) => <div key={i} className={styles.skeletonFilter} />)}
            </div>
          </div>
          <div className={styles.eventsList}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonDateCol}>
                  <div className={styles.skeletonLine} style={{ width: 30 }} />
                  <div className={styles.skeletonLine} style={{ width: 35, height: 28 }} />
                  <div className={styles.skeletonLine} style={{ width: 25 }} />
                </div>
                <div className={styles.skeletonInfo}>
                  <div className={styles.skeletonLine} style={{ width: '60%', height: 18 }} />
                  <div className={styles.skeletonLine} style={{ width: '40%' }} />
                </div>
                <div className={styles.skeletonPrice}>
                  <div className={styles.skeletonLine} style={{ width: 80 }} />
                  <div className={styles.skeletonLine} style={{ width: 110, height: 36, borderRadius: 24 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <h2 className={styles.sectionTitle}>Buy Now</h2>
            <p className={styles.eventsCount}>
              {isFiltered
                ? `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`
                : `${totalSize ?? filteredEvents.length} event${(totalSize ?? filteredEvents.length) !== 1 ? 's' : ''} available`}
            </p>
          </div>
          <div className={styles.filtersRow}>
            <FilterDropdown
              value={locationFilter}
              options={locationOptions}
              onChange={setLocationFilter}
            />
            <FilterDropdown
              value={dateFilter}
              options={['All Dates', 'Today', 'This Week', 'This Month']}
              onChange={setDateFilter}
            />
            <FilterDropdown
              value={priceFilter}
              options={['Price', 'Low to High', 'High to Low']}
              onChange={setPriceFilter}
            />
          </div>
        </div>

        {/* Events list */}
        {filteredEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎫</div>
            <h3 className={styles.emptyTitle}>No events found</h3>
            <p className={styles.emptyDescription}>
              No events match your current filters. Try adjusting them to see more events.
            </p>
            <div className={styles.emptyActions}>
              <button className={styles.clearFiltersButton} onClick={clearFilters}>
                Clear Filters
              </button>
              <Link to="/events" className={styles.viewAllButton}>
                Browse All Events
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.eventsList}>
            {filteredEvents.map(event => {
              const col = formatDateColumn(event.date_start);
              const dateLabel = formatEventDate(event);
              const price = formatPrice(event);

              return (
                <div
                  key={event.event_id}
                  className={styles.eventCard}
                  onClick={() => navigate(`/events/${event.event_id}/tickets`)}
                >
                  <div className={styles.eventContent}>
                    {/* Date column */}
                    <div className={styles.dateColumn}>
                      <span className={styles.dateMonth}>{col.month}</span>
                      <span className={styles.dateDay}>{col.day}</span>
                      <span className={styles.dateDayName}>{col.dayName}</span>
                    </div>

                    {/* Event info */}
                    <div className={styles.eventInfo}>
                      <h3 className={styles.eventTitle}>{event.event_name}</h3>
                      <div className={styles.eventMeta}>
                        <span>
                          {new Date(event.date_start).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}{' '}
                          | {event.venue_name}, {event.city}, {event.iso_country}
                        </span>
                        <span className={styles.eventDateLabel}>{dateLabel}</span>
                      </div>
                    </div>

                    {/* Price + CTA */}
                    <div className={styles.priceColumn}>
                      {(currencyLoading || minPricesLoading || (!price && !!event.min_ticket_price_eur)) ? (
                        <div className={styles.skeletonLine} style={{ width: 80, marginBottom: 8 }} />
                      ) : (
                        price && <div className={styles.priceLabel}>FROM {price}</div>
                      )}
                      <button
                        className={styles.viewTicketsButton}
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/events/${event.event_id}/tickets`);
                        }}
                      >
                        View Tickets
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className={styles.loadMoreWrapper}>
            <button
              className={styles.loadMoreButton}
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading more…' : 'Load More Events'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className={styles.sectionFooter}>
          <Link to="/events" className={styles.viewAllLink}>
            View All Events →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;
