"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Inner = dynamic(
  () =>
    Promise.all([import("./base-map"), import("react-map-gl/maplibre"), import("./meeting-pin")]).then(
      ([{ BaseMap }, { Marker }, { MeetingPin }]) =>
        function StaticPinMapInner(props: StaticPinMapProps) {
          return (
            <BaseMap
              ariaLabel={`Map showing ${props.label}`}
              className="h-56 rounded-2xl border sm:h-64"
              initialViewState={{ latitude: props.lat, longitude: props.lng, zoom: 15 }}
            >
              <Marker latitude={props.lat} longitude={props.lng} anchor="bottom">
                <MeetingPin firstName={props.firstName} lastName={props.lastName} seed={props.seed} upcoming={props.upcoming} />
              </Marker>
            </BaseMap>
          );
        },
    ),
  { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl sm:h-64" /> },
);

interface StaticPinMapProps {
  lat: number;
  lng: number;
  label: string;
  firstName: string;
  lastName: string;
  seed: string;
  upcoming?: boolean;
}

export function StaticPinMap(props: StaticPinMapProps) {
  return <Inner {...props} />;
}
