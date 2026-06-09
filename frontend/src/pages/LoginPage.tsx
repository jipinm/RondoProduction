import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/customerAuth';
import type { CustomerRegistrationData } from '../services/customerAuth';
import { LoginForm, ForgotPasswordForm } from '../components/auth/AuthForms';
import CountrySelect from '../components/CountrySelect';
import { ApiValidationError } from '../services/customerAuth';
import {
  validateUserDetails,
  type UserDetailsFormData,
  type ValidationError
} from '../utils/validation';
import { MdVerified } from 'react-icons/md';
import { bannersService } from '../services/bannersService';
import type { Banner } from '../types/banners';
import styles from './LoginPage.module.css';

interface SliderItem {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  linkTarget?: string | null;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, isAuthenticated, isLoading, login, register, forgotPassword } = useAuth();

  // Get redirect path from location state, default to home
  const redirectTo = location.state?.from?.pathname || '/';

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [authError, setAuthError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Account creation form state
  const [userDetails, setUserDetails] = useState<UserDetailsFormData>({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    country: '',
    phone: ''
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Slider state
  const [activeSlide, setActiveSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const [sliderItems, setSliderItems] = useState<SliderItem[]>([]);
  const [sliderLoading, setSliderLoading] = useState(true);

  // Fetch login page banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setSliderLoading(true);
        const banners: Banner[] = await bannersService.getLoginPageBanners();
        setSliderItems(
          banners.map((b) => ({
            id: b.id,
            title: b.title,
            imageUrl: b.image_url,
            linkUrl: b.link_url,
            linkTarget: b.link_target
          }))
        );
        setActiveSlide(0);
      } finally {
        setSliderLoading(false);
      }
    };
    fetchBanners();
  }, []);

  // Auto-scroll slider with pause on hover
  useEffect(() => {
    if (sliderItems.length <= 1) return;

    const slideshowElement = slideshowRef.current;
    let isPaused = false;

    const interval = window.setInterval(() => {
      if (!isPaused) {
        setActiveSlide((prev) => (prev + 1) % sliderItems.length);
      }
    }, 3000);

    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };

    if (slideshowElement) {
      slideshowElement.addEventListener('mouseenter', handleMouseEnter);
      slideshowElement.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      clearInterval(interval);
      if (slideshowElement) {
        slideshowElement.removeEventListener('mouseenter', handleMouseEnter);
        slideshowElement.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [sliderItems.length]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && customer) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, customer, navigate, redirectTo]);

  // Clear errors when switching modes
  useEffect(() => {
    setAuthError('');
    setSuccessMessage('');
    setValidationErrors([]);
  }, [authMode]);

  const handleUserDetailsChange = (field: keyof UserDetailsFormData, value: string) => {
    setUserDetails(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  const validateAccountCreation = () => {
    const errors: ValidationError[] = [];

    // Validate user details
    const userValidation = validateUserDetails(userDetails);
    if (!userValidation.isValid) {
      errors.push(...userValidation.errors);
    }

    // Validate passwords
    if (!password || password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }

    if (password !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      errors.push({ field: 'acceptTerms', message: 'You must accept the Terms and Conditions' });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleLogin = async (data: { email: string; password: string }) => {
    setIsSubmitting(true);
    setAuthError('');
    try {
      await login(data);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleRegister = async () => {
    if (!validateAccountCreation()) {
      return;
    }

    setIsSubmitting(true);
    setAuthError('');
    setSuccessMessage('');

    try {
      const registerData: CustomerRegistrationData = {
        email: userDetails.email,
        password: password,
        first_name: userDetails.firstName,
        last_name: userDetails.lastName,
        phone: userDetails.phone,
        street: userDetails.street,
        house_number: userDetails.houseNumber,
        city: userDetails.city,
        zipcode: userDetails.zipCode,
        country_code: userDetails.country
      };

      const response = await register(registerData);

      if (response.success) {
        // Store registered email for pre-filling login form
        sessionStorage.setItem('registeredEmail', userDetails.email);

        // Switch to login mode and show success message
        setAuthMode('login');
        setSuccessMessage('🎉 Account created successfully! A confirmation email has been sent to your inbox. Please sign in with your credentials.');

        // Clear all form data
        setUserDetails({
          firstName: '',
          lastName: '',
          email: '',
          street: '',
          houseNumber: '',
          zipCode: '',
          city: '',
          country: '',
          phone: ''
        });
        setPassword('');
        setConfirmPassword('');
        setAcceptTerms(false);
        setValidationErrors([]);

        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(response.message || 'Registration failed');
      }

    } catch (err: any) {
      console.error('Registration error:', err);

      // Handle ApiValidationError with field-specific details
      if (err instanceof ApiValidationError && err.fieldErrors) {
        const fieldValidationErrors: ValidationError[] = [];

        Object.entries(err.fieldErrors).forEach(([field, message]) => {
          fieldValidationErrors.push({ field, message });
        });

        setValidationErrors(fieldValidationErrors);
        setAuthError('');
      }
      // Handle specific validation errors by message content
      else if (err.message === 'Email is already registered') {
        setValidationErrors([{ field: 'email', message: 'This email is already registered. Please use a different email or try signing in.' }]);
        setAuthError('');
      }
      // Handle other validation-related errors
      else if (err.message && (err.message.includes('validation') || err.message.includes('invalid'))) {
        setAuthError(err.message);
      }
      // Handle general errors
      else {
        setAuthError(err.message || 'Account creation failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setIsSubmitting(true);
    setAuthError('');

    try {
      await forgotPassword(email);
      setSuccessMessage('Password reset instructions have been sent to your email.');
      setAuthMode('login');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send password reset email.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className={styles.loginPageWrapper}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.loginPageWrapper}>
      <div className={styles.loginContainer}>
        {/* Left side — Image Slider */}
        {(sliderLoading || sliderItems.length > 0) && (
          <div className={styles.sliderSection}>
            {sliderLoading ? (
              <div className={styles.sliderSkeleton} />
            ) : (
              <div className={styles.sliderContainer}>
                <div className={styles.sliderVisibleWindow}>
                  <div className={styles.slideshow} ref={slideshowRef}>
                    {sliderItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`${styles.slide} ${index === activeSlide ? styles.active : ''}`}
                        style={{ display: index === activeSlide ? 'block' : 'none' }}
                      >
                        {item.linkUrl ? (
                          <a
                            href={item.linkUrl}
                            target={item.linkTarget || '_self'}
                            rel="noopener noreferrer"
                            className={styles.slideContent}
                            style={{ textDecoration: 'none' }}
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className={styles.slideImage}
                            />
                            <div className={styles.slideTitle}>
                              {item.title.split(' ').map((word, i) => (
                                <div key={i} className={styles.titleText}>{word}</div>
                              ))}
                            </div>
                          </a>
                        ) : (
                          <div className={styles.slideContent}>
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className={styles.slideImage}
                            />
                            <div className={styles.slideTitle}>
                              {item.title.split(' ').map((word, i) => (
                                <div key={i} className={styles.titleText}>{word}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {sliderItems.length > 1 && (
                  <div className={styles.slideIndicators}>
                    {sliderItems.map((_, index) => (
                      <button
                        key={index}
                        className={`${styles.indicator} ${index === activeSlide ? styles.activeIndicator : ''}`}
                        onClick={() => setActiveSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right side — Form Panel */}
        <div className={styles.formSection}>
          <div className={styles.formWrapper}>
            <div className={styles.logoContainer}>
              <h1 className={styles.logo}>Rondo Sports</h1>
              <p className={styles.tagline}>Your Gateway to Live Sports</p>
            </div>

            <h2 className={styles.formTitle}>
              {authMode === 'login' && 'Sign In'}
              {authMode === 'register' && 'Create Account'}
              {authMode === 'forgot-password' && 'Reset Password'}
            </h2>

            {successMessage && (
              <div className={styles.successMessage}>
                <MdVerified className={styles.messageIcon} />
                {successMessage}
              </div>
            )}

            <div className={styles.authForm}>
              {authMode === 'login' && (
                <LoginForm
                  onSubmit={handleLogin}
                  onSwitchToRegister={() => setAuthMode('register')}
                  onForgotPassword={() => setAuthMode('forgot-password')}
                  isLoading={isSubmitting}
                  error={authError}
                />
              )}

              {authMode === 'register' && (
                <div className={styles.registerForm}>
                  <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="firstName">First name *</label>
                        <input
                          type="text"
                          id="firstName"
                          placeholder="Enter first name"
                          className={styles.formInput}
                          value={userDetails.firstName}
                          onChange={(e) => handleUserDetailsChange('firstName', e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'firstName') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'firstName')?.message}
                          </div>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="lastName">Last name *</label>
                        <input
                          type="text"
                          id="lastName"
                          placeholder="Enter last name"
                          className={styles.formInput}
                          value={userDetails.lastName}
                          onChange={(e) => handleUserDetailsChange('lastName', e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'lastName') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'lastName')?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        placeholder="Enter email address"
                        className={styles.formInput}
                        value={userDetails.email}
                        onChange={(e) => handleUserDetailsChange('email', e.target.value)}
                      />
                      {validationErrors.find(e => e.field === 'email') && (
                        <div className={styles.fieldError}>
                          {validationErrors.find(e => e.field === 'email')?.message}
                        </div>
                      )}
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="street">Street *</label>
                        <input
                          type="text"
                          id="street"
                          placeholder="Enter street address"
                          className={styles.formInput}
                          value={userDetails.street}
                          onChange={(e) => handleUserDetailsChange('street', e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'street') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'street')?.message}
                          </div>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="houseNumber">House number *</label>
                        <input
                          type="text"
                          id="houseNumber"
                          placeholder="House number"
                          className={styles.formInput}
                          value={userDetails.houseNumber}
                          onChange={(e) => handleUserDetailsChange('houseNumber', e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'houseNumber') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'houseNumber')?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zipCode">Zip code *</label>
                        <input
                          type="text"
                          id="zipCode"
                          placeholder="Zip code"
                          className={styles.formInput}
                          value={userDetails.zipCode}
                          onChange={(e) => handleUserDetailsChange('zipCode', e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'zipCode') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'zipCode')?.message}
                          </div>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="city">City *</label>
                        <input
                          type="text"
                          id="city"
                          placeholder="Enter city"
                          className={styles.formInput}
                          value={userDetails.city}
                          onChange={(e) => handleUserDetailsChange('city', e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'city') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'city')?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="country">Country *</label>
                        <CountrySelect
                          value={userDetails.country}
                          onChange={(countryCode: string, _countryName: string) => {
                            handleUserDetailsChange('country', countryCode);
                          }}
                          placeholder="Select a country..."
                          error={validationErrors.find(e => e.field === 'country')?.message}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="phone">Phone <span style={{ color: '#999' }}>(Optional)</span></label>
                        <input
                          type="tel"
                          id="phone"
                          placeholder="Phone number"
                          className={styles.formInput}
                          value={userDetails.phone}
                          onChange={(e) => handleUserDetailsChange('phone', e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'phone') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'phone')?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="password">Password *</label>
                        <input
                          type="password"
                          id="password"
                          placeholder="Create password (min 8 characters)"
                          className={styles.formInput}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'password') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'password')?.message}
                          </div>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword">Confirm Password *</label>
                        <input
                          type="password"
                          id="confirmPassword"
                          placeholder="Confirm password"
                          className={styles.formInput}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        {validationErrors.find(e => e.field === 'confirmPassword') && (
                          <div className={styles.fieldError}>
                            {validationErrors.find(e => e.field === 'confirmPassword')?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.termsSection}>
                      <div className={styles.checkboxGroup}>
                        <input
                          type="checkbox"
                          id="acceptTerms"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                          className={styles.checkbox}
                        />
                        <label htmlFor="acceptTerms" className={styles.checkboxLabel}>
                          I accept the <a href="/terms-conditions" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> *
                        </label>
                      </div>
                      {validationErrors.find(e => e.field === 'acceptTerms') && (
                        <div className={styles.fieldError}>
                          {validationErrors.find(e => e.field === 'acceptTerms')?.message}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>

                  <div className={styles.switchForm}>
                    <span>Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={styles.linkButton}
                      disabled={isSubmitting}
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'forgot-password' && (
                <ForgotPasswordForm
                  onSubmit={handleForgotPassword}
                  onBackToLogin={() => setAuthMode('login')}
                  isLoading={isSubmitting}
                  error={authError}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;