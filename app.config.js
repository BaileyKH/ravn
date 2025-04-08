import 'dotenv/config';

export default {
  expo: {
    name: "RAVN",
    slug: "ravn",
    version: "1.0.0",
    description: "Summon the flavor. Discover food near you or on your route.",
    extra: {
      "GOOGLE_API_KEY": process.env.GOOGLE_API_KEY
    },
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: ["**/*"],
    splash: {
      image: "./assets/logo.png",           
      resizeMode: "contain",                
      backgroundColor: "#0d0d0d"           
    },
    ios: {
      buildNumber: "1.0.0",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "We use your location to find food near you.",
      },
      supportsTablet: true
    },
    android: {
      versionCode: 1,
      permissions: ["ACCESS_FINE_LOCATION"],
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0d0d0d"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    }
  }
}
