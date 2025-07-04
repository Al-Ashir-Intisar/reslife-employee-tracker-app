// src/components/MapModal.jsx
import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import styles from "./MapModal.module.css";

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  iconUrl: markerIcon.src ?? markerIcon,
  shadowUrl: markerShadow.src ?? markerShadow,
});

export default function MapModal({ open, onClose, coords, title }) {
  if (!open || !coords) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>
          ✖
        </button>
        <h3>{title}</h3>
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={17}
          scrollWheelZoom={false}
          style={{ height: 300, width: "100%", borderRadius: 12 }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Marker position={[coords.lat, coords.lng]} />
        </MapContainer>
      </div>
    </div>
  );
}
