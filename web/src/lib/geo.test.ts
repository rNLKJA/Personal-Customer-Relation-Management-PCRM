import { describe, expect, it } from "vitest";
import {
  boundsOf,
  formatCoords,
  formatDistance,
  haversineKm,
  isValidLatLng,
  nearestPlace,
  searchPlaces,
  MELBOURNE_CBD,
} from "./geo";
import { PLACES } from "./places";
import { photonLabel, nominatimLabel } from "./photon";
import { cleanLocation } from "./legacy/location";

describe("haversine", () => {
  it("measures known distances", () => {
    // Melbourne CBD -> Sydney CBD is ~714 km great-circle.
    expect(haversineKm(MELBOURNE_CBD, { lat: -33.8688, lng: 151.2093 })).toBeCloseTo(713.4, 0);
    expect(haversineKm(MELBOURNE_CBD, MELBOURNE_CBD)).toBe(0);
  });
  it("formats distances and coordinates", () => {
    expect(formatDistance(0.42)).toBe("420 m");
    expect(formatDistance(3.456)).toBe("3.5 km");
    expect(formatDistance(18.7)).toBe("19 km");
    expect(formatCoords({ lat: -37.8136, lng: 144.9631 }, 2)).toBe("37.81°S, 144.96°E");
  });
  it("validates coordinates", () => {
    expect(isValidLatLng({ lat: -37.8, lng: 144.9 })).toBe(true);
    expect(isValidLatLng({ lat: 122334545, lng: 52123456 })).toBe(false);
  });
  it("computes bounds", () => {
    expect(
      boundsOf([
        { lat: 1, lng: 2 },
        { lat: -1, lng: 5 },
      ]),
    ).toEqual([
      [2, -1],
      [5, 1],
    ]);
    expect(boundsOf([])).toBeNull();
  });
});

describe("bundled gazetteer", () => {
  it("has Melbourne suburbs and landmarks", () => {
    expect(PLACES.length).toBeGreaterThan(80);
    for (const p of PLACES) expect(haversineKm(MELBOURNE_CBD, p)).toBeLessThan(60);
  });
  it("searches offline by prefix", () => {
    expect(searchPlaces(PLACES, "state lib")[0]?.name).toBe("State Library Victoria");
    expect(searchPlaces(PLACES, "carlton")[0]?.name).toBe("Carlton");
    expect(searchPlaces(PLACES, "zzzz")).toEqual([]);
  });
  it("finds the nearest suburb", () => {
    expect(nearestPlace(PLACES, { lat: -37.7975, lng: 144.9601 }, ["suburb"])?.place.name).toBe(
      "Carlton",
    );
  });
});

describe("address formatting", () => {
  it("formats Photon features like the gazetteer", () => {
    expect(
      photonLabel({
        name: "State Library Victoria",
        housenumber: "328",
        street: "Swanston Street",
        city: "Melbourne",
        state: "Victoria",
        postcode: "3000",
        countrycode: "AU",
      }).label,
    ).toBe("State Library Victoria, 328 Swanston Street, Melbourne VIC 3000");
    expect(
      photonLabel({
        street: "Lygon Street",
        district: "Carlton",
        city: "Melbourne",
        state: "Victoria",
        countrycode: "AU",
      }).label,
    ).toBe("Lygon Street, Carlton VIC");
    expect(
      photonLabel({ name: "Eiffel Tower", city: "Paris", country: "France", countrycode: "FR" })
        .label,
    ).toBe("Eiffel Tower, Paris, France");
  });
  it("formats Nominatim reverse results", () => {
    expect(
      nominatimLabel({
        name: "La Trobe Reading Room",
        display_name: "La Trobe Reading Room, 328, Swanston Street, Melbourne",
        address: {
          house_number: "328",
          road: "Swanston Street",
          suburb: "Melbourne",
          city: "Melbourne",
          state: "Victoria",
          postcode: "3000",
          country_code: "au",
        },
      })?.label,
    ).toBe("La Trobe Reading Room, 328 Swanston Street, Melbourne VIC 3000");
  });
  it("cleanLocation strips the state/postcode like the original info window", () => {
    expect(cleanLocation("Carlton Gardens, Carlton VIC 3053")).toBe("Carlton Gardens, Carlton ");
    expect(cleanLocation("墨尔本大学 The University of Melbourne")).toBe(
      " The University of Melbourne",
    );
  });
});
