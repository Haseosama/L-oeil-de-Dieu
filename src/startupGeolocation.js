/**
 * Best-effort "where am I" lookup used once, on launch, to fly the camera to
 * the visitor's own position instead of the Austin default.
 *
 * Two paths, picked at call time:
 *  - Under Capacitor (the Android app), the native Geolocation plugin talks
 *    to Play Services location directly — this works even though the app
 *    loads over plain HTTP on the LAN, where the browser's own
 *    `navigator.geolocation` would be blocked as an insecure context.
 *  - In an ordinary browser tab (dev server on localhost, or any desktop
 *    browser), `navigator.geolocation` is used directly.
 *
 * Every failure mode (no permission, no signal, timeout, plugin missing)
 * resolves to `null` rather than throwing — callers fall back to the
 * existing Austin default.
 */

/** @returns {Promise<{lat:number, lon:number}|null>} */
export async function getStartupPosition(timeoutMs = 8000) {
  try {
    if (globalThis.Capacitor?.isNativePlatform?.()) {
      return await getNativePosition(timeoutMs);
    }
    return await getBrowserPosition(timeoutMs);
  } catch {
    return null;
  }
}

async function getNativePosition(timeoutMs) {
  let Geolocation;
  try {
    ({ Geolocation } = await import('@capacitor/geolocation'));
  } catch {
    return null;
  }
  try {
    let status = await Geolocation.checkPermissions();
    if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
      status = await Geolocation.requestPermissions();
    }
    if (status.location !== 'granted' && status.coarseLocation !== 'granted') return null;
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: timeoutMs,
    });
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}

function getBrowserPosition(timeoutMs) {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    navigator.geolocation.getCurrentPosition(
      (position) => settle({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => settle(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
    );
    // Belt-and-suspenders: some WebViews never call either callback when
    // permission is silently denied, so the caller's launch flow needs its
    // own bound regardless of what the API promises.
    setTimeout(() => settle(null), timeoutMs + 500);
  });
}
