import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './services/customerAuth';
import { CurrencyProvider } from './contexts/CurrencyContext';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/ScrollToTop';
import { useSiteBranding } from './hooks/useSiteBranding';
import './styles/global.css';

// Lazy-load every page so the initial bundle only ships the app shell (Layout,
// providers, router). Each page chunk downloads only when first navigated to,
// which is the primary fix for cold-cache mobile first-load latency.
const HomePage                 = React.lazy(() => import('./components/home/HomePage'));
const TournamentsPage          = React.lazy(() => import('./pages/TournamentsPage'));
const EventsPage               = React.lazy(() => import('./pages/EventsPage'));
const EventTicketsPage         = React.lazy(() => import('./pages/EventTicketsPage'));
const AllSportsPage            = React.lazy(() => import('./pages/AllSportsPage'));
const TeamsPage                = React.lazy(() => import('./pages/TeamsPage'));
const AboutUsPage              = React.lazy(() => import('./pages/AboutUsPage'));
const FAQPage                  = React.lazy(() => import('./pages/FAQPage'));
const ContactUsPage            = React.lazy(() => import('./pages/ContactUsPage'));
const PrivacyPolicyPage        = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsConditionsPage      = React.lazy(() => import('./pages/TermsConditionsPage'));
const BookingConfirmationPage  = React.lazy(() => import('./pages/BookingConfirmationPage'));
const CheckoutPage             = React.lazy(() => import('./pages/CheckoutPage'));
const CheckoutLoginPage        = React.lazy(() => import('./pages/CheckoutLoginPage'));
const CheckoutGuestDetailsPage = React.lazy(() => import('./pages/CheckoutGuestDetailsPage'));
const CheckoutReservationPage  = React.lazy(() => import('./pages/CheckoutReservationPage'));
const CheckoutPaymentPage      = React.lazy(() => import('./pages/CheckoutPaymentPage'));
const CheckoutConfirmationPage = React.lazy(() => import('./pages/CheckoutConfirmationPage'));
const PaymentSuccessPage       = React.lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentCancelPage        = React.lazy(() => import('./pages/PaymentCancelPage'));
const TestRegistrationPage     = React.lazy(() => import('./pages/TestRegistrationPage'));
const TestStripeCheckout       = React.lazy(() => import('./pages/TestStripeCheckout'));
const LoginPage                = React.lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage        = React.lazy(() => import('./pages/ResetPasswordPage'));
const ProfilePage              = React.lazy(() => import('./pages/ProfilePage'));
const ProfileEditPage          = React.lazy(() => import('./pages/ProfileEditPage'));
const ChangePasswordPage       = React.lazy(() => import('./pages/ChangePasswordPage'));
const BookingsPage             = React.lazy(() => import('./pages/BookingsPage'));
const BlogListingPage          = React.lazy(() => import('./pages/BlogListingPage'));
const BlogDetailPage           = React.lazy(() => import('./pages/BlogDetailPage'));

// Per-route Suspense wrapper. Placing Suspense here (inside the Layout route)
// keeps the Layout (header + footer) rendered while the page chunk loads —
// only the main content area shows the fallback blank space.
const Page: React.FC<{ component: React.ComponentType<any> }> = ({ component: C }) => (
  <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
    <C />
  </Suspense>
);

const FaviconUpdater: React.FC = () => {
  const { favicon_url } = useSiteBranding();
  useEffect(() => {
    if (!favicon_url) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = favicon_url;
  }, [favicon_url]);
  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CurrencyProvider>
      <Router>
        <FaviconUpdater />
        <ScrollToTop />
        <Routes>
          {/* All pages — wrapped in the global Layout via Outlet */}
          <Route element={<Layout />}>
            <Route path="/login"                               element={<Page component={LoginPage} />} />
            <Route path="/reset-password"                      element={<Page component={ResetPasswordPage} />} />
            <Route path="/"                                    element={<Page component={HomePage} />} />
            <Route path="/about-us"                            element={<Page component={AboutUsPage} />} />
            <Route path="/faq"                                 element={<Page component={FAQPage} />} />
            <Route path="/contact-us"                          element={<Page component={ContactUsPage} />} />
            <Route path="/privacy-policy"                      element={<Page component={PrivacyPolicyPage} />} />
            <Route path="/terms-conditions"                    element={<Page component={TermsConditionsPage} />} />
            <Route path="/sports"                              element={<Page component={AllSportsPage} />} />
            <Route path="/sports/:sport/tournaments"           element={<Page component={TournamentsPage} />} />
            <Route path="/tournaments/:tournamentId/events"    element={<Page component={EventsPage} />} />
            <Route path="/tournaments/:tournamentId/teams"     element={<Page component={TournamentsPage} />} />
            <Route path="/teams/:teamId/events"                element={<Page component={EventsPage} />} />
            <Route path="/teams"                               element={<Page component={TeamsPage} />} />
            <Route path="/events/:eventId/tickets"             element={<Page component={EventTicketsPage} />} />
            <Route path="/events"                              element={<Page component={EventsPage} />} />
            <Route path="/checkout"                            element={<Page component={CheckoutPage} />} />
            <Route path="/checkout/login"                      element={<Page component={CheckoutLoginPage} />} />
            <Route path="/checkout/guest-details"              element={<Page component={CheckoutGuestDetailsPage} />} />
            <Route path="/checkout/reservation"                element={<Page component={CheckoutReservationPage} />} />
            <Route path="/checkout/payment"                    element={<Page component={CheckoutPaymentPage} />} />
            <Route path="/checkout/confirmation"               element={<Page component={CheckoutConfirmationPage} />} />
            <Route path="/payment/success"                     element={<Page component={PaymentSuccessPage} />} />
            <Route path="/payment/cancel"                      element={<Page component={PaymentCancelPage} />} />
            <Route path="/test-registration"                   element={<Page component={TestRegistrationPage} />} />
            <Route path="/test-stripe"                         element={<Page component={TestStripeCheckout} />} />
            <Route path="/profile"                             element={<Page component={ProfilePage} />} />
            <Route path="/profile/edit"                        element={<Page component={ProfileEditPage} />} />
            <Route path="/profile/change-password"             element={<Page component={ChangePasswordPage} />} />
            <Route path="/bookings"                            element={<Page component={BookingsPage} />} />
            <Route path="/blog"                                element={<Page component={BlogListingPage} />} />
            <Route path="/blog/:slug"                          element={<Page component={BlogDetailPage} />} />
            <Route path="/booking/confirmation/:bookingId"     element={<Page component={BookingConfirmationPage} />} />
          </Route>
        </Routes>
      </Router>
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default App;
