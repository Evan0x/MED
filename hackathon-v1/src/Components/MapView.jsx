import { useEffect, useMemo, useRef, useState } from 'react';
import { haversineMeters } from '../../api/_lib/geo.js';
import { CATEGORY_MARKER, escapeHtml, placesToGeoJSON, viewportFromMap } from '../location/markers';
import { ensureMapWorker, Map as MapLibreMap, Marker, Popup } from '../location/mapEngine';
import { getPlaceLatLng } from '../location/place';
import { mapStyleConfig } from '../location/tiles';

const SOURCE_ID = 'places';
const CLUSTER_LAYER = 'places-clusters';
const POINT_LAYER = 'places-points';
const SELECTED_LAYER = 'places-selected';

function addPlaceLayers(map, accent) {
  if (map.getSource(SOURCE_ID)) return;

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: placesToGeoJSON([]),
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 44,
  });

  map.addLayer({
    id: CLUSTER_LAYER,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': accent,
      'circle-opacity': 0.92,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        16, 8,
        20, 20,
        26,
      ],
    },
  });

  map.addLayer({
    id: POINT_LAYER,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['coalesce', ['get', 'color'], '#64748b'],
      'circle-radius': ['case', ['==', ['get', 'selected'], true], 11, 7.5],
      'circle-stroke-width': ['case', ['==', ['get', 'selected'], true], 3, 2],
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.96,
    },
  });

  map.addLayer({
    id: SELECTED_LAYER,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], true]],
    paint: {
      'circle-color': 'rgba(15, 118, 110, 0.18)',
      'circle-radius': 20,
      'circle-stroke-width': 0,
    },
  });
}

function popupHtml(place) {
  const category = CATEGORY_MARKER[place.categories?.[0]]?.label;
  const bits = [
    `<strong>${escapeHtml(place.name)}</strong>`,
    category ? `<span>${escapeHtml(category)}</span>` : '',
    place.vicinity ? `<p>${escapeHtml(place.vicinity)}</p>` : '',
  ].filter(Boolean);
  return `<div class="map-popup-card">${bits.join('')}</div>`;
}

const MapView = ({
  center,
  places = [],
  selectedPlace,
  onSelectPlace,
  onViewportChange,
  onLocateMe,
  accent = '#0f766e',
  dark = false,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const skipMoveRef = useRef(false);
  const originRef = useRef(center);
  const placesByIdRef = useRef(new Map());
  const onSelectRef = useRef(onSelectPlace);
  const onViewportRef = useRef(onViewportChange);
  const selectedIdRef = useRef(selectedPlace?.place_id || selectedPlace?.id);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const style = useMemo(() => mapStyleConfig(dark), [dark]);
  const selectedId = selectedPlace?.place_id || selectedPlace?.id;

  useEffect(() => { onSelectRef.current = onSelectPlace; }, [onSelectPlace]);
  useEffect(() => { onViewportRef.current = onViewportChange; }, [onViewportChange]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    placesByIdRef.current = new Map((places || []).map((place) => [place.place_id || place.id, place]));
  }, [places]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    ensureMapWorker();
    let cancelled = false;
    let map;

    try {
      map = new MapLibreMap({
        container: node,
        style: style.url,
        center: [center.lng, center.lat],
        zoom: 13.2,
        attributionControl: {
          compact: true,
          customAttribution: style.attribution,
        },
        pitchWithRotate: false,
      });
    } catch (err) {
      const message = err?.message || 'Map failed to load.';
      queueMicrotask(() => setLoadError(message));
      return undefined;
    }

    mapRef.current = map;

    const showPlacePopup = (place) => {
      const coords = getPlaceLatLng(place);
      if (!coords || !map) return;
      popupRef.current?.remove();
      popupRef.current = new Popup({
        closeButton: false,
        offset: 14,
        className: 'map-popup',
      })
        .setLngLat([coords.lng, coords.lat])
        .setHTML(popupHtml(place))
        .addTo(map);
    };

    const onLoad = () => {
      if (cancelled) return;
      addPlaceLayers(map, accent);
      const userEl = document.createElement('div');
      userEl.className = 'user-location-marker';
      userEl.setAttribute('aria-label', 'Your location');
      userMarkerRef.current = new Marker({ element: userEl, anchor: 'center' })
        .setLngLat([center.lng, center.lat])
        .addTo(map);
      map.getSource(SOURCE_ID)?.setData(
        placesToGeoJSON([...placesByIdRef.current.values()], selectedIdRef.current),
      );
      setReady(true);
      setLoadError('');
    };

    const onError = (event) => {
      if (cancelled) return;
      const message = event?.error?.message || event?.error?.statusText;
      if (message) setLoadError('Map tiles could not be loaded. Results are still available in the list.');
    };

    const onMoveEnd = () => {
      if (skipMoveRef.current) {
        skipMoveRef.current = false;
        return;
      }
      onViewportRef.current?.(viewportFromMap(map));
    };

    const onClusterClick = (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map.getSource(SOURCE_ID);
      if (clusterId == null || !source?.getClusterExpansionZoom) return;
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        skipMoveRef.current = true;
        map.easeTo({ center: feature.geometry.coordinates, zoom });
      }).catch(() => {});
    };

    const onPointClick = (event) => {
      const id = event.features?.[0]?.properties?.id;
      const place = placesByIdRef.current.get(id);
      if (!place) return;
      onSelectRef.current?.(place);
      showPlacePopup(place);
    };

    map.on('load', onLoad);
    map.on('error', onError);
    map.on('moveend', onMoveEnd);
    map.on('click', CLUSTER_LAYER, onClusterClick);
    map.on('click', POINT_LAYER, onPointClick);
    map.on('mouseenter', POINT_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', POINT_LAYER, () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', CLUSTER_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', CLUSTER_LAYER, () => { map.getCanvas().style.cursor = ''; });

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Map is created once per style URL; data updates happen in later effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style.url]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(SOURCE_ID);
    source?.setData?.(placesToGeoJSON(places, selectedId));
  }, [places, selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const coords = getPlaceLatLng(selectedPlace);
    if (!map || !ready || !coords) return;
    skipMoveRef.current = true;
    map.flyTo({
      center: [coords.lng, coords.lat],
      zoom: Math.max(map.getZoom?.() || 13, 15),
      duration: 650,
    });
    popupRef.current?.remove();
    popupRef.current = new Popup({ closeButton: false, offset: 14, className: 'map-popup' })
      .setLngLat([coords.lng, coords.lat])
      .setHTML(popupHtml(selectedPlace))
      .addTo(map);
  }, [selectedPlace, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !center) return;
    const previous = originRef.current;
    originRef.current = center;
    if (previous && haversineMeters(previous.lat, previous.lng, center.lat, center.lng) < 80) return;
    skipMoveRef.current = true;
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: Math.max(map.getZoom?.() || 13, 13.2),
      duration: 700,
    });
    userMarkerRef.current?.setLngLat?.([center.lng, center.lat]);
  }, [center, ready]);

  const zoomBy = (direction) => {
    const map = mapRef.current;
    if (!map) return;
    skipMoveRef.current = true;
    if (direction > 0) map.zoomIn?.({ duration: 200 });
    else map.zoomOut?.({ duration: 200 });
  };

  return (
    <div className="map-shell" data-testid="map">
      <div ref={containerRef} className="map-canvas" data-testid="map-canvas" />
      {loadError && (
        <div className="map-error" role="status">{loadError}</div>
      )}
      <div className="map-controls" data-testid="map-controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(-1)}>−</button>
        <button type="button" aria-label="Locate me" onClick={() => onLocateMe?.()}>
          <span aria-hidden="true">◎</span>
        </button>
      </div>
    </div>
  );
};

export default MapView;
