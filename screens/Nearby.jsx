import { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    TouchableOpacity,
    Platform,
    Animated,
    Image,
    RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { FontAwesome } from "@expo/vector-icons";
import Constants from "expo-constants";

const GOOGLE_API_KEY = Constants.expoConfig.extra.GOOGLE_API_KEY;

// Utilities
const getPhotoUrl = (photoRef, maxWidth = 400) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;
};

const getDistanceInMiles = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceInKm = R * c;
    return (distanceInKm * 0.621371).toFixed(1);
};

export default function Nearby({ navigation }) {
    const [location, setLocation] = useState(null);
    const [places, setPlaces] = useState([]);
    const [filters, setFilters] = useState({
        openNow: false,
        maxPrice: 4,
        maxDistance: 5,
    });

    const [filtersVisible, setFiltersVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Function will get the users location utilizing longitude and latitude then fetches food places, it also allows the user to refresh the results
    const fetchPlaces = async () => {
        setRefreshing(true);
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
            Alert.alert(
                "Permission Denied",
                "We need location to show nearby food."
            );
            setLoading(false);
            setRefreshing(false);
            return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        const coords = currentLocation.coords;
        setLocation(coords);

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.latitude},${coords.longitude}&radius=2000&type=restaurant&key=${GOOGLE_API_KEY}`
            );
            const data = await response.json();
            const sorted = data.results.sort((a, b) => {
                const aOpen = a.opening_hours?.open_now ? 1 : 0;
                const bOpen = b.opening_hours?.open_now ? 1 : 0;
                return bOpen - aOpen;
            });
            setPlaces(sorted);
        } catch (error) {
            console.error("Error fetching places:", error);
            Alert.alert(
                "Error",
                "Something went wrong while fetching food places."
            );
        }

        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchPlaces();
    }, []);

    // Filters and sorts data based on if the restaurants are open, the distance to the user within a set number of miles, and the maximum price point
    const filteredPlaces = places
        .filter((place) => {
            if (filters.openNow && !place.opening_hours?.open_now) {
                return false;
            }
            if (
                filters.maxPrice &&
                place.price_level &&
                place.price_level > filters.maxPrice
            ) {
                return false;
            }
            if (location && filters.maxDistance && place.geometry?.location) {
                const distance = getDistanceInMiles(
                    location.latitude,
                    location.longitude,
                    place.geometry.location.lat,
                    place.geometry.location.lng
                );
                if (distance > filters.maxDistance) {
                    return false;
                }
            }
            return true;
        })
        .sort((a, b) => {
            const aPrice = a.price_level || 0;
            const bPrice = b.price_level || 0;
            const target = filters.maxPrice;

            if (aPrice === target && bPrice !== target) return -1;
            if (bPrice === target && aPrice !== target) return 1;

            const aRating = typeof a.rating === "number" ? a.rating : 0;
            const bRating = typeof b.rating === "number" ? b.rating : 0;

            return bRating - aRating;
        });

    // Handles the refresh of data when a user pulls up for a reload
    const handleRefresh = async () => {
        setRefreshing(true);
        await Haptics.selectionAsync();

        try {
            const currentLocation = await Location.getCurrentPositionAsync({});
            const coords = currentLocation.coords;
            setLocation(coords);

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.latitude},${coords.longitude}&radius=2000&type=restaurant&key=${GOOGLE_API_KEY}`
            );

            const data = await response.json();
            const sorted = data.results.sort((a, b) => {
                const aOpen = a.opening_hours?.open_now ? 1 : 0;
                const bOpen = b.opening_hours?.open_now ? 1 : 0;
                return bOpen - aOpen;
            });

            setPlaces(sorted);
        } catch (error) {
            console.error("Refresh error:", error);
            Alert.alert("Error", "Could not refresh places.");
        }

        setRefreshing(false);
    };

    // Depending on the OS of the user, when a restaurant is tapped it will load directions directly to either apple or google maps
    const openInMaps = (lat, lng, label = "Food Spot") => {
        const url =
            Platform.OS === "ios"
                ? `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`
                : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url);
    };

    // Simple loading state while restaurants load
    if (loading) {
        return (
            <SafeAreaView style={styles.loadingWrapper}>
                <ActivityIndicator
                    size="large"
                    color="#FF3B3F"
                    style={{ marginBottom: 16 }}
                />
                <Text style={styles.loadingText}>
                    Looking for food near you...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#0d0d0d" }}>
            <SafeAreaView style={{ flex: 1 }}>
                <FlatList
                    data={filteredPlaces}
                    keyExtractor={(item) => item.place_id}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#FF3B3F"
                            colors={["#FF3B3F"]}
                            progressBackgroundColor="#1a1a1a"
                        />
                    }
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: 40,
                    }}
                    ListHeaderComponent={() => (
                        <View style={styles.headerContainer}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                            >
                                <FontAwesome
                                    name="chevron-left"
                                    size={16}
                                    color="#fff"
                                />
                                <Text style={styles.backText}>Back</Text>
                            </TouchableOpacity>
                            <View style={styles.headerWrapper}>
                                <Text style={styles.headerTitle}>
                                    Spots Nearby
                                </Text>
                                <View style={styles.headerAccent} />
                            </View>
                            <TouchableOpacity
                                style={styles.dropdownToggle}
                                onPress={() =>
                                    setFiltersVisible((prev) => !prev)
                                }
                            >
                                <Text style={styles.dropdownToggleText}>
                                    Filters
                                </Text>
                                <FontAwesome
                                    name={
                                        filtersVisible
                                            ? "chevron-up"
                                            : "chevron-down"
                                    }
                                    size={14}
                                    color="#fff"
                                />
                            </TouchableOpacity>
                            {filtersVisible && (
                                <View style={styles.filterPanel}>
                                    <View style={styles.filterItem}>
                                        <Text style={styles.filterLabel}>
                                            Only show open now
                                        </Text>
                                        <TouchableOpacity
                                            style={[
                                                styles.toggleButton,
                                                filters.openNow
                                                    ? styles.toggleActive
                                                    : styles.toggleInactive,
                                            ]}
                                            onPress={() =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    openNow: !prev.openNow,
                                                }))
                                            }
                                        >
                                            <Text style={styles.toggleText}>
                                                {filters.openNow ? "On" : "Off"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.filterItem}>
                                        <Text style={styles.filterLabel}>
                                            Price
                                        </Text>
                                        <View style={styles.dropdownRow}>
                                            {[1, 2, 3, 4].map((level) => (
                                                <TouchableOpacity
                                                    key={level}
                                                    style={[
                                                        styles.dropdownOption,
                                                        filters.maxPrice ===
                                                            level &&
                                                            styles.dropdownOptionActive,
                                                    ]}
                                                    onPress={() =>
                                                        setFilters((prev) => ({
                                                            ...prev,
                                                            maxPrice: level,
                                                        }))
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.dropdownText
                                                        }
                                                    >
                                                        {"$".repeat(level)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={styles.filterGroup}>
                                        <Text style={styles.filterLabel}>
                                            Distance
                                        </Text>
                                        <View style={styles.dropdownRow}>
                                            {[0.5, 1, 2, 5, 10].map((miles) => (
                                                <TouchableOpacity
                                                    key={miles}
                                                    style={[
                                                        styles.dropdownOption,
                                                        filters.maxDistance ===
                                                            miles &&
                                                            styles.dropdownOptionActive,
                                                    ]}
                                                    onPress={() =>
                                                        setFilters((prev) => ({
                                                            ...prev,
                                                            maxDistance: miles,
                                                        }))
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.dropdownText
                                                        }
                                                    >
                                                        {miles}mi
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <Text style={styles.emptyText}>
                            No spots match your filters.
                            {"\n"}Try adjusting them!
                        </Text>
                    )}
                    renderItem={({ item, index }) => (
                        <AnimatedCard
                            item={item}
                            index={index}
                            location={location}
                            openInMaps={openInMaps}
                            getDistanceInMiles={getDistanceInMiles}
                        />
                    )}
                    onRefresh={fetchPlaces}
                    refreshing={refreshing}
                />
            </SafeAreaView>
        </View>
    );
}

function AnimatedCard({
    item,
    index,
    location,
    openInMaps,
    getDistanceInMiles,
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            delay: index * 75,
            useNativeDriver: true,
        }).start();

        Animated.timing(translateAnim, {
            toValue: 0,
            duration: 400,
            delay: index * 75,
            useNativeDriver: true,
        }).start();
    }, []);

    const { lat, lng } = item.geometry.location;
    const distance = location
        ? getDistanceInMiles(location.latitude, location.longitude, lat, lng)
        : null;

    return (
        <TouchableOpacity
            onPress={() => openInMaps(lat, lng, item.name)}
            activeOpacity={0.9}
        >
            <Animated.View
                style={[
                    styles.card,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: translateAnim }],
                    },
                ]}
            >
                {item.photos?.[0] && (
                    <Image
                        source={{
                            uri: getPhotoUrl(item.photos[0].photo_reference),
                        }}
                        style={styles.image}
                    />
                )}
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.infoRow}>
                    <View style={styles.ratingRow}>
                        {[...Array(5)].map((_, i) => (
                            <FontAwesome
                                key={i}
                                name={
                                    i < Math.round(item.rating)
                                        ? "star"
                                        : "star-o"
                                }
                                size={16}
                                color="#FFD700"
                                style={{ marginRight: 2 }}
                            />
                        ))}
                        <Text style={styles.detail}>({item.rating})</Text>
                    </View>

                    {item.price_level && (
                        <Text style={styles.detail}>
                            {"💲".repeat(item.price_level)}
                        </Text>
                    )}

                    {item.opening_hours && (
                        <Text
                            style={[
                                styles.badge,
                                item.opening_hours.open_now
                                    ? styles.open
                                    : styles.closed,
                            ]}
                        >
                            {item.opening_hours.open_now
                                ? "Open Now"
                                : "Closed"}
                        </Text>
                    )}
                </View>
                {distance && (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 8,
                        }}
                    >
                        <FontAwesome
                            name="location-arrow"
                            size={13}
                            color="#ccc"
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.distanceTag}>
                            {distance} miles away
                        </Text>
                    </View>
                )}
                <Text style={styles.vicinity}>{item.vicinity}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

const COLORS = {
    background: "#0d0d0d",
    panel: "#1a1a1a",
    card: "rgba(255, 255, 255, 0.05)",
    accent: "#FF3B3F",
    green: "#00FF7F",
    text: "#fff",
    textMuted: "#aaa",
    border: "#2a2a2a",
    tagBg: "rgba(255,255,255,0.05)",
    closedBg: "rgba(255,59,63,0.1)",
    openBg: "rgba(0,255,127,0.1)",
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        marginBottom: 20,
        gap: 12,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
    },
    backText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    headerWrapper: {
        marginBottom: 20,
        alignItems: "center",
    },
    headerTitle: {
        color: COLORS.text,
        fontSize: 26,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    headerAccent: {
        width: 40,
        height: 3,
        backgroundColor: COLORS.accent,
        borderRadius: 999,
        marginTop: 6,
    },
    dropdownToggle: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        marginTop: 4,
        marginBottom: 12,
        gap: 6,
    },
    dropdownToggleText: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: "600",
    },
    dropdownRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
        justifyContent: "flex-start",
    },
    dropdownOption: {
        backgroundColor: "#1f1f1f",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#333",
    },
    dropdownOptionActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    dropdownText: {
        color: COLORS.text,
        fontWeight: "600",
        fontSize: 13,
    },
    filterPanel: {
        backgroundColor: COLORS.panel,
        borderRadius: 12,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
    },
    filterItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    filterLabel: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: "500",
    },
    toggleButton: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    toggleActive: {
        backgroundColor: COLORS.green,
    },
    toggleInactive: {
        backgroundColor: "#333",
    },
    toggleText: {
        color: "#000",
        fontWeight: "600",
    },
    card: {
        backgroundColor: COLORS.card,
        padding: 18,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.card,
        elevation: 6,
    },
    image: {
        width: "100%",
        height: 160,
        borderRadius: 14,
        marginBottom: 12,
        backgroundColor: "#1c1c1c",
    },
    name: {
        fontSize: 20,
        color: COLORS.text,
        fontWeight: "700",
        marginBottom: 10,
    },
    detail: {
        color: COLORS.textMuted,
        fontSize: 14,
        marginRight: 8,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 6,
        marginBottom: 4,
        flexWrap: "wrap",
        gap: 10,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "nowrap",
    },
    vicinity: {
        color: "#888",
        fontSize: 13,
        marginTop: 10,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: "600",
    },
    open: {
        color: COLORS.green,
        backgroundColor: COLORS.openBg,
    },
    closed: {
        color: COLORS.accent,
        backgroundColor: COLORS.closedBg,
    },
    distanceTag: {
        fontSize: 13,
        color: "#ccc",
        backgroundColor: COLORS.tagBg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        overflow: "hidden",
        alignSelf: "flex-start",
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0d0d0d",
        paddingHorizontal: 20,
    },
    loadingText: {
        marginTop: 10,
        color: "#fff",
        fontSize: 16,
        fontWeight: "500",
        textAlign: "center",
    },
    emptyText: {
        textAlign: "center",
        color: "#888",
        fontSize: 16,
        marginTop: 40,
        lineHeight: 22,
    },
});
