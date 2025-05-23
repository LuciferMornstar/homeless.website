'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FaHome, FaPhone, FaMapMarkerAlt, FaBed, FaPaw,
  FaWheelchair, FaChild, FaChevronDown,
  FaChevronUp, FaInfoCircle, FaExternalLinkAlt,
  FaEnvelope, FaClock, FaCheck, FaSearch, FaDownload,
  FaExclamationTriangle, FaBalanceScale, FaRainbow // Use FaRainbow for LGBTQ+
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ModernFooter from '@/components/ModernFooter';

// Types
interface ShelterLocation {
  id: number;
  name: string;
  address: string;
  city: string;
  postcode: string;
  phone: string;
  website?: string;
  email?: string;
  availableBeds?: number;
  totalBeds?: number;
  openingHours: string;
  services: string[];
  restrictions?: string[];
  acceptsPets: boolean;
  accessibilityFeatures: string[];
  lgbtqFriendly: boolean;
  womenOnly: boolean;
  menOnly: boolean; // Added menOnly based on data
  familyFriendly: boolean;
  region: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
}

interface RegionStats {
  region: string;
  shelterCount: number;
  totalBeds: number;
  availableBeds: number;
  acceptsPetsCount: number;
}

// Component for shelter finder and emergency housing resources
export default function SheltersPage() {
  // Dynamic shelters state
  const [shelters, setShelters] = useState<ShelterLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/shelters')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShelters(data.data);
        } else {
          setError('Failed to load shelters');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [hasAvailableBeds, setHasAvailableBeds] = useState(false);
  const [acceptsPets, setAcceptsPets] = useState(false);
  const [isAccessible, setIsAccessible] = useState(false);
  const [isLgbtqFriendly, setIsLgbtqFriendly] = useState(false);
  const [familyFriendly, setFamilyFriendly] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [menOnly, setMenOnly] = useState(false); // Added state for menOnly filter
  const [activeTab, setActiveTab] = useState('finder');
  const [expandedShelter, setExpandedShelter] = useState<number | null>(null);
  const [showEmergencyInfo, setShowEmergencyInfo] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false); // State for mobile filter toggle

  // Use fetched shelters for regions
  const regions = useMemo(() => {
    const unique = [...new Set(shelters.map(s => s.region))];
    return ['all', ...unique.sort()];
  }, [shelters]);

  // Get user location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLoadingLocation(false);
          // Use a more user-friendly notification instead of alert
          // Consider adding a state for error messages
          alert("Unable to retrieve your location. Please ensure location services are enabled or try searching by region instead.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Filter based on shelters state
  const filteredShelters = useMemo(() => {
    let results = [...shelters];

    // Apply search term filter
    if (searchTerm) {
      const terms = searchTerm.toLowerCase();
      results = results.filter(shelter =>
        shelter.name.toLowerCase().includes(terms) ||
        shelter.city.toLowerCase().includes(terms) ||
        shelter.postcode.toLowerCase().includes(terms)
      );
    }

    // Apply region filter
    if (selectedRegion !== 'all') {
      results = results.filter(shelter => shelter.region === selectedRegion);
    }

    // Apply available beds filter
    if (hasAvailableBeds) {
      results = results.filter(shelter =>
        shelter.availableBeds !== undefined && shelter.availableBeds > 0
      );
    }

    // Apply pets filter
    if (acceptsPets) {
      results = results.filter(shelter => shelter.acceptsPets);
    }

    // Apply accessibility filter
    if (isAccessible) {
      results = results.filter(shelter =>
        shelter.accessibilityFeatures.some(feature =>
          feature.toLowerCase().includes('wheelchair') ||
          feature.toLowerCase().includes('accessible')
        )
      );
    }

    // Apply LGBTQ+ friendly filter
    if (isLgbtqFriendly) {
      results = results.filter(shelter => shelter.lgbtqFriendly);
    }

    // Apply family friendly filter
    if (familyFriendly) {
      results = results.filter(shelter => shelter.familyFriendly);
    }

    // Apply women only filter
    if (womenOnly) {
      results = results.filter(shelter => shelter.womenOnly);
    }

    // Apply men only filter
    if (menOnly) {
        results = results.filter(shelter => shelter.menOnly);
    }

    // Sort by distance if user location is available
    if (userLocation) {
      results.forEach(shelter => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          shelter.latitude,
          shelter.longitude
        );
        // Add distance property to shelter object (casting to any to avoid TS error)
        (shelter as any).distance = distance;
      });

      // Sort results by distance ascending
      results.sort((a, b) => (a as any).distance - (b as any).distance);
    } else {
        // Default sort by name if no location
        results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  }, [shelters, searchTerm, selectedRegion, hasAvailableBeds, acceptsPets, isAccessible, isLgbtqFriendly, familyFriendly, womenOnly, menOnly, userLocation]);

  // Calculate statistics for regions
  const regionStats: RegionStats[] = useMemo(() => {
    const stats: Record<string, RegionStats> = {};

    shelters.forEach(shelter => {
      if (!stats[shelter.region]) {
        stats[shelter.region] = {
          region: shelter.region,
          shelterCount: 0,
          totalBeds: 0,
          availableBeds: 0,
          acceptsPetsCount: 0
        };
      }

      stats[shelter.region].shelterCount++;

      if (shelter.totalBeds) {
        stats[shelter.region].totalBeds += shelter.totalBeds;
      }

      if (shelter.availableBeds) {
        stats[shelter.region].availableBeds += shelter.availableBeds;
      }

      if (shelter.acceptsPets) {
        stats[shelter.region].acceptsPetsCount++;
      }
    });

    return Object.values(stats).sort((a, b) => a.region.localeCompare(b.region));
  }, [shelters]);

  // Toggle shelter expanded view
  const toggleExpand = (id: number) => {
    setExpandedShelter(expandedShelter === id ? null : id);
  };

  // Function to render feature icons
  const renderFeatureIcons = (shelter: ShelterLocation) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {shelter.acceptsPets && <span title="Pet Friendly" className="text-gray-600"><FaPaw className="w-4 h-4" /></span>}
    {shelter.accessibilityFeatures.some(f => f.toLowerCase().includes('accessible')) && <span title="Accessible" className="text-gray-600"><FaWheelchair className="w-4 h-4" /></span>}
    {shelter.lgbtqFriendly && <span title="LGBTQ+ Friendly" className="text-gray-600"><FaRainbow className="w-4 h-4" /></span>}
    {shelter.familyFriendly && <span title="Family Friendly" className="text-gray-600"><FaChild className="w-4 h-4" /></span>}
    {shelter.womenOnly && <span title="Women Only" className="text-gray-600">♀</span>}
    {shelter.menOnly && <span title="Men Only" className="text-gray-600">♂</span>}
  </div>
  );

  if (loading) return <p>Loading shelters...</p>;
  if (error) return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg max-w-xl mx-auto mt-8 text-gray-800 text-center">
      {/* Error message content as before */}
      <h2 className="text-2xl font-bold mb-2 text-red-700">We couldn't load shelter data</h2>
      <p className="mb-4">Sorry, we were unable to load the list of shelters at this time. This could be due to a temporary technical issue or a problem with your internet connection.</p>
      <p className="mb-4">You can still get help right now:</p>
      <ul className="mb-4 space-y-2 text-left inline-block">
        <li><strong>Call/Text/WhatsApp:</strong> <a href="tel:+447853811172" className="text-blue-700 underline">+44 7853 811172</a></li>
        <li><strong>Email:</strong> <a href="mailto:helpme@homeless.website" className="text-blue-700 underline">helpme@homeless.website</a></li>
        <li><strong>Facebook:</strong> <a href="https://www.facebook.com/homelesshelpuk" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">homelesshelpuk</a></li>
        <li><strong>For service dog support:</strong> <a href="mailto:dogs@homeless.website" className="text-blue-700 underline">dogs@homeless.website</a></li>
        <li><strong>General info:</strong> <a href="mailto:info@homeless.website" className="text-blue-700 underline">info@homeless.website</a></li>
        <li><strong>Volunteer:</strong> <a href="mailto:volunteer@homeless.website" className="text-blue-700 underline">volunteer@homeless.website</a></li>
      </ul>
      <p className="mb-2">Or try reloading the page in a few minutes.</p>
    </div>
  );

  return (
    <>
      <div className="font-sans">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-red-700 to-red-900 text-white py-8 px-4">
          <div className="container mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">Emergency Accommodation & Shelters</h1>
            <p className="text-center max-w-3xl mx-auto text-md md:text-lg mb-6">
              Find emergency accommodation, night shelters, and support for those experiencing homelessness across the UK.
              Our interactive tools can help you locate available beds and resources in your area.
            </p>

            {/* Emergency Help Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowEmergencyInfo(!showEmergencyInfo)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg flex items-center transition-colors"
                aria-expanded={showEmergencyInfo}
                aria-controls="emergency-info-panel"
              >
                <FaInfoCircle className="mr-2 w-5 h-5" /> Immediate Help Available
              </button>
            </div>

            {/* Emergency Information Panel */}
            <AnimatePresence>
              {showEmergencyInfo && (
                <motion.div
                  id="emergency-info-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-yellow-50 text-black p-4 mt-4 rounded-lg shadow-md max-w-3xl mx-auto overflow-hidden" // Added overflow-hidden
                >
                  <h2 className="text-xl font-bold mb-2">Need Emergency Accommodation Tonight?</h2>
                  <ul className="list-disc pl-6 mb-4 space-y-2 text-sm md:text-base">
                    <li>Call your local council's housing department immediately - they have a legal duty to help if you're homeless or at risk of homelessness within 56 days</li>
                    <li>Call the National Homeless Advice Service: <a href="tel:08000684141" className="text-red-700 font-semibold hover:underline">0800 068 4141</a> (free, 24/7)</li>
                    <li>Contact Shelter's emergency helpline: <a href="tel:08088004444" className="text-red-700 font-semibold hover:underline">0808 800 4444</a> (8am-8pm weekdays, 9am-5pm weekends)</li>
                    <li>If you're in immediate danger, call <a href="tel:999" className="text-red-700 font-semibold hover:underline">999</a></li>
                    <li>For mental health crisis support, call: <a href="tel:08088084994" className="text-red-700 font-semibold hover:underline">0808 808 4994</a></li>
                  </ul>
                  <p className="font-semibold text-sm md:text-base">You can also contact our team directly for assistance:</p>
                  <div className="flex items-center mt-2">
                    <FaPhone className="text-red-700 mr-2" />
                    <a href="tel:+447853811172" className="text-red-700 font-semibold hover:underline text-sm md:text-base">+44 7853 811172</a>
                  </div>
                  <div className="flex items-center mt-2">
                    <FaEnvelope className="text-red-700 mr-2" />
                    <a href="mailto:helpme@homeless.website" className="text-red-700 font-semibold hover:underline text-sm md:text-base">helpme@homeless.website</a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Tab Navigation - Improved for mobile/desktop */}
          <nav
            className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mb-6"
            aria-label="Shelter menu navigation"
            role="tablist"
          >
            <div className="flex flex-nowrap gap-2 min-w-max border-b border-gray-200">
              <button
                className={`px-4 py-2 font-medium text-sm rounded-t-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors whitespace-nowrap ${
                  activeTab === 'finder'
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('finder')}
                aria-selected={activeTab === 'finder'}
                aria-controls="tab-finder"
                id="tab-finder-btn"
                role="tab"
                tabIndex={0}
              >
                <FaMapMarkerAlt className="inline mr-1 w-4 h-4" /> Shelter Finder
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm rounded-t-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors whitespace-nowrap ${
                  activeTab === 'rights'
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('rights')}
                aria-selected={activeTab === 'rights'}
                aria-controls="tab-rights"
                id="tab-rights-btn"
                role="tab"
                tabIndex={0}
              >
                <FaBalanceScale className="inline mr-1" /> Housing Rights
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm rounded-t-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors whitespace-nowrap ${
                  activeTab === 'stats'
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('stats')}
                aria-selected={activeTab === 'stats'}
                aria-controls="tab-stats"
                id="tab-stats-btn"
                role="tab"
                tabIndex={0}
              >
                <FaInfoCircle className="inline mr-1" /> Accommodation Stats
              </button>
            </div>
          </nav>

          {/* Tab Content */}
          <div role="tabpanel" id={`tab-${activeTab}`}
            aria-labelledby={`tab-${activeTab}-btn`}>
            {/* Shelter Finder Tab */}
            {activeTab === 'finder' && (
              <div>
                {/* Search and Filter Row */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6 shadow-sm">
                   {/* Mobile Filter Toggle Button */}
                   <button
                      onClick={() => setFiltersOpen(!filtersOpen)}
                      className="flex items-center justify-between w-full md:hidden bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded mb-4"
                      aria-expanded={filtersOpen}
                      aria-controls="filter-panel"
                   >
                      <span>{filtersOpen ? 'Hide Filters' : 'Show Filters'}</span>
                      <svg className={`w-5 h-5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                   </button>

                   {/* Filter Panel - Conditionally rendered on mobile */}
                   <div id="filter-panel" className={`${filtersOpen ? 'block' : 'hidden'} md:block`}>
                      <div className="flex flex-col md:flex-row gap-4 mb-4">
                          {/* Search Input */}
                          <div className="flex-grow relative">
                          <label htmlFor="search-term" className="sr-only">Search by name, city or postcode</label>
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaSearch className="text-gray-400" />
                          </div>
                          <input
                              id="search-term"
                              type="text"
                              placeholder="Search by name, city or postcode..."
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          </div>

                          {/* Region Dropdown */}
                          <div className="md:w-1/4">
                          <label htmlFor="region-select" className="sr-only">Select region</label>
                          <select
                              id="region-select"
                              name="region"
                              className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              value={selectedRegion}
                              onChange={(e) => setSelectedRegion(e.target.value)}
                          >
                              {regions.map(region => (
                              <option key={region} value={region}>
                                  {region === 'all' ? 'All Regions' : region}
                              </option>
                              ))}
                          </select>
                          </div>

                          {/* Geolocation Button */}
                          <button
                          onClick={getUserLocation}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loadingLocation}
                          >
                          {loadingLocation ? (
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                          ) : (
                              <FaMapMarkerAlt className="mr-2" />
                          )}
                          {loadingLocation ? 'Locating...' : 'Find Nearby'}
                          </button>
                      </div>

                      {/* Filter Checkboxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                          <label className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                          <input
                              type="checkbox"
                              checked={hasAvailableBeds}
                              onChange={() => setHasAvailableBeds(!hasAvailableBeds)}
                              className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 transition duration-150 ease-in-out"
                          />
                          <span><FaBed className="inline mr-1 text-gray-600" /> Beds</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                          <input
                              type="checkbox"
                              checked={acceptsPets}
                              onChange={() => setAcceptsPets(!acceptsPets)}
                              className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 transition duration-150 ease-in-out"
                          />
                          <span><FaPaw className="inline mr-1 text-gray-600" /> Pets</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                          <input
                              type="checkbox"
                              checked={isAccessible}
                              onChange={() => setIsAccessible(!isAccessible)}
                              className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 transition duration-150 ease-in-out"
                          />
                          <span><FaWheelchair className="inline mr-1 text-red-600" /> Accessible</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                          <input
                              type="checkbox"
                              checked={isLgbtqFriendly}
                              onChange={() => setIsLgbtqFriendly(!isLgbtqFriendly)}
                              className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 transition duration-150 ease-in-out"
                          />
                          <span><FaRainbow className="inline mr-1 text-gray-600" /> LGBTQ+</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                          <input
                              type="checkbox"
                              checked={familyFriendly}
                              onChange={() => setFamilyFriendly(!familyFriendly)}
                              className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 transition duration-150 ease-in-out"
                          />
                          <span><FaChild className="inline mr-1 text-gray-600" /> Family</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                          <input
                              type="checkbox"
                              checked={womenOnly}
                              onChange={() => setWomenOnly(!womenOnly)}
                              className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 transition duration-150 ease-in-out"
                          />
                          <span>Women Only</span>
                          </label>
                           <label className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                              <input
                                  type="checkbox"
                                  checked={menOnly}
                                  onChange={() => setMenOnly(!menOnly)}
                                  className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 transition duration-150 ease-in-out"
                              />
                              <span>Men Only</span>
                          </label>
                      </div>
                   </div>
                </div>

                {/* Results Count */}
                <p className="text-gray-600 mb-4 text-sm">
                  {filteredShelters.length} {filteredShelters.length === 1 ? 'shelter' : 'shelters'} found.
                  {userLocation && " Sorted by distance from your location."}
                </p>

                {/* Shelter List */}
                {filteredShelters.length > 0 ? (
                  <div className="space-y-4">
                    {filteredShelters.map(shelter => (
                      <motion.div
                        key={shelter.id}
                        className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white" // Added bg-white
                        layout // Animate layout changes
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <button // Changed div to button for accessibility
                          className={`w-full p-4 text-left ${
                            expandedShelter === shelter.id ? 'bg-red-50' : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => toggleExpand(shelter.id)}
                          aria-expanded={expandedShelter === shelter.id}
                          aria-controls={`shelter-details-${shelter.id}`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                            {/* Left side: Name, Address, Icons */}
                            <div className="mb-2 sm:mb-0">
                              <h2 className="text-lg md:text-xl font-bold text-gray-800">{shelter.name}</h2>
                              <p className="text-sm text-gray-600 flex items-center">
                                  <FaMapMarkerAlt className="mr-1 flex-shrink-0" />
                                  {shelter.address === "Confidential Location" ? shelter.address : `${shelter.address}, ${shelter.city}, ${shelter.postcode}`}
                              </p>
                               {renderFeatureIcons(shelter)} {/* Render icons here */}
                            </div>
                            {/* Right side: Beds, Distance, Chevron */}
                            <div className="flex items-center justify-between sm:justify-end space-x-3 mt-2 sm:mt-0 flex-shrink-0">
                              {shelter.availableBeds !== undefined && (
                                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                  shelter.availableBeds > 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                {shelter.availableBeds} {shelter.availableBeds === 1 ? 'bed' : 'beds'}
                                </span>
                              )}
                              {userLocation && (shelter as any).distance !== undefined && ( // Check distance exists
                                <span className="text-sm text-gray-600 whitespace-nowrap">
                                  {(shelter as any).distance.toFixed(1)} km
                                </span>
                              )}
                              <span
                                aria-hidden="true" // Hide decorative chevron from screen readers
                                className="text-gray-500 hover:text-gray-700"
                              >
                                {expandedShelter === shelter.id ? <FaChevronUp /> : <FaChevronDown />}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Expanded Shelter Details */}
                        <AnimatePresence>
                          {expandedShelter === shelter.id && (
                            <motion.div
                              id={`shelter-details-${shelter.id}`} // ID matches aria-controls
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-t border-gray-200 p-4 overflow-hidden" // Added overflow-hidden
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                {/* Column 1: Contact, Hours, Beds */}
                                <div>
                                  <h3 className="font-semibold text-gray-700 mb-2">Contact & Hours</h3>
                                  <p className="flex items-center mb-1">
                                    <FaPhone className="text-red-600 mr-2 flex-shrink-0" />
                                    <a href={`tel:${shelter.phone}`} className="text-red-600 hover:underline break-all">
                                      {shelter.phone}
                                    </a>
                                  </p>
                                  {shelter.email && (
                                    <p className="flex items-center mb-1">
                                      <FaEnvelope className="text-red-600 mr-2 flex-shrink-0" />
                                      <a href={`mailto:${shelter.email}`} className="text-red-600 hover:underline break-all">
                                        {shelter.email}
                                      </a>
                                    </p>
                                  )}
                                  {shelter.website && (
                                    <p className="flex items-center mb-1">
                                      <FaExternalLinkAlt className="text-red-600 mr-2 flex-shrink-0" />
                                      <a href={shelter.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline break-all">
                                        Visit Website
                                      </a>
                                    </p>
                                  )}
                                  <p className="flex items-center mb-2">
                                    <FaClock className="text-gray-600 mr-2 flex-shrink-0" /> {shelter.openingHours}
                                  </p>
                                  {shelter.totalBeds !== undefined && (
                                       <p className="flex items-center mb-1">
                                          <FaBed className="text-gray-600 mr-2 flex-shrink-0" />
                                          Total Beds: {shelter.totalBeds}
                                      </p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-2">
                                    Information last updated: {shelter.lastUpdated}
                                  </p>
                                </div>

                                {/* Column 2: Services, Restrictions, Accessibility */}
                                <div>
                                  <h3 className="font-semibold text-gray-700 mb-2">Services & Features</h3>
                                  {shelter.services.length > 0 && (
                                      <div className="mb-2">
                                          <p className="font-medium text-gray-600">Services:</p>
                                          <ul className="list-disc list-inside text-gray-700">
                                              {shelter.services.map((service, index) => (
                                                  <li key={index}>{service}</li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                                  {shelter.restrictions && shelter.restrictions.length > 0 && (
                                      <div className="mb-2">
                                          <p className="font-medium text-gray-600">Restrictions:</p>
                                          <ul className="list-disc list-inside text-gray-700">
                                              {shelter.restrictions.map((restriction, index) => (
                                                  <li key={index}>{restriction}</li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                                   {shelter.accessibilityFeatures.length > 0 && (
                                      <div className="mb-2">
                                          <p className="font-medium text-gray-600">Accessibility:</p>
                                          <ul className="list-disc list-inside text-gray-700">
                                              {shelter.accessibilityFeatures.map((feature, index) => (
                                                  <li key={index}>{feature}</li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                                  {/* Display boolean flags */}
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                      {shelter.acceptsPets && <span className="flex items-center text-green-700"><FaCheck className="mr-1"/> Pet Friendly</span>}
                                      {shelter.lgbtqFriendly && <span className="flex items-center text-green-700"><FaCheck className="mr-1"/> LGBTQ+ Friendly</span>}
                                      {shelter.familyFriendly && <span className="flex items-center text-green-700"><FaCheck className="mr-1"/> Family Friendly</span>}
                                      {shelter.womenOnly && <span className="flex items-center text-blue-700"><FaInfoCircle className="mr-1"/> Women Only</span>}
                                       {shelter.menOnly && <span className="flex items-center text-blue-700"><FaInfoCircle className="mr-1"/> Men Only</span>}
                                  </div>
                                </div>
                              </div>
                              {/* Add a Google Maps link */}
                               <div className="mt-4">
                                  <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shelter.name}, ${shelter.address !== "Confidential Location" ? shelter.address : shelter.city}, ${shelter.postcode}`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                      <FaMapMarkerAlt className="mr-2" />
                                      View on Map
                                  </a>
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 bg-gray-50 rounded-lg">
                    <FaExclamationTriangle className="mx-auto h-12 w-12 text-yellow-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No Shelters Found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search filters or broadening your search area.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Housing Rights Tab */}
            {activeTab === 'rights' && (
              <div className="prose max-w-none p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h2 className="text-2xl font-bold mb-4">Know Your Housing Rights</h2>
                  <p>
                      Understanding your rights is crucial when facing homelessness or housing insecurity in the UK. Here's a brief overview:
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">Council Duty to Help</h3>
                  <p>
                      If you are homeless or threatened with homelessness within 56 days, your local council has a legal duty to assess your situation and provide help. This might include:
                  </p>
                  <ul>
                      <li>Providing information and advice.</li>
                      <li>Helping you find accommodation or prevent eviction.</li>
                      <li>Providing temporary emergency accommodation if you meet certain criteria (e.g., have dependent children, are vulnerable due to age, health, or other reasons).</li>
                  </ul>
                  <p>
                      You can find your local council's contact details using the <a href="https://www.gov.uk/find-local-council" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">GOV.UK website</a>.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">Eligibility</h3>
                  <p>
                      To receive help, you generally need to be eligible for assistance (based on immigration status) and be considered legally homeless or threatened with homelessness. Some individuals may be deemed 'intentionally homeless', which can affect the type of help offered, but councils must still provide advice.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">Priority Need</h3>
                  <p>
                      Councils must provide emergency accommodation to those assessed as being in 'priority need'. This includes:
                  </p>
                  <ul>
                      <li>Families with dependent children.</li>
                      <li>Pregnant women.</li>
                      <li>People vulnerable due to old age, mental illness, disability, or physical disability.</li>
                      <li>Young people aged 16 or 17.</li>
                      <li>People made homeless by fire, flood, or other disaster.</li>
                      <li>People vulnerable as a result of fleeing domestic abuse.</li>
                  </ul>

                   <h3 className="text-xl font-semibold mt-4 mb-2">Where to Get Advice</h3>
                   <p>Several organizations offer free, expert advice on housing rights:</p>
                   <ul>
                      <li><strong>Shelter:</strong> Provides comprehensive advice online, via webchat, and through a helpline (<a href="tel:08088004444" className="text-red-600 hover:underline">0808 800 4444</a>). Visit <a href="https://www.shelter.org.uk" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">shelter.org.uk</a>.</li>
                      <li><strong>Citizens Advice:</strong> Offers guidance on a wide range of issues, including housing. Visit <a href="https://www.citizensadvice.org.uk" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">citizensadvice.org.uk</a>.</li>
                      <li><strong>Local Law Centres:</strong> Provide free legal advice in some areas. Search for your nearest one online.</li>
                   </ul>

                  <p className="mt-4 italic text-gray-600">
                      Disclaimer: This information is a general guide and not a substitute for legal advice. Contact your local council or a specialist advice agency for help with your specific situation.
                  </p>
              </div>
            )}

            {/* Accommodation Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold mb-4">Regional Accommodation Statistics</h2>
                <p className="text-gray-600 mb-6">
                  Overview of shelter capacity and features based on the available data. Note: This data is illustrative and may not reflect real-time availability.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shelters</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Beds</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Beds*</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Friendly</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {regionStats.map(stat => (
                        <tr key={stat.region}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.region}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.shelterCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.totalBeds}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.availableBeds}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.acceptsPetsCount} ({((stat.acceptsPetsCount / stat.shelterCount) * 100).toFixed(0)}%)</td>
                        </tr>
                      ))}
                      {/* Add a Total Row */}
                      <tr className="bg-gray-50 font-semibold">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{regionStats.reduce((sum, stat) => sum + stat.shelterCount, 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{regionStats.reduce((sum, stat) => sum + stat.totalBeds, 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{regionStats.reduce((sum, stat) => sum + stat.availableBeds, 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{regionStats.reduce((sum, stat) => sum + stat.acceptsPetsCount, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                 <p className="text-xs text-gray-500 mt-2">*Available bed count is based on the last reported data and may change frequently. Always call ahead to confirm availability.</p>
                 {/* Optional: Add a download button for the data */}
                 {/*
                 <div className="mt-4">
                      <button
                          onClick={() => {
                              // Logic to convert SHELTERS data to CSV and trigger download
                              const headers = Object.keys(SHELTERS[0]).join(',');
                              const csvData = SHELTERS.map(row =>
                                  Object.values(row).map(value =>
                                      // Handle potential commas in values and arrays
                                      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` :
                                      Array.isArray(value) ? `"${value.join('; ')}"` : value
                                  ).join(',')
                              );
                              const csvContent = `data:text/csv;charset=utf-8,${headers}\n${csvData.join('\n')}`;
                              const encodedUri = encodeURI(csvContent);
                              const link = document.createElement("a");
                              link.setAttribute("href", encodedUri);
                              link.setAttribute("download", "shelter_data.csv");
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                          <FaDownload className="mr-2" /> Download Data (CSV)
                      </button>
                  </div>
                  */}
              </div>
            )}
          </div>
        </div>
      </div>
      <ModernFooter />
    </>
  );
}
