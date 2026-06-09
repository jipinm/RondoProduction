import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdVerified, MdLock } from 'react-icons/md';
import { customerAuthService } from '../services/customerAuth';
import type { ResetPasswordData } from '../services/customerAuth';
import styles from './LoginPage.module.css';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Extract token and email from URL on mount
  useEffect(() => {
    const urlToken = searchParams.get('token');
    const urlEmail = searchParams.get('email');

    if (!urlToken || !urlEmail) {
      setTokenError(true);
      setError('Invalid or missing reset link. Please request a new password reset.');
    } else {
      setToken(urlToken);
      setEmail(urlEmail);
    }
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) {
      return 'Password is required';
    }
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      errors.password = passwordError;
    }

    // Validate confirm password
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setFieldErrors({});

    try {
      const resetData: ResetPasswordData = {
        token,
        email,
        password,
        confirm_password: confirmPassword
      };

      const response = await customerAuthService.resetPassword(resetData);

      if (response.success) {
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      // Handle specific error messages
      if (err.message.includes('token') || err.message.includes('expired') || err.message.includes('invalid')) {
        setTokenError(true);
        setError(err.message || 'Invalid or expired reset link. Please request a new password reset.');
      } else {
        setError(err.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors({ ...fieldErrors, password: '' });
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors({ ...fieldErrors, confirmPassword: '' });
    }
  };

  // Success screen
  if (success) {
    return (
      <div className={styles.loginPageWrapper}>
        <div className={styles.loginContainer}>
          <div className={styles.formSection} style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className={styles.formWrapper}>
              <div className={styles.logoContainer}>
                <h1 className={styles.logo}>Rondo Sports</h1>
                <p className={styles.tagline}>Your Gateway to Live Sports</p>
              </div>

              <div className={styles.successScreen}>
                <div className={styles.successIconWrapper}>
                  <MdVerified className={styles.successIcon} />
                </div>
                
                <h3 className={styles.successTitle}>Password Reset Successful!</h3>
                
                <p className={styles.successDescription}>
                  Your password has been updated successfully. You can now sign in with your new password.
                </p>

                <div className={styles.successActions}>
                  <button
                    type="button"
                    className={styles.primaryActionButton}
                    onClick={() => navigate('/login')}
                  >
                    Login Now
                  </button>
                  
                  <button
                    type="button"
                    className={styles.secondaryActionButton}
                    onClick={() => navigate('/')}
                  >
                    Browse Events
                  </button>
                </div>

                <p className={styles.successFooter}>
                  For security, all your existing sessions have been logged out. Please sign in again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Token error screen
  if (tokenError) {
    return (
      <div className={styles.loginPageWrapper}>
        <div className={styles.loginContainer}>
          <div className={styles.formSection} style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className={styles.formWrapper}>
              <div className={styles.logoContainer}>
                <h1 className={styles.logo}>Rondo Sports</h1>
                <p className={styles.tagline}>Your Gateway to Live Sports</p>
              </div>

              <h2 className={styles.formTitle}>Reset Link Invalid</h2>

              <div className={styles.errorMessage} style={{ marginBottom: '2rem' }}>
                {error}
              </div>

              <div className={styles.successActions}>
                <button
                  type="button"
                  className={styles.primaryActionButton}
                  onClick={() => navigate('/login')}
                >
                  Request New Reset Link
                </button>
                
                <button
                  type="button"
                  className={styles.secondaryActionButton}
                  onClick={() => navigate('/')}
                >
                  Go to Homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className={styles.loginPageWrapper}>
      <div className={styles.loginContainer}>
        <div className={styles.formSection} style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className={styles.formWrapper}>
            <div className={styles.logoContainer}>
              <h1 className={styles.logo}>Rondo Sports</h1>
              <p className={styles.tagline}>Your Gateway to Live Sports</p>
            </div>

            <h2 className={styles.formTitle}>Reset Your Password</h2>

            <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>
              Enter your new password below
            </p>

            {error && (
              <div className={styles.errorMessage} style={{ marginBottom: '1.5rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.formLabel}>
                  <MdLock style={{ marginRight: '0.5rem' }} />
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  className={`${styles.formInput} ${fieldErrors.password ? styles.inputError : ''}`}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  disabled={isSubmitting}
                  autoFocus
                />
                {fieldErrors.password && (
                  <div className={styles.fieldError}>{fieldErrors.password}</div>
                )}
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                  Must be at least 8 characters with uppercase, lowercase, and numbers
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword" className={styles.formLabel}>
                  <MdLock style={{ marginRight: '0.5rem' }} />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className={`${styles.formInput} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Confirm new password"
                  disabled={isSubmitting}
                />
                {fieldErrors.confirmPassword && (
                  <div className={styles.fieldError}>{fieldErrors.confirmPassword}</div>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
                style={{ marginTop: '1.5rem' }}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner}></span>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={styles.linkButton}
                  disabled={isSubmitting}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
