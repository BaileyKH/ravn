import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import Logo from '../assets/logo.png'; // Main logo (clean)
import LogoBg from '../assets/logo.png'; // Background logo (same image for now)

export default function Home({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Blurred Raven Background */}
      <ExpoImage
        source={LogoBg}
        style={styles.backgroundImage}
        contentFit="cover"
        blurRadius={60}
      />

      {/* Gradient Glass Overlay */}
      <LinearGradient
        colors={['rgba(13,13,13,0.7)', 'rgba(13,13,13,0.95)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Foreground Content */}
      <SafeAreaView style={styles.inner}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>RAVN</Text>
        <Text style={styles.tagline}>Summon the Flavor</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Nearby')}
          >
            <FontAwesome name="location-arrow" size={16} color="#CC1014" />
            <Text style={styles.buttonText}>Near Me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Route')}
          >
            <FontAwesome name="map-marker" size={16} color="#CC1014" />
            <Text style={styles.buttonText}>On the Way</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    position: 'relative',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1, // Can adjust for more/less intensity
    zIndex: 0,
  },
  inner: {
    flex: 1,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#fff',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 6,
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '80%',
    gap: 16,
  },
  button: {
    backgroundColor: '#1a1a1a',
    borderColor: '#CC1014',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

