import React from 'react';
import Hero from './Hero';
import UpcomingEvents from './UpcomingEvents';
import WhyRondoSports from './WhyRondoSports';
import FeaturedEvents from './FeaturedEvents';
import { useSEO } from '../../hooks/useSEO';

const HomePage: React.FC = () => {
  useSEO('home');
  return (
    <>
      <div style={{ position: 'relative' }}>
        <Hero />
      </div>
      <UpcomingEvents />
      <WhyRondoSports />
      <FeaturedEvents />
    </>
  );
};

export default HomePage;
