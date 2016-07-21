var pi = 3.14159265358979;
/* Ellipsoid model constants(actual values here are for WGS84) */
var smA = 6378137.0;
var smB = 6356752.314;
var UTMScaleFactor = 0.9996;
/*
 * degToRad
 *
 * Converts degrees to radians.
 *
 */
function degToRad(deg) {
	return (deg / 180.0 * pi);
}
/*
 * radToDeg
 *
 * Converts radians to degrees.
 *
 */
function radToDeg(rad) {
	return (rad / pi * 180.0);
}

/*
 * utmCentralMeridian
 *
 * Determines the central meridian for the given UTM zone.
 *
 * Inputs:
 *     zone - An integer value designating the UTM zone, range [1,60].
 *
 * Returns:
 *   The central meridian for the given UTM zone, in radians, or zero
 *   if the UTM zone parameter is outside the range [1,60].
 *   Range of the central meridian is the radian equivalent of [-177,+177].
 *
 */
function utmCentralMeridian(zone) {
	var cmeridian;
	cmeridian = degToRad(-183.0 + (zone * 6.0));
	return cmeridian;
}
/*
 * footpointLatitude
 *
 * Computes the footpoint latitude for use in converting transverse
 * Mercator coordinates to ellipsoidal coordinates.
 *
 * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
 *   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
 *
 * Inputs:
 *   y - The UTM northing coordinate, in meters.
 *
 * Returns:
 *   The footpoint latitude, in radians.
 *
 */
function footpointLatitude(y) {
	var y_, alpha_, beta_, gamma_, delta_, epsilon_, n;
	var result;
	/* Precalculate n(Eq. 10.18) */
	n = (smA - smB) / (smA + smB);
	/* Precalculate alpha_(Eq. 10.22) (Same as alpha in Eq. 10.17) */
	alpha_ = ((smA + smB) / 2.0) *
		(1 + (Math.pow(n, 2.0) / 4) + (Math.pow(n, 4.0) / 64));
	/* Precalculate y_(Eq. 10.23) */
	y_ = y / alpha_;
	/* Precalculate beta_(Eq. 10.22) */
	beta_ = (3.0 * n / 2.0) + (-27.0 * Math.pow(n, 3.0) / 32.0) +
		(269.0 * Math.pow(n, 5.0) / 512.0);
	/* Precalculate gamma_(Eq. 10.22) */
	gamma_ = (21.0 * Math.pow(n, 2.0) / 16.0) +
		(-55.0 * Math.pow(n, 4.0) / 32.0);
	/* Precalculate delta_(Eq. 10.22) */
	delta_ = (151.0 * Math.pow(n, 3.0) / 96.0) +
		(-417.0 * Math.pow(n, 5.0) / 128.0);
	/* Precalculate epsilon_(Eq. 10.22) */
	epsilon_ = (1097.0 * Math.pow(n, 4.0) / 512.0);
	/* Now calculate the sum of the series(Eq. 10.21) */
	result = y_ + (beta_ * Math.sin(2.0 * y_)) +
		(gamma_ * Math.sin(4.0 * y_)) +
		(delta_ * Math.sin(6.0 * y_)) +
		(epsilon_ * Math.sin(8.0 * y_));
	return result;
}

/*
 * mapXYToLatLon
 *
 * Converts x and y coordinates in the Transverse Mercator projection to
 * a latitude/longitude pair.  Note that Transverse Mercator is not
 * the same as UTM; a scale factor is required to convert between them.
 *
 * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
 *   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
 *
 * Inputs:
 *   x - The easting of the point, in meters.
 *   y - The northing of the point, in meters.
 *   lambda0 - Longitude of the central meridian to be used, in radians.
 *
 * Outputs:
 *   philambda - A 2-element containing the latitude and longitude
 *               in radians.
 *
 * Returns:
 *   The function does not return a value.
 *
 * Remarks:
 *   The local variables Nf, nuf2, tf, and tf2 serve the same purpose as
 *   N, nu2, t, and t2 in mapLatLonToXY, but they are computed with respect
 *   to the footpoint latitude phif.
 *
 *   x1frac, x2frac, x2poly, x3poly, etc. are to enhance readability and
 *   to optimize computations.
 *
 */
function mapXYToLatLon(x, y, lambda0) {
	var phif, Nf, Nfpow, nuf2, ep2, tf, tf2, tf4, cf;
	var x1frac, x2frac, x3frac, x4frac, x5frac, x6frac, x7frac, x8frac;
	var x2poly, x3poly, x4poly, x5poly, x6poly, x7poly, x8poly;
	/* Get the value of phif, the footpoint latitude. */
	phif = footpointLatitude(y);
	var philambda = [];
	/* Precalculate ep2 */
	ep2 = (Math.pow(smA, 2.0) - Math.pow(smB, 2.0)) /
		Math.pow(smB, 2.0);
	/* Precalculate cos(phif) */
	cf = Math.cos(phif);
	/* Precalculate nuf2 */
	nuf2 = ep2 * Math.pow(cf, 2.0);
	/* Precalculate Nf and initialize Nfpow */
	Nf = Math.pow(smA, 2.0) / (smB * Math.sqrt(1 + nuf2));
	Nfpow = Nf;
	/* Precalculate tf */
	tf = Math.tan(phif);
	tf2 = tf * tf;
	tf4 = tf2 * tf2;
	/* Precalculate fractional coefficients for x**n in the equations
	below to simplify the expressions for latitude and longitude. */
	x1frac = 1.0 / (Nfpow * cf);
	Nfpow *= Nf; /* now equals Nf**2) */
	x2frac = tf / (2.0 * Nfpow);
	Nfpow *= Nf; /* now equals Nf**3) */
	x3frac = 1.0 / (6.0 * Nfpow * cf);
	Nfpow *= Nf; /* now equals Nf**4) */
	x4frac = tf / (24.0 * Nfpow);
	Nfpow *= Nf; /* now equals Nf**5) */
	x5frac = 1.0 / (120.0 * Nfpow * cf);
	Nfpow *= Nf; /* now equals Nf**6) */
	x6frac = tf / (720.0 * Nfpow);
	Nfpow *= Nf; /* now equals Nf**7) */
	x7frac = 1.0 / (5040.0 * Nfpow * cf);
	Nfpow *= Nf; /* now equals Nf**8) */
	x8frac = tf / (40320.0 * Nfpow);
	/* Precalculate polynomial coefficients for x**n.
	-- x**1 does not have a polynomial coefficient. */
	x2poly = -1.0 - nuf2;
	x3poly = -1.0 - 2 * tf2 - nuf2;
	x4poly = 5.0 + 3.0 * tf2 + 6.0 * nuf2 - 6.0 * tf2 * nuf2 -
		3.0 * (nuf2 * nuf2) - 9.0 * tf2 * (nuf2 * nuf2);
	x5poly = 5.0 + 28.0 * tf2 + 24.0 * tf4 + 6.0 * nuf2 + 8.0 * tf2 * nuf2;
	x6poly = -61.0 - 90.0 * tf2 - 45.0 * tf4 - 107.0 * nuf2 +
		162.0 * tf2 * nuf2;
	x7poly = -61.0 - 662.0 * tf2 - 1320.0 * tf4 - 720.0 * (tf4 * tf2);
	x8poly = 1385.0 + 3633.0 * tf2 + 4095.0 * tf4 + 1575 * (tf4 * tf2);
	/* Calculate latitude */
	philambda[0] = phif + x2frac * x2poly * (x * x) +
		x4frac * x4poly * Math.pow(x, 4.0) +
		x6frac * x6poly * Math.pow(x, 6.0) +
		x8frac * x8poly * Math.pow(x, 8.0);
	/* Calculate longitude */
	philambda[1] = lambda0 + x1frac * x +
		x3frac * x3poly * Math.pow(x, 3.0) +
		x5frac * x5poly * Math.pow(x, 5.0) +
		x7frac * x7poly * Math.pow(x, 7.0);
	philambda[0] = radToDeg(philambda[0]);
	philambda[1] = radToDeg(philambda[1]);
	// document.frmConverter.txtLongitude.value = radToDeg(latlon[1]);
	// document.frmConverter.txtLatitude.value = radToDeg(latlon[0]);
	return philambda;
}

/*
 * UTMXYToLatLon
 *
 * Converts x and y coordinates in the Universal Transverse Mercator
 * projection to a latitude/longitude pair.
 *
 * Inputs:
 *	easting - The easting of the point, in meters.
 *	northing - The northing of the point, in meters.
 *	zone - The UTM zone in which the point lies.
 *	idSouthHemi - True if the point is in the southern hemisphere;
 *               false otherwise.
 *
 * Outputs:
 *	latlon - A 2-element array containing the latitude and
 *            longitude of the point, in radians.
 *
 * Returns:
 *	The function does not return a value.
 *
 */
module.exports.utmToLatLon = function(easting, northing, zone, isSouthHemi) {
	var cmeridian;
	easting -= 500000.0;
	easting /= UTMScaleFactor;
	/* If in southern hemisphere, adjust y accordingly. */
	if (isSouthHemi) {
		northing -= 10000000.0;
		console.log('southhemisphere');
	}
	northing /= UTMScaleFactor;
	var latlon = [];
	cmeridian = utmCentralMeridian(zone);
	latlon = mapXYToLatLon(easting, northing, cmeridian);
	return latlon;
};
