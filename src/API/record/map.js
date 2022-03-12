import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useLoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

// obtain user geolocation based on user search
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";
import "@reach/combobox/styles.css";

// import { formatRelative } from "date-fns";
import mapStyle from "./mapStyles";
// import { Info, LaptopWindows } from "@material-ui/icons";
import "./map.css";

import compass from "./compass.png";

const libraries = ["places"];
const mapContainerStyle = {
  width: "100%",
  height: "30vh",
};

const center = {
  lat: -37.7982,
  lng: 144.961,
};

const options = {
  styles: mapStyle,
  disableDefaultUI: true,
  zoomControl: true,
};

// return map component
const Map = ({ setLocation, setGeoCoords, geoLocation, text }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  var initLocation;
  if (isNaN(geoLocation.lat)) {
    initLocation = center;
  } else {
    initLocation = geoLocation;
  }

  console.log(initLocation);

  // console.log(geoLocation ,"geo" ,  "init " , initLocation)

  // set the address location
  const [address, setAddress] = useState({
    ...initLocation,
    text: text ? text : "The University of Melbourne",
  });
  const [selected, setSelected] = useState(null);

  // set the callback function
  const onMapClick = useCallback((event) => {
    fetchAddress(
      {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      },
      setAddress,
    );

    // console.log(selected, address);
  }, []);

  // pin the location
  const panTo = React.useCallback(({ lat, lng }) => {
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(16);
  }, []);

  // save map component
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // set react reference function
  const mapRef = useRef();

  useEffect(() => {
    // console.log(address);
    setGeoCoords({ lat: address.lat, lng: address.lng });
    setLocation(address.text);
  }, [address, selected, setGeoCoords, setLocation]);

  // error handling, check the google map is loading correctly
  if (loadError) return "Error loading maps";
  if (!isLoaded) return "loading map";

  // return component
  return (
    <div className="google-map-1">
      <React.Fragment>
        {/* <h3>IT project: group 4399</h3>
        <h4>
          Current Address Information: lat {address.lat} && lng {address.lng} &&
          Address:
          {address.text}
        </h4> */}

        {/* define the address search box and locate button  */}
        <div className="top-bar-1">
          <Search
            key={new Date().toISOString()}
            panTo={panTo}
            setAddress={setAddress}
            setLocation={setLocation}
            setGeoCoords={setGeoCoords}
          />
          <Locate panTo={panTo} setAddress={setAddress} />
        </div>

        {/* load google API libraries */}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={14}
          center={initLocation}
          options={options}
          onClick={onMapClick}
          onLoad={onMapLoad}
        >
          {/* create marker to pin the location */}
          <Marker
            position={address}
            icon={{
              url: "./google-maps.png",
              scaledSize: new window.google.maps.Size(50, 50),
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(15, 15),
            }}
            onClick={() => {
              setSelected(address);
            }}
          />

          {/* open up a info window when use click on it */}
          {selected ? (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div>
                <div>{selected.text}</div>
              </div>
            </InfoWindow>
          ) : null}
        </GoogleMap>
        {/* <div>Map</div> */}
        {/* <div>API KEY: {process.env.REACT_APP_GOOGLE_MAPS_API_KEY}</div> */}
      </React.Fragment>
    </div>
  );
};

export default Map;

// help user to locate its current geo location
const Locate = ({ panTo, setAddress }) => {
  return (
    <button
      className="locate"
      onClick={() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            let coord = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            const text = fetchAddress(coord, setAddress);

            panTo(coord);
            setAddress({
              ...coord,
              text: text,
            });
            // console.log({
            //   ...coord,
            //   text,
            // });
          },
          () => null,
          options,
        );
      }}
    >
      <img src={compass} alt="compass - locate" />
    </button>
  );
};

// define the search function
// this function should fetch the user input (address) then convert it to geolocation and pin it on the map
const Search = ({ panTo, setAddress, setGeoCoords, setLocation }) => {
  // generate variables and functions
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      location: { lat: () => -37.7982, lng: () => 144.961 },
      radius: 200 * 1000,
    },
  });

  // return the search box component
  return (
    // define the search box
    <div className="search">
      <Combobox
        onSelect={async (address) => {
          setValue(address, false);
          clearSuggestions(); // once selected, clear the suggestion

          try {
            const result = await getGeocode({ address });
            const { lat, lng } = await getLatLng(result[0]);

            panTo({ lat, lng });
            setAddress({ lat, lng, text: address });
            // console.log(address);
            setGeoCoords({ lat, lng });
            setLocation(address);
          } catch (err) {
            console.log("error");
          }
        }}
      >
        <ComboboxInput
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          disabled={!ready}
          placeholder="Search an address"
        />
        <ComboboxPopover>
          <ComboboxList>
            {status === "OK" &&
              data.map(({ id, description }) => {
                return (
                  <ComboboxOption key={id} value={description}></ComboboxOption>
                );
              })}
          </ComboboxList>
        </ComboboxPopover>
      </Combobox>
    </div>
  );
};

const fetchAddress = (position, setAddress) => {
  let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.lat},${position.lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
  fetch(url)
    .then((response) => response.json())
    .then((data) =>
      setAddress({ ...position, text: data.results[0].formatted_address }),
    );
};
