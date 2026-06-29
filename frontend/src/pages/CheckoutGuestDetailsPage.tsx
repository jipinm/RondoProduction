import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Lock, ChefHat, AlertCircle } from 'lucide-react';
import CheckoutLoader from '../components/CheckoutLoader';
import { useAuth } from '../services/customerAuth';
import type { CustomerProfile } from '../services/customerAuth';
import { useReservation } from '../hooks/useReservation';
import type { Guest } from '../services/apiRoutes';
import CountrySelect from '../components/CountrySelect';
import {
  validateGuestData,
  mapUserDetailsToLeadGuest,
  type GuestFormData,
  type ValidationError,
  type UserDetailsFormData
} from '../utils/validation';
import type { Ticket } from '../services/apiRoutes';
import styles from './CheckoutPage.module.css';

// Included hospitality info (read-only, no pricing)
interface IncludedHospitality {
  hospitality_id: number;
  name: string;
}

interface CartItem {
  ticket: Ticket;
  quantity: number;
  finalPriceUSD?: number;
  markupAmount?: number;
  includedHospitalities?: IncludedHospitality[];
  totalPricePerTicket?: number;
}

interface CheckoutState {
  cartItems: CartItem[];
  eventData: {
    event_name: string;
    tournament_name: string;
    season: string;
    date_start: string;
    venue_name: string;
    city: string;
  };
  guestRequirements?: import('../services/apiRoutes').EventGuestRequirements | null;
  userInfo?: any;
  markupsData?: Record<string, any>;
  selectedCurrencyCode?: string;
}

const CheckoutGuestDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState;
  
  const [guests, setGuests] = useState<GuestFormData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [, setFormTouched] = useState<Record<string, boolean>>({});
  const guestsContainerRef = useRef<HTMLDivElement>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [reservationStep, setReservationStep] = useState<string>('');

  const { customer, isAuthenticated, getProfile } = useAuth();
  const { createReservation, addGuestData, loading: reservationLoading, error: reservationError } = useReservation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !customer) {
      navigate('/checkout/login', { 
        state: state ? { cartItems: state.cartItems, eventData: state.eventData, guestRequirements: state.guestRequirements } : null 
      });
      return;
    }
  }, [isAuthenticated, customer, navigate, state]);

  // Redirect if no cart items
  useEffect(() => {
    if (!state || !state.cartItems || state.cartItems.length === 0) {
      navigate('/', { replace: true });
      return;
    }
  }, [state, navigate]);

  // Load customer profile
  useEffect(() => {
    const loadProfile = async () => {
      if (isAuthenticated && customer) {
        try {
          setProfileLoading(true);
          const profile = await getProfile();
          setCustomerProfile(profile);
        } catch (error) {
          console.error('Failed to load customer profile:', error);
        } finally {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();
  }, [isAuthenticated, customer, getProfile]);

  // Initialize guests when component mounts and profile is loaded
  useEffect(() => {
    if (state?.cartItems && customer && customerProfile && !profileLoading) {
      const totalTickets = state.cartItems.reduce((sum, item) => sum + item.quantity, 0);
      initializeGuests(totalTickets);
    }
  }, [state?.cartItems, customer, customerProfile, profileLoading]);

  // Redirect guard — navigation happens via useEffect, render nothing in the interim
  if (!state || !state.cartItems) {
    return null;
  }

  const { cartItems, eventData } = state;

  // Initialize guests array with default values and pre-fill lead guest
  const initializeGuests = (totalTickets: number) => {
    const newGuests: GuestFormData[] = [];
    
    // Get stored user details from account creation or use customer profile data
    const storedUserDetails = sessionStorage.getItem('userDetails');
    let userDetails: UserDetailsFormData | null = null;
    
    if (storedUserDetails) {
      userDetails = JSON.parse(storedUserDetails);
    } else if (customerProfile) {
      // Map customer profile data to user details format
      userDetails = {
        firstName: customerProfile.first_name || '',
        lastName: customerProfile.last_name || '',
        email: customerProfile.email || '',
        street: customerProfile.street || '',
        houseNumber: customerProfile.house_number || '',
        zipCode: customerProfile.zipcode || '',
        city: customerProfile.city || '',
        country: customerProfile.country_code || '',
        phone: customerProfile.phone || ''
      };
    }
    
    for (let i = 0; i < totalTickets; i++) {
      if (i === 0 && userDetails) {
        // Pre-fill lead guest with user details
        const leadGuest = mapUserDetailsToLeadGuest(userDetails, {
          contact_email: customer?.email ?? ''
        });
        newGuests.push(leadGuest);
      } else {
        // Empty guests for additional tickets
        newGuests.push({
          first_name: '',
          last_name: '',
          contact_email: '',
          date_of_birth: '',
          country_of_residence: '',
          gender: undefined,
          passport_number: '',
          street_name: '',
          city: '',
          zip: '',
          contact_phone: ''
        });
      }
    }
    
    setGuests(newGuests);
    
    // Clear stored user details after use
    sessionStorage.removeItem('userDetails');
  };

  // Calculate totals (including hospitalities)
  const checkoutCurrency = state?.selectedCurrencyCode || 'USD';
  const subtotal = cartItems.reduce((total, item) => {
    // Use totalPricePerTicket if available (includes ticket + hospitalities)
    const itemPrice = item.totalPricePerTicket || item.finalPriceUSD || item.ticket.face_value;
    return total + (itemPrice * item.quantity);
  }, 0);

  const orderTotal = subtotal;

  const formatPrice = (amount: number) => {
    return `${checkoutCurrency} ${amount.toFixed(2)}`;
  };

  // Build the set of pre_checkout required fields for a given guest index.
  // Always-required base fields are added unconditionally; event-specific
  // fields (like date_of_birth, passport_number) are included only when the
  // event's guestRequirements say they must be provided before checkout.
  const getRequiredFieldsForGuest = (guestIndex: number): Set<string> => {
    const required = new Set<string>(['first_name', 'last_name', 'country_of_residence']);
    if (guestIndex === 0) required.add('contact_email');

    const reqs = state.guestRequirements?.requirements;
    if (reqs) {
      for (const req of reqs) {
        if (req.required && req.condition === 'pre_checkout') {
          if (req.scope === 'all_persons' || (guestIndex === 0 && req.scope === 'lead_guest')) {
            required.add(req.field);
          }
        }
      }
    }
    return required;
  };

  const hasFieldError = (guestIndex: number, field: string): boolean =>
    validationErrors.some(e => e.field === `guest_${guestIndex}_${field}`);

  const getFieldError = (guestIndex: number, field: string): string | undefined =>
    validationErrors.find(e => e.field === `guest_${guestIndex}_${field}`)?.message;

  // Form handlers
  const handleGuestChange = (guestIndex: number, field: keyof GuestFormData, value: string) => {
    setGuests(prev => prev.map((guest, index) =>
      index === guestIndex ? { ...guest, [field]: value } : guest
    ));
    setFormTouched(prev => ({ ...prev, [`guest_${guestIndex}_${field}`]: true }));
    // Clear error for this field as user types
    setValidationErrors(prev => prev.filter(e => e.field !== `guest_${guestIndex}_${field}`));
  };

  const validateCurrentStep = () => {
    const allErrors: ValidationError[] = [];

    guests.forEach((guest, index) => {
      const isLeadGuest = index === 0;
      const requiredFields = getRequiredFieldsForGuest(index);
      const validation = validateGuestData(guest, isLeadGuest, requiredFields);

      validation.errors.forEach(error => {
        allErrors.push({
          field: `guest_${index}_${error.field}`,
          message: error.message
        });
      });
    });

    setValidationErrors(allErrors);

    if (allErrors.length > 0) {
      setTimeout(() => {
        const firstErrorEl = guestsContainerRef.current?.querySelector('[data-has-error="true"]');
        firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    }

    return allErrors.length === 0;
  };

  const handleContinueToPayment = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (!state?.cartItems || !customer) {
      console.error('Missing required data for reservation creation');
      return;
    }

    try {
      // Get lead guest information
      const leadGuest = guests[0];
      if (!leadGuest) {
        console.error('No lead guest found');
        return;
      }

      setReservationStep('Creating your reservation...');

      // Create reservation with XS2Event API format (simplified - guest data comes later)
      // IMPORTANT: net_rate must be an integer in cents (multiply by 100), currency_code must match ticket data
      const reservationData = {
        items: state.cartItems.map(item => ({
          ticket_id: item.ticket.ticket_id,
          quantity: item.quantity,
          net_rate: Math.round(item.ticket.net_rate * 100), // Convert to integer cents
          currency_code: item.ticket.currency_code
        }))
      };

      const reservation = await createReservation(reservationData);

      if (!reservation) {
        console.error('Failed to create reservation');
        setReservationStep('');
        return;
      }

      setReservationStep('Saving guest information...');


      // Convert guests to Guest interface format
      const guestData: Guest[] = guests.map((guest, index) => ({
        first_name: guest.first_name,
        last_name: guest.last_name,
        contact_email: guest.contact_email,
        contact_phone: guest.contact_phone,
        date_of_birth: guest.date_of_birth,
        gender: guest.gender,
        country_of_residence: guest.country_of_residence,
        passport_number: guest.passport_number,
        lead_guest: index === 0
      }));

      // Add guest data to the reservation
      const guestDataSuccess = await addGuestData(
        reservation.reservation_id,
        guestData,
        cartItems.map(item => ({ ticket_id: item.ticket.ticket_id, quantity: item.quantity }))
      );
      
      if (!guestDataSuccess) {
        console.error('Failed to add guest data to reservation');
        setReservationStep('');
        return;
      }

      setReservationStep('Preparing payment...');


      // Save state to session storage for recovery
      const stateToSave = {
        ...state,
        guests: guests,
        reservation: reservation,
        userInfo: customer
      };
      sessionStorage.setItem('checkoutState', JSON.stringify(stateToSave));

      // Navigate to payment page with reservation included

      navigate('/checkout/payment', {
        state: stateToSave
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      setReservationStep('');
    }
  };

  // Render order summary
  const renderOrderSummary = () => (
    <div className={styles.orderSummary}>
      <h3>Order overview</h3>
      <div className={styles.eventInfo}>
        <h4>{eventData.event_name}</h4>
        <div className={styles.eventDetails}>
          <p>📅 {new Date(eventData.date_start).toLocaleDateString()}</p>
          <p>📍 {eventData.venue_name}, {eventData.city}</p>
        </div>
      </div>

      <div className={styles.ticketSummary}>
        {cartItems.map((item, index) => {
          const itemPrice = item.totalPricePerTicket || item.finalPriceUSD || item.ticket.face_value;
          return (
            <div key={index} className={styles.ticketItem}>
              <div className={styles.ticketDetails}>
                <span className={styles.ticketName}>{item.ticket.ticket_title}</span>
                <span className={styles.ticketQuantity}>Qty: {item.quantity}</span>
                {/* Display included hospitalities (informational, no prices) */}
                {item.includedHospitalities && item.includedHospitalities.length > 0 && (
                  <div className={styles.hospitalityList}>
                    {item.includedHospitalities.map(h => (
                      <div key={h.hospitality_id} className={styles.hospitalityItem}>
                        <ChefHat size={12} />
                        <span>{h.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className={styles.ticketPrice}>
                {formatPrice(itemPrice * item.quantity)}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.orderTotals}>
        <div className={styles.totalRow}>
          <span>Order total</span>
          <span>{formatPrice(orderTotal)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.checkoutPage}>
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Left column - Form content */}
          <div className={styles.leftColumn}>
            {/* Step indicator — always visible so the user knows where they are */}
            <div className={styles.stepIndicator}>
              <div className={`${styles.stepItem} ${styles.completed}`}>
                <div className={styles.stepIcon}><User size={16} /></div>
                <span className={styles.stepLabel}>Sign In</span>
              </div>
              <div className={`${styles.stepItem} ${styles.active}`}>
                <div className={styles.stepIcon}><Mail size={16} /></div>
                <span className={styles.stepLabel}>Guest Info</span>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepIcon}><Lock size={16} /></div>
                <span className={styles.stepLabel}>Payment</span>
              </div>
            </div>

            {/* Profile loading — show loader in left column; order summary stays visible */}
            {(!isAuthenticated || !customer || profileLoading) ? (
              <CheckoutLoader
                message="Loading your booking details..."
                subMessage="Retrieving your profile information"
                showProgress
              />
            ) : (

            <div className={styles.stepContent}>
              <h2>Guest Information</h2>
              <p>Enter the details for all guests attending the event.</p>

              <div className={styles.welcomeMessage}>
                <p>Welcome back, <strong>{customer.first_name || customer.email}</strong>!</p>
                <p>Lead guest information has been pre-filled with your account details.</p>
              </div>

              {/* Upfront notice for event-specific required fields */}
              {(() => {
                const specialRequired = (state.guestRequirements?.requirements ?? []).filter(
                  r => r.required && r.condition === 'pre_checkout' && ['date_of_birth', 'passport_number'].includes(r.field)
                );
                if (specialRequired.length === 0) return null;
                const fieldLabels: Record<string, string> = {
                  date_of_birth: 'date of birth',
                  passport_number: 'passport number',
                };
                const scopeLabels: Record<string, string> = {
                  lead_guest: 'the lead guest',
                  all_persons: 'each guest',
                };
                return (
                  <div className={styles.requirementsNotice}>
                    <div className={styles.requirementsNoticeHeader}>
                      <AlertCircle size={16} />
                      <strong>Required for this booking</strong>
                    </div>
                    <ul className={styles.requirementsNoticeList}>
                      {specialRequired.map(req => (
                        <li key={req.field}>
                          A <strong>{fieldLabels[req.field] || req.field}</strong> is required for{' '}
                          {scopeLabels[req.scope || 'all_persons']} to complete this booking.
                          Please have it ready before continuing.
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              <div className={styles.guestsContainer} ref={guestsContainerRef}>
                {guests.map((guest, index) => {
                  const requiredFields = getRequiredFieldsForGuest(index);
                  const dobRequired = requiredFields.has('date_of_birth');
                  const passportRequired = requiredFields.has('passport_number');

                  return (
                    <div key={index} className={styles.guestSection}>
                      <h4>Guest {index + 1} {index === 0 && '(Lead Guest)'}</h4>

                      <div className={styles.formRow}>
                        <div
                          className={styles.formGroup}
                          data-has-error={hasFieldError(index, 'first_name') ? 'true' : undefined}
                        >
                          <label
                            htmlFor={`guest${index}FirstName`}
                            className={hasFieldError(index, 'first_name') ? styles.labelError : undefined}
                          >
                            First name <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            id={`guest${index}FirstName`}
                            name={`guest_${index}_fname`}
                            autoComplete="off"
                            className={`${styles.formInput}${hasFieldError(index, 'first_name') ? ` ${styles.error}` : ''}`}
                            value={guest.first_name}
                            onChange={(e) => handleGuestChange(index, 'first_name', e.target.value)}
                            placeholder="Enter first name"
                          />
                          {hasFieldError(index, 'first_name') && (
                            <div className={styles.fieldError}>
                              {getFieldError(index, 'first_name')}
                            </div>
                          )}
                        </div>
                        <div
                          className={styles.formGroup}
                          data-has-error={hasFieldError(index, 'last_name') ? 'true' : undefined}
                        >
                          <label
                            htmlFor={`guest${index}LastName`}
                            className={hasFieldError(index, 'last_name') ? styles.labelError : undefined}
                          >
                            Last name <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            id={`guest${index}LastName`}
                            name={`guest_${index}_lname`}
                            autoComplete="off"
                            className={`${styles.formInput}${hasFieldError(index, 'last_name') ? ` ${styles.error}` : ''}`}
                            value={guest.last_name}
                            onChange={(e) => handleGuestChange(index, 'last_name', e.target.value)}
                            placeholder="Enter last name"
                          />
                          {hasFieldError(index, 'last_name') && (
                            <div className={styles.fieldError}>
                              {getFieldError(index, 'last_name')}
                            </div>
                          )}
                        </div>
                      </div>

                      {index === 0 && (
                        <div
                          className={styles.formGroup}
                          data-has-error={hasFieldError(index, 'contact_email') ? 'true' : undefined}
                        >
                          <label
                            htmlFor={`guest${index}Email`}
                            className={hasFieldError(index, 'contact_email') ? styles.labelError : undefined}
                          >
                            Email address <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="email"
                            id={`guest${index}Email`}
                            name={`guest_${index}_cemail`}
                            autoComplete="off"
                            className={`${styles.formInput}${hasFieldError(index, 'contact_email') ? ` ${styles.error}` : ''}`}
                            value={guest.contact_email}
                            onChange={(e) => handleGuestChange(index, 'contact_email', e.target.value)}
                            placeholder="Enter email address"
                          />
                          {hasFieldError(index, 'contact_email') && (
                            <div className={styles.fieldError}>
                              {getFieldError(index, 'contact_email')}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor={`guest${index}Phone`}>Phone number</label>
                          <input
                            type="tel"
                            id={`guest${index}Phone`}
                            name={`guest_${index}_cphone`}
                            autoComplete="off"
                            className={styles.formInput}
                            value={guest.contact_phone || ''}
                            onChange={(e) => handleGuestChange(index, 'contact_phone', e.target.value)}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div
                          className={styles.formGroup}
                          data-has-error={hasFieldError(index, 'date_of_birth') ? 'true' : undefined}
                        >
                          <label
                            htmlFor={`guest${index}DateOfBirth`}
                            className={hasFieldError(index, 'date_of_birth') ? styles.labelError : undefined}
                          >
                            Date of birth{dobRequired && <> <span className={styles.required}>*</span></>}
                          </label>
                          {dobRequired && (
                            <p className={styles.fieldHint}>
                              A date of birth is required to complete this booking. Please enter it below.
                            </p>
                          )}
                          <input
                            type="date"
                            id={`guest${index}DateOfBirth`}
                            name={`guest_${index}_dob`}
                            autoComplete="off"
                            className={`${styles.formInput}${hasFieldError(index, 'date_of_birth') ? ` ${styles.error}` : ''}`}
                            value={guest.date_of_birth}
                            onChange={(e) => handleGuestChange(index, 'date_of_birth', e.target.value)}
                          />
                          {hasFieldError(index, 'date_of_birth') && (
                            <div className={styles.fieldError}>
                              {getFieldError(index, 'date_of_birth')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor={`guest${index}Gender`}>Gender</label>
                          <select
                            id={`guest${index}Gender`}
                            name={`guest_${index}_gender`}
                            autoComplete="off"
                            className={styles.formInput}
                            value={guest.gender || ''}
                            onChange={(e) => handleGuestChange(index, 'gender', e.target.value)}
                          >
                            <option value="">Select gender...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="unknown">Prefer not to say</option>
                          </select>
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <div
                          className={styles.formGroup}
                          data-has-error={hasFieldError(index, 'country_of_residence') ? 'true' : undefined}
                        >
                          <label
                            htmlFor={`guest${index}CountryOfResidence`}
                            className={hasFieldError(index, 'country_of_residence') ? styles.labelError : undefined}
                          >
                            Country of residence <span className={styles.required}>*</span>
                          </label>
                          <CountrySelect
                            value={guest.country_of_residence}
                            onChange={(value) => handleGuestChange(index, 'country_of_residence', value)}
                            placeholder="Select country..."
                            error={getFieldError(index, 'country_of_residence')}
                          />
                          {hasFieldError(index, 'country_of_residence') && (
                            <div className={styles.fieldError}>
                              {getFieldError(index, 'country_of_residence')}
                            </div>
                          )}
                        </div>
                        <div
                          className={styles.formGroup}
                          data-has-error={hasFieldError(index, 'passport_number') ? 'true' : undefined}
                        >
                          <label
                            htmlFor={`guest${index}PassportNumber`}
                            className={hasFieldError(index, 'passport_number') ? styles.labelError : undefined}
                          >
                            Passport number{passportRequired && <> <span className={styles.required}>*</span></>}
                          </label>
                          {passportRequired && (
                            <p className={styles.fieldHint}>
                              A passport number is required to complete this booking. Please enter it below.
                            </p>
                          )}
                          <input
                            type="text"
                            id={`guest${index}PassportNumber`}
                            name={`guest_${index}_passport`}
                            autoComplete="off"
                            className={`${styles.formInput}${hasFieldError(index, 'passport_number') ? ` ${styles.error}` : ''}`}
                            value={guest.passport_number || ''}
                            onChange={(e) => handleGuestChange(index, 'passport_number', e.target.value)}
                            placeholder="Enter passport number"
                          />
                          {hasFieldError(index, 'passport_number') && (
                            <div className={styles.fieldError}>
                              {getFieldError(index, 'passport_number')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {reservationError && (
                <div className={styles.errorMessage}>
                  Error creating reservation: {reservationError}
                </div>
              )}

              <div className={styles.stepActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => navigate('/checkout/login', { state })}
                  disabled={reservationLoading}
                >
                  Back to Sign In
                </button>
                <button
                  className={`${styles.primaryButton} ${reservationLoading ? styles.primaryButtonLoading : ''}`}
                  onClick={handleContinueToPayment}
                  disabled={reservationLoading}
                >
                  {reservationLoading ? (
                    <>
                      <span className={styles.buttonSpinner}></span>
                      <span>{reservationStep || 'Processing...'}</span>
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </button>
              </div>
            </div>

            )} {/* end profile-loaded conditional */}
          </div>

          {/* Right column - Order summary */}
          <div className={styles.rightColumn}>
            {renderOrderSummary()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutGuestDetailsPage;