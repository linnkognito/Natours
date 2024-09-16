/* eslint-disable */
export const displayMap = (locations) => {
  const map = L.map('map', {
    scrollWheelZoom: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    crossOrigin: false,
  }).addTo(map);

  const points = [];
  const markers = [];

  locations.forEach((loc) => {
    // Switch coordinate order
    const latlng = loc.coordinates.reverse();
    // Add marker
    const marker = L.marker(latlng)
      .addTo(map)
      .bindPopup(`<p>Day ${loc.day}: ${loc.description}</p>`, {
        autoClose: false,
      });

    markers.push(marker);
    // Extract coordinates
    points.push(latlng);
  });

  // Have map zoomed in enough to display all our locations:
  const bounds = L.latLngBounds(points).pad(0.5);
  map.fitBounds(bounds);

  // Open all popups after markers are added:
  markers.forEach((marker) => {
    marker.openPopup();
  });
};
