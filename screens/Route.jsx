import { useState, useEffect, useRef } from 'react';
import 'react-native-get-random-values';
import {
  View,
  TouchableOpacity,
  Platform,
  Linking,
  StyleSheet,
  Text,
  Dimensions,
  Animated,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import { FontAwesome } from '@expo/vector-icons';

// Custom dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1c1c1c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#888' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ color: '#333' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', stylers: [{ color: '#1f1f1f' }] },
];

const GOOGLE_API_KEY = Constants.expoConfig.extra.GOOGLE_API_KEY;

export default function Route() {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [foodSpots, setFoodSpots] = useState([]);
  const [filters, setFilters] = useState({
    foodType: '',
    maxDistanceFromRoute: 1,
    openNow: false,
  });

  const [filtersVisible, setFiltersVisible] = useState(false);
  const [foodDropdownVisible, setFoodDropdownVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const [foodSearch, setFoodSearch] = useState('');
  const foodTypes = [
    'burgers', 'tacos', 'ramen', 'pizza', 'sushi', 'chinese', 'indian', 'thai',
    'korean', 'bbq', 'vegan', 'seafood', 'mexican', 'noodles', 'salad',
    'dessert', 'cafe', 'italian', 'mediterranean', 'fast food', 'steak', 'pho',
  ];
  const [selectedSpot, setSelectedSpot] = useState(null);


  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      setOrigin({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  useEffect(() => {
    if (!origin || !destination) return;
    fetchRoute();
  }, [origin, destination, filters]);

  const toggleFilters = () => {
    Animated.timing(slideAnim, {
      toValue: filtersVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setFiltersVisible(!filtersVisible);
  };

  const fetchRoute = async () => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.routes.length) {
      const points = decodePolyline(data.routes[0].overview_polyline.points);
      setRouteCoords(points);

      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });

      const spots = await fetchFoodSpotsAlongRoute(points);
      setFoodSpots(spots);
    }
  };

  const decodePolyline = (t) => {
    let points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < t.length) {
      let b, shift = 0, result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = (result & 1) ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = (result & 1) ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  const fetchFoodSpotsAlongRoute = async (path) => {
    const sampled = path.filter((_, i) => i % 15 === 0);
    let spots = [];

    for (const point of sampled) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${point.latitude},${point.longitude}&radius=${filters.maxDistanceFromRoute * 1609}&type=restaurant&key=${GOOGLE_API_KEY}${filters.foodType ? `&keyword=${filters.foodType}` : ''}${filters.openNow ? `&opennow=true` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.results) {
        spots = [...spots, ...data.results];
      }
    }

    return Object.values(spots.reduce((acc, curr) => {
      acc[curr.place_id] = curr;
      return acc;
    }, {}));
  };

  const openInMaps = (lat, lng, label = 'Food Spot') => {
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {origin && (
        <ClusteredMapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === 'android' ? 'google' : undefined}
          customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
          onPress={() => {
            if (selectedSpot) setSelectedSpot(null);
          }}
          showsUserLocation
          initialRegion={{
            latitude: origin.latitude,
            longitude: origin.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          clusterColor="#CC1014"
          clusterTextColor="#fff"
          clusterBorderColor="#1f1f1f"
          animationEnabled
          preserveClusterPressBehavior
        >
          {origin && <Marker coordinate={origin} title="Your Location" />}
          {destination && <Marker coordinate={destination} title="Destination" />}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#CC1014" />
          )}
          {foodSpots.map((spot) => (
            <Marker
              key={spot.place_id}
              coordinate={{
                latitude: spot.geometry.location.lat,
                longitude: spot.geometry.location.lng,
              }}
              title={spot.name}
              description={spot.vicinity}
              onPress={() => setSelectedSpot(spot)}
              image={require('../assets/logo-pin.png')}
            />
          ))}
        </ClusteredMapView>
      )}

      {/* Destination Search */}
      <GooglePlacesAutocomplete
        placeholder="Where ya headed?"
        fetchDetails
        onPress={(data, details = null) => {
          const loc = details.geometry.location;
          setDestination({ latitude: loc.lat, longitude: loc.lng });
        }}
        query={{
          key: GOOGLE_API_KEY,
          language: 'en',
        }}
        styles={{
          container: styles.autocompleteContainer,
          textInput: styles.input,
        }}
        textInputProps={{
          placeholderTextColor: '#888',
        }}
      />

      {/* Toggle Filters */}
      <TouchableOpacity style={styles.filterToggle} onPress={toggleFilters}>
        <Text style={styles.filterToggleText}>Filters</Text>
        <FontAwesome name={filtersVisible ? 'chevron-up' : 'chevron-down'} size={16} color="#CC1014" />
      </TouchableOpacity>

      {/* Collapsible Filters */}
      <Animated.View
        style={[
          styles.filterPanel,
          {
            height: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 290], 
            }),
            opacity: slideAnim,
          },
        ]}
      >
        <View style={styles.toggleRow}>
          <Text style={styles.filterLabel}>Only show open now</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              filters.openNow ? styles.toggleActive : styles.toggleInactive,
            ]}
            onPress={() =>
              setFilters((prev) => ({ ...prev, openNow: !prev.openNow }))
            }
          >
            <Text style={styles.toggleText}>{filters.openNow ? 'On' : 'Off'}</Text>
          </TouchableOpacity>
        </View>
        <View>
          <Text style={styles.filterLabel}>Food Type</Text>
          {/* FOOD TYPE DROPDOWN */}
          <TouchableOpacity
            onPress={() => setFoodDropdownVisible((prev) => !prev)}
            style={styles.dropdownToggle}
          >
            <Text style={styles.dropdownToggleText}>
              {filters.foodType ? filters.foodType : 'Select Food Type'}
            </Text>
            <FontAwesome name={foodDropdownVisible ? 'chevron-up' : 'chevron-down'} size={14} color="#fff" />
          </TouchableOpacity>

          {foodDropdownVisible && (
            <View style={styles.dropdownList}>
              <TextInput
                placeholder="Search food type..."
                placeholderTextColor="#888"
                style={styles.dropdownSearchInput}
                onChangeText={(text) => setFoodSearch(text.toLowerCase())}
              />
              <ScrollView style={{ maxHeight: 160 }}>
                {foodTypes
                  .filter((type) => type.includes(foodSearch))
                  .map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.dropdownOption,
                        filters.foodType === type && styles.activeDropdownOption,
                      ]}
                      onPress={() => {
                        setFilters((prev) => ({ ...prev, foodType: type }));
                        setFoodDropdownVisible(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}


          <Text style={[styles.filterLabel, { marginTop: 12 }]}>
            Max Distance Off Route: {filters.maxDistanceFromRoute} mi
          </Text>
          <View style={styles.foodTypeOptions}>
            {[0.5, 1, 2, 5].map((distance) => (
              <TouchableOpacity
                key={distance}
                style={[
                  styles.foodTypeButton,
                  filters.maxDistanceFromRoute === distance && styles.activeFoodType,
                ]}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    maxDistanceFromRoute: distance,
                  }))
                }
              >
                <Text style={styles.foodTypeText}>{distance}mi</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() =>
            setFilters({
              foodType: '',
              maxDistanceFromRoute: 1,
            })
          }
        >
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Recenter */}
      <TouchableOpacity
        onPress={() => {
          if (routeCoords.length > 0) {
            mapRef.current?.fitToCoordinates(routeCoords, {
              edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
              animated: true,
            });
          }
        }}
        style={styles.recenterButton}
      >
        <FontAwesome name="location-arrow" size={18} color="#fff" />
      </TouchableOpacity>
      {selectedSpot && (
        <View style={styles.infoCard}>
          {/* Spot Image */}
          {selectedSpot.photos?.[0] && (
            <Image
              source={{
                uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${selectedSpot.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`,
              }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          )}

          {/* Name */}
          <Text style={styles.infoName}>{selectedSpot.name}</Text>

          {/* Rating & Price */}
          <View style={styles.infoRow}>
            <View style={styles.ratingStars}>
              {[...Array(5)].map((_, i) => (
                <FontAwesome
                  key={i}
                  name={i < Math.round(selectedSpot.rating) ? 'star' : 'star-o'}
                  size={14}
                  color="#FFD700"
                  style={{ marginRight: 2 }}
                />
              ))}
              {selectedSpot.rating && (
                <Text style={styles.infoRatingText}>({selectedSpot.rating})</Text>
              )}
            </View>

            {selectedSpot.price_level && (
              <Text style={styles.infoPrice}>
                {'$'.repeat(selectedSpot.price_level)}
              </Text>
            )}
          </View>

          {/* Open Now */}
          {selectedSpot.opening_hours && (
            <Text
              style={[
                styles.infoStatus,
                {
                  color: selectedSpot.opening_hours.open_now ? '#00FF7F' : '#FF3B3F',
                },
              ]}
            >
              {selectedSpot.opening_hours.open_now ? 'Open Now' : 'Closed'}
            </Text>
          )}

          {/* Address */}
          {selectedSpot.vicinity && (
            <Text style={styles.infoText}>{selectedSpot.vicinity}</Text>
          )}

          {/* Directions Button */}
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={() => {
              openInMaps(
                selectedSpot.geometry.location.lat,
                selectedSpot.geometry.location.lng,
                selectedSpot.name
              );
              setSelectedSpot(null); // Optional: close after tap
            }}
          >
            <Text style={styles.directionsText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  autocompleteContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  input: {
    backgroundColor: '#1f1f1f',
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderColor: '#CC1014',
    borderWidth: 1.4,
  },
  filterToggle: {
    position: 'absolute',
    top: 120,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
    gap: 6,
  },
  filterToggleText: {
    color: '#CC1014',
    fontSize: 15,
    fontWeight: '600',
  },
  filterPanel: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    zIndex: 9,
    overflow: 'hidden',
  },
  filterLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  
  toggleActive: {
    backgroundColor: '#00FF7F', 
  },
  
  toggleInactive: {
    backgroundColor: '#333',
  },
  
  toggleText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  
  foodTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  foodTypeButton: {
    backgroundColor: '#1f1f1f',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#333',
  },
  activeFoodType: {
    backgroundColor: '#CC1014',
    borderColor: '#CC1014',
  },
  foodTypeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownToggle: {
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  dropdownToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  dropdownList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
    maxHeight: 160,
  },
  
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  
  activeDropdownOption: {
    backgroundColor: '#CC1014',
  },
  
  dropdownOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },  

  dropdownSearchInput: {
    backgroundColor: '#1f1f1f',
    color: '#fff',
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
    borderRadius: 6,
  },
  
  clearButton: {
    marginTop: 32,
    backgroundColor: '#1f1f1f',
    borderColor: '#CC1014',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  recenterButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: '#1f1f1f',
    borderColor: '#CC1014',
    borderWidth: 1.5,
    borderRadius: 999,
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  infoCard: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  infoName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
  },
  infoStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  directionsButton: {
    backgroundColor: '#CC1014',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  directionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 11,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#222',
  },
  infoName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRatingText: {
    color: '#aaa',
    fontSize: 13,
    marginLeft: 4,
  },
  infoPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 14,
  },
  directionsButton: {
    backgroundColor: '#CC1014',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  directionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },  
  
});
