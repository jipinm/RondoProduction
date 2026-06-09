import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';
import { FaUser, FaBars, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { MdArrowDropDown } from 'react-icons/md';
import { useSports } from '../../hooks/useSports';
import { useMenuHierarchy } from '../../hooks/useMenuHierarchy';
import { useTennisTournaments } from '../../hooks/useTennisTournaments';
import { useGolfTournaments } from '../../hooks/useGolfTournaments';
import { useDisplaySettings } from '../../hooks/useDisplaySettings';
import { useSiteBranding } from '../../hooks/useSiteBranding';
import { useAuth } from '../../services/customerAuth';
import { useSelectedCurrency } from '../../contexts/CurrencyContext';

// Sport display name mapping
const sportDisplayNames: Record<string, string> = {
  soccer: 'FOOTBALL',
  formula1: 'FORMULA ONE',
  rugby: 'RUGBY',
  tennis: 'TENNIS',
  golf: 'GOLF',
  motorsport: 'MOTORSPORT',
  basketball: 'BASKETBALL',
  nba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
  darts: 'DARTS',
  horseracing: 'HORSE RACING',
  boxing: 'BOXING',
  motogp: 'MOTOGP',
  combatsport: 'COMBAT SPORT',
  icehockey: 'ICE HOCKEY',
  dtm: 'DTM',
  superbike: 'SUPERBIKE',
  padel: 'PADEL',
};

// Fixed navigation sports (must remain in exact positions)
const FIXED_SPORTS = ['soccer', 'formula1', 'rugby', 'tennis', 'golf'];

// Helper functions to generate event links with proper parameters
// Note: Removed season parameter - using date_start filtering in API instead
const getEventLinkBySport = (sportType: string): string => {
  return `/events?sport_type=${sportType}`;
};

const getTeamsPageLink = (tournamentId: string): string => {
  const link = `/teams?tournament_id=${tournamentId}&sport_type=soccer&page=1&page_size=50`;
  return link;
};

const getTennisEventsLink = (tournamentId: string): string => {
  return `/events?sport_type=tennis&tournament_id=${tournamentId}`;
};

const getGolfEventsLink = (tournamentId: string): string => {
  return `/events?sport_type=golf&tournament_id=${tournamentId}`;
};

const Header: React.FC = () => {
  const { sports, loading, error } = useSports();
  const { settings: displaySettings } = useDisplaySettings();
  const { 
    tournaments: footballTournaments, 
    loading: tournamentsLoading, 
    error: tournamentsError
  } = useMenuHierarchy({ displaySettings });
  const {
    tournaments: tennisTournaments,
    loading: tennisTournamentsLoading,
    error: tennisTournamentsError
  } = useTennisTournaments();
  const {
    tournaments: golfTournaments,
    loading: golfTournamentsLoading,
    error: golfTournamentsError
  } = useGolfTournaments();
  const { isAuthenticated, logout } = useAuth();
  const { currencies, selectedCurrency, loading: currenciesLoading, setSelectedCurrency } = useSelectedCurrency();
  const { header_logo_url } = useSiteBranding();
  const [logoLoaded, setLogoLoaded] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);

  React.useEffect(() => {
    setLogoError(false);
    setLogoLoaded(false);
  }, [header_logo_url]);
  const [activeSubmenu, setActiveSubmenu] = React.useState<string | null>(null);
  const [accountDropdownOpen, setAccountDropdownOpen] = React.useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  const navigationRef = React.useRef<HTMLElement>(null);

  // Log sports data changes for debugging
  React.useEffect(() => {
    // Sports data updated
  }, [sports, loading, error]);

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure navigation starts from the beginning on mobile
  React.useEffect(() => {
    if (isMobile && navigationRef.current) {
      // Reset scroll position immediately
      navigationRef.current.scrollLeft = 0;
      
      // Also reset after a short delay to ensure it takes effect
      const timeoutId = setTimeout(() => {
        if (navigationRef.current) {
          navigationRef.current.scrollLeft = 0;
        }
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isMobile]);

  // Debug: Monitor account dropdown state
  React.useEffect(() => {
    console.log('Account dropdown state changed:', { 
      isMobile, 
      accountDropdownOpen 
    });
  }, [accountDropdownOpen, isMobile]);

  // Toggle submenu on mobile
  const handleMenuClick = (e: React.MouseEvent, menuId: string, hasSubmenu: boolean = false) => {
    if (isMobile && hasSubmenu) {
      // If submenu is not active, prevent navigation and show submenu
      if (activeSubmenu !== menuId) {
        e.preventDefault();
        e.stopPropagation();
        setActiveSubmenu(menuId);
      } else {
        // If submenu is already active and user clicks again, close it and allow navigation
        setActiveSubmenu(null);
      }
    }
  };

  // Close submenu when clicking on a submenu item
  const handleSubmenuItemClick = () => {
    if (isMobile) {
      setActiveSubmenu(null);
    }
  };

  // Toggle account dropdown
  const toggleAccountDropdown = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      e.stopPropagation();
      const newState = !accountDropdownOpen;
      console.log('Toggling account dropdown:', newState);
      setAccountDropdownOpen(newState);
    }
  };

  // Close account dropdown when clicking on a dropdown item
  const handleAccountItemClick = () => {
    if (isMobile) {
      setAccountDropdownOpen(false);
    }
  };

  // Toggle a section inside the mobile drawer
  const toggleDrawerSection = (section: string) => {
    setActiveSubmenu(prev => prev === section ? null : section);
  };

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Close submenu and account dropdown when clicking outside (mobile only)
  React.useEffect(() => {
    if (!isMobile || (!activeSubmenu && !accountDropdownOpen && !currencyDropdownOpen)) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the submenu or account dropdown
      if (target.closest(`.${styles.submenu}`) || 
          target.closest(`.${styles.navItemWithSubmenu}`) ||
          target.closest(`.${styles.topBarItemWithSubmenu}`) ||
          target.closest(`.${styles.currencySubmenu}`)) {
        return;
      }
      setActiveSubmenu(null);
      setAccountDropdownOpen(false);
      setCurrencyDropdownOpen(false);
    };

    // Use timeout to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobile, activeSubmenu, accountDropdownOpen, currencyDropdownOpen]);

  // Get display name for sport, fallback to sport_id if not mapped
  const getDisplayName = (sportId: string): string => {
    return sportDisplayNames[sportId] || sportId.toUpperCase();
  };

  // Filter sports for "OTHER SPORTS" dropdown (exclude fixed sports)
  const otherSports = sports.filter(sport => !FIXED_SPORTS.includes(sport.sport_id));

  // Apply admin-configured Other Sports visibility.
  // Empty array = show all — default behaviour preserved.
  const visibleOtherSports = displaySettings.other_sports_visible.length > 0
    ? otherSports.filter(s => displaySettings.other_sports_visible.includes(s.sport_id))
    : otherSports;

  // Log filtered sports for debugging
  React.useEffect(() => {
    if (sports.length > 0) {
      // Sports filtering results processed
    }
  }, [sports, otherSports]);

  // Render a sport item inside the mobile drawer
  const renderMobileDrawerSportItem = (sportId: string) => {
    const displayName = getDisplayName(sportId);
    const hasSubmenu = ['soccer', 'tennis', 'golf'].includes(sportId);

    if (!hasSubmenu) {
      return (
        <Link
          key={sportId}
          to={getEventLinkBySport(sportId)}
          className={styles.mobileDrawerItem}
          onClick={() => setMobileMenuOpen(false)}
        >
          <span>{displayName}</span>
        </Link>
      );
    }

    let tournaments = footballTournaments;
    let isLoading = tournamentsLoading;
    let hasError = !!tournamentsError;
    let linkFn = getTeamsPageLink;
    if (sportId === 'tennis') {
      tournaments = tennisTournaments;
      isLoading = tennisTournamentsLoading;
      hasError = !!tennisTournamentsError;
      linkFn = getTennisEventsLink;
    } else if (sportId === 'golf') {
      tournaments = golfTournaments;
      isLoading = golfTournamentsLoading;
      hasError = !!golfTournamentsError;
      linkFn = getGolfEventsLink;
    }

    return (
      <div key={sportId} className={styles.mobileDrawerSection}>
        <button className={styles.mobileDrawerItem} onClick={() => toggleDrawerSection(sportId)}>
          <span>{displayName}</span>
          {activeSubmenu === sportId ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </button>
        {activeSubmenu === sportId && (
          <div className={styles.mobileDrawerSubItems}>
            {isLoading && (
              <div className={styles.mobileDrawerSubItem} style={{ color: '#a0aab4', fontStyle: 'italic' }}>Loading...</div>
            )}
            {hasError && (
              <div className={styles.mobileDrawerSubItem} style={{ color: '#ff6b6b', fontStyle: 'italic' }}>Error loading</div>
            )}
            {!isLoading && !hasError && tournaments.map((t) => (
              <Link
                key={t.tournament_id}
                to={linkFn(t.tournament_id)}
                className={styles.mobileDrawerSubItem}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.official_name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Create navigation items for fixed sports
  const renderFixedSportItem = (sportId: string) => {
    const sport = sports.find(s => s.sport_id === sportId);
    const displayName = getDisplayName(sportId);

    // Special handling for soccer (football) with tournaments submenu
    if (sportId === 'soccer') {
      return (
        <div 
          className={styles.navItemWithSubmenu} 
          key={sportId}
          onMouseEnter={() => {
            if (!isMobile) {
              // Football menu hover - tournaments already loaded
            }
          }}
          onMouseLeave={() => {
            if (!isMobile) {
              // Optional: Clear tournaments cache when leaving menu
              // clearTournaments();
            }
          }}
        >
          <Link 
            to={getEventLinkBySport(sportId)} 
            className={styles.navItem} 
            data-sport-id={sportId}
            onClick={(e) => handleMenuClick(e, 'soccer', true)}
          >
            {displayName}
            {isMobile && <MdArrowDropDown style={{ marginLeft: '4px', fontSize: '16px' }} />}
          </Link>
          <div className={`${styles.submenu} ${isMobile && activeSubmenu === 'soccer' ? styles.submenuActive : ''}`}>
            {tournamentsLoading && (
              <>
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`tournament-skeleton-${index}`} className={styles.submenuItemSkeleton}>
                    <div className={styles.skeletonTournamentName}></div>
                    <div className={styles.skeletonArrow}></div>
                  </div>
                ))}
              </>
            )}
            {tournamentsError && (
              <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#ff6b6b' }}>
                Error loading tournaments
              </div>
            )}
            {!tournamentsLoading && !tournamentsError && footballTournaments.length === 0 && (
              <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#666' }}>
                No tournaments available
              </div>
            )}
            {!tournamentsLoading && !tournamentsError && footballTournaments.map((tournament) => {
              return (
                <Link 
                  key={tournament.tournament_id}
                  to={getTeamsPageLink(tournament.tournament_id)}
                  className={styles.submenuItem}
                  onClick={handleSubmenuItemClick}
                >
                  {tournament.official_name}
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    // Special handling for tennis with tournaments submenu
    if (sportId === 'tennis') {
      return (
        <div
          className={styles.navItemWithSubmenu}
          key={sportId}
        >
          <Link
            to={getEventLinkBySport(sportId)}
            className={styles.navItem}
            data-sport-id={sportId}
            onClick={(e) => handleMenuClick(e, 'tennis', true)}
          >
            {displayName}
            {isMobile && <MdArrowDropDown style={{ marginLeft: '4px', fontSize: '16px' }} />}
          </Link>
          <div className={`${styles.submenu} ${isMobile && activeSubmenu === 'tennis' ? styles.submenuActive : ''}`}>
            {tennisTournamentsLoading && (
              <>
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`tennis-skeleton-${index}`} className={styles.submenuItemSkeleton}>
                    <div className={styles.skeletonTournamentName}></div>
                    <div className={styles.skeletonArrow}></div>
                  </div>
                ))}
              </>
            )}
            {tennisTournamentsError && (
              <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#ff6b6b' }}>
                Error loading tournaments
              </div>
            )}
            {!tennisTournamentsLoading && !tennisTournamentsError && tennisTournaments.length === 0 && (
              <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#666' }}>
                No tournaments available
              </div>
            )}
            {!tennisTournamentsLoading && !tennisTournamentsError && tennisTournaments.map((tournament) => (
              <Link
                key={tournament.tournament_id}
                to={getTennisEventsLink(tournament.tournament_id)}
                className={styles.submenuItem}
                onClick={handleSubmenuItemClick}
              >
                {tournament.official_name}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    // Special handling for golf with tournaments submenu
    if (sportId === 'golf') {
      return (
        <div
          className={styles.navItemWithSubmenu}
          key={sportId}
        >
          <Link
            to={getEventLinkBySport(sportId)}
            className={styles.navItem}
            data-sport-id={sportId}
            onClick={(e) => handleMenuClick(e, 'golf', true)}
          >
            {displayName}
            {isMobile && <MdArrowDropDown style={{ marginLeft: '4px', fontSize: '16px' }} />}
          </Link>
          <div className={`${styles.submenu} ${isMobile && activeSubmenu === 'golf' ? styles.submenuActive : ''}`}>
            {golfTournamentsLoading && (
              <>
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`golf-skeleton-${index}`} className={styles.submenuItemSkeleton}>
                    <div className={styles.skeletonTournamentName}></div>
                    <div className={styles.skeletonArrow}></div>
                  </div>
                ))}
              </>
            )}
            {golfTournamentsError && (
              <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#ff6b6b' }}>
                Error loading tournaments
              </div>
            )}
            {!golfTournamentsLoading && !golfTournamentsError && golfTournaments.length === 0 && (
              <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#666' }}>
                No tournaments available
              </div>
            )}
            {!golfTournamentsLoading && !golfTournamentsError && golfTournaments.map((tournament) => (
              <Link
                key={tournament.tournament_id}
                to={getGolfEventsLink(tournament.tournament_id)}
                className={styles.submenuItem}
                onClick={handleSubmenuItemClick}
              >
                {tournament.official_name}
              </Link>
            ))}
          </div>
        </div>
      );
    }
    
    // Regular sport items without submenu - now with proper links
    return (
      <Link 
        to={getEventLinkBySport(sportId)}
        className={styles.navItem}
        key={sportId}
        data-sport-id={sportId}
        style={{ opacity: sport ? 1 : 0.7 }} // Dim if sport not available
      >
        {displayName}
      </Link>
    );
  };

  return (
    <header className={styles.stickyHeader}>
      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <div className={styles.wrapper}>
          {/* Left: Currency (always) + My Account (desktop only) */}
          <div className={styles.topBarLeft}>
            <div className={styles.topBarItemWithSubmenu}>
              <div
                className={styles.topBarItem}
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                style={{ cursor: 'pointer' }}
              >
                <span className={styles.currencySymbol}>
                  {currenciesLoading ? '...' : (selectedCurrency?.symbol || '$')}
                </span>
                <span>{selectedCurrency?.code || 'USD'}</span>
                <MdArrowDropDown className={styles.icon} />
              </div>
              <div className={`${styles.currencySubmenu} ${currencyDropdownOpen ? styles.currencySubmenuActive : ''}`}>
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    className={`${styles.currencySubmenuItem} ${selectedCurrency?.code === currency.code ? styles.currencySelected : ''}`}
                    onClick={() => {
                      setSelectedCurrency(currency);
                      setCurrencyDropdownOpen(false);
                    }}
                  >
                    <span className={styles.currencyItemSymbol}>{currency.symbol}</span>
                    <span className={styles.currencyItemCode}>{currency.code}</span>
                    <span className={styles.currencyItemName}>{currency.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* My Account — desktop only */}
            <div className={`${styles.topBarItemWithSubmenu} ${styles.desktopOnly}`}>
              <div
                className={styles.topBarItem}
                onClick={toggleAccountDropdown}
                style={{ cursor: 'pointer' }}
              >
                <FaUser className={styles.icon} />
                <span>MY ACCOUNT</span>
                <MdArrowDropDown className={styles.icon} />
              </div>
              <div
                className={`${styles.accountSubmenu} ${styles.accountSubmenuLeft} ${isMobile && accountDropdownOpen ? styles.accountSubmenuActive : ''}`}
              >
                {!isAuthenticated ? (
                  <Link
                    to="/login"
                    className={styles.accountSubmenuItem}
                    onClick={handleAccountItemClick}
                  >
                    LOGIN
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/profile"
                      className={styles.accountSubmenuItem}
                      onClick={handleAccountItemClick}
                    >
                      PROFILE
                    </Link>
                    <Link
                      to="/bookings"
                      className={styles.accountSubmenuItem}
                      onClick={handleAccountItemClick}
                    >
                      BOOKINGS
                    </Link>
                    <button
                      onClick={() => {
                        handleAccountItemClick();
                        logout();
                      }}
                      className={styles.accountSubmenuItem}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      LOGOUT
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Centre: Logo */}
          <Link to="/" className={styles.logo}>
            {!logoError ? (
              <img
                src={header_logo_url || '/logo.png'}
                alt="RONDO Sports Tickets"
                className={styles.logoImg}
                onLoad={() => { setLogoLoaded(true); }}
                onError={() => { setLogoError(true); }}
                style={{ display: logoLoaded ? 'block' : 'block', visibility: 'visible', opacity: 1 }}
              />
            ) : (
              <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px' }}>
                RONDO
              </div>
            )}
          </Link>

          {/* Right: About Us (desktop) + Hamburger (mobile) */}
          <div className={styles.topBarRight}>
            <Link
              to="/about-us"
              className={`${styles.topBarItem} ${styles.desktopOnly}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span>ABOUT US</span>
            </Link>
            <button
              className={`${styles.hamburgerBtn} ${styles.mobileOnly}`}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <FaBars />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop navigation bar (hidden on mobile) ── */}
      <nav className={`${styles.navigation} ${styles.desktopNav}`} ref={navigationRef}>
        <div className={styles.wrapper}>
          <div className={styles.navItems}>
            {renderFixedSportItem('soccer')}
            {renderFixedSportItem('formula1')}
            {renderFixedSportItem('rugby')}
            {renderFixedSportItem('tennis')}
            {renderFixedSportItem('golf')}

            {/* OTHER SPORTS dropdown */}
            <div className={styles.navItemWithSubmenu}>
              <span
                className={styles.navItem}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  if (isMobile) {
                    if (activeSubmenu !== 'other-sports') {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveSubmenu('other-sports');
                    } else {
                      setActiveSubmenu(null);
                    }
                  }
                }}
              >
                OTHER SPORTS <MdArrowDropDown />
              </span>
              <div className={`${styles.submenu} ${isMobile && activeSubmenu === 'other-sports' ? styles.submenuActive : ''}`}>
                {loading && (
                  <>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`other-sports-skeleton-${index}`} className={styles.submenuItemSkeleton}>
                        <div className={styles.skeletonSportName}></div>
                      </div>
                    ))}
                  </>
                )}
                {error && (
                  <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#ff6b6b' }}>
                    Error loading sports
                  </div>
                )}
                {!loading && !error && visibleOtherSports.length === 0 && (
                  <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#666' }}>
                    No other sports available
                  </div>
                )}
                {!loading && !error && [...visibleOtherSports]
                  .sort((a, b) => getDisplayName(a.sport_id).localeCompare(getDisplayName(b.sport_id)))
                  .map((sport) => (
                    <Link
                      to={getEventLinkBySport(sport.sport_id)}
                      className={styles.submenuItem}
                      key={sport.sport_id}
                      data-sport-id={sport.sport_id}
                      onClick={handleSubmenuItemClick}
                    >
                      {getDisplayName(sport.sport_id)}
                    </Link>
                  ))}
              </div>
            </div>

            <a href="/contact-us" className={styles.navItemHighlighted}>
              <img src="/images/icons/star.png" alt="Star" className={styles.starIcon} />
              <span>CONTACT US</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ── Mobile overlay ── */}
      <div
        className={`${styles.mobileOverlay} ${mobileMenuOpen ? styles.mobileOverlayVisible : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* ── Mobile drawer ── */}
      <div className={`${styles.mobileDrawer} ${mobileMenuOpen ? styles.mobileDrawerOpen : ''}`}>
        {/* Drawer header */}
        <div className={styles.mobileDrawerHeader}>
          <span className={styles.mobileDrawerTitle}>MENU</span>
          <button
            className={styles.mobileDrawerClose}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>

        {/* Drawer body */}
        <div className={styles.mobileDrawerContent}>
          {/* MY ACCOUNT */}
          <div className={styles.mobileDrawerSection}>
            <button className={styles.mobileDrawerItem} onClick={() => toggleDrawerSection('account')}>
              <div className={styles.mobileDrawerItemLeft}>
                <FaUser style={{ fontSize: '14px' }} />
                <span>MY ACCOUNT</span>
              </div>
              {activeSubmenu === 'account' ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </button>
            {activeSubmenu === 'account' && (
              <div className={styles.mobileDrawerSubItems}>
                {!isAuthenticated ? (
                  <Link to="/login" className={styles.mobileDrawerSubItem} onClick={() => setMobileMenuOpen(false)}>
                    LOGIN
                  </Link>
                ) : (
                  <>
                    <Link to="/profile" className={styles.mobileDrawerSubItem} onClick={() => setMobileMenuOpen(false)}>
                      PROFILE
                    </Link>
                    <Link to="/bookings" className={styles.mobileDrawerSubItem} onClick={() => setMobileMenuOpen(false)}>
                      BOOKINGS
                    </Link>
                    <button
                      className={`${styles.mobileDrawerSubItem} ${styles.mobileDrawerSubItemBtn}`}
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                    >
                      LOGOUT
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className={styles.mobileDrawerDivider} />

          {/* Sports navigation */}
          {renderMobileDrawerSportItem('soccer')}
          {renderMobileDrawerSportItem('formula1')}
          {renderMobileDrawerSportItem('rugby')}
          {renderMobileDrawerSportItem('tennis')}
          {renderMobileDrawerSportItem('golf')}

          {/* OTHER SPORTS */}
          <div className={styles.mobileDrawerSection}>
            <button className={styles.mobileDrawerItem} onClick={() => toggleDrawerSection('other-sports')}>
              <span>OTHER SPORTS</span>
              {activeSubmenu === 'other-sports' ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </button>
            {activeSubmenu === 'other-sports' && (
              <div className={styles.mobileDrawerSubItems}>
                {loading && (
                  <div className={styles.mobileDrawerSubItem} style={{ color: '#a0aab4', fontStyle: 'italic' }}>
                    Loading...
                  </div>
                )}
                {!loading && !error && [...visibleOtherSports]
                  .sort((a, b) => getDisplayName(a.sport_id).localeCompare(getDisplayName(b.sport_id)))
                  .map((sport) => (
                    <Link
                      key={sport.sport_id}
                      to={getEventLinkBySport(sport.sport_id)}
                      className={styles.mobileDrawerSubItem}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {getDisplayName(sport.sport_id)}
                    </Link>
                  ))}
              </div>
            )}
          </div>

          <div className={styles.mobileDrawerDivider} />

          <Link to="/about-us" className={styles.mobileDrawerItem} onClick={() => setMobileMenuOpen(false)}>
            <span>ABOUT US</span>
          </Link>
          <a href="/contact-us" className={styles.mobileDrawerItem} onClick={() => setMobileMenuOpen(false)}>
            <span>CONTACT US</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
