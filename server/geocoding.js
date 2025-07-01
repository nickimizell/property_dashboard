const https = require('https');
const { URL } = require('url');

/**
 * Geocode an address using OpenStreetMap Nominatim API
 * Free service with usage limitations - be respectful
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') {
    return null;
  }

  // Clean up the address for better geocoding
  const cleanAddress = address.trim();
  
  // Add "St. Louis, MO" if not already specified for better accuracy
  const fullAddress = cleanAddress.includes('MO') || cleanAddress.includes('Missouri') 
    ? cleanAddress 
    : `${cleanAddress}, St. Louis, MO, USA`;

  const encodedAddress = encodeURIComponent(fullAddress);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=us`;

  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'OOTB-Property-Dashboard/1.0 (contact@ootbproperties.com)'
      }
    }, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const results = JSON.parse(data);
          
          if (results && results.length > 0) {
            const result = results[0];
            const coordinates = {
              lat: parseFloat(result.lat),
              lng: parseFloat(result.lon),
              accuracy: result.importance || 0.5,
              display_name: result.display_name
            };
            
            console.log(`✅ Geocoded: ${address} → ${coordinates.lat}, ${coordinates.lng}`);
            resolve(coordinates);
          } else {
            console.warn(`⚠️ No geocoding results for: ${address}`);
            resolve(null);
          }
        } catch (error) {
          console.error(`❌ Geocoding parse error for ${address}:`, error);
          resolve(null);
        }
      });
    });

    request.on('error', (error) => {
      console.error(`❌ Geocoding request error for ${address}:`, error);
      resolve(null);
    });

    request.setTimeout(5000, () => {
      console.error(`⏰ Geocoding timeout for ${address}`);
      request.destroy();
      resolve(null);
    });
  });
}

/**
 * Batch geocode multiple addresses with rate limiting
 * Nominatim has a usage policy of max 1 request per second
 */
async function batchGeocode(addresses) {
  const results = [];
  
  console.log(`🌍 Starting batch geocoding for ${addresses.length} addresses...`);
  
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    console.log(`📍 Geocoding ${i + 1}/${addresses.length}: ${address}`);
    
    const coordinates = await geocodeAddress(address);
    results.push({
      address,
      coordinates
    });
    
    // Rate limiting: wait 1.1 seconds between requests
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }
  
  console.log(`✅ Batch geocoding complete: ${results.filter(r => r.coordinates).length}/${results.length} successful`);
  return results;
}

/**
 * Update properties with real geocoded coordinates
 */
async function updatePropertyCoordinates(pool) {
  try {
    console.log('🗺️ Starting property coordinate updates...');
    
    // Get all properties that need geocoding
    const result = await pool.query(`
      SELECT id, address, coordinates_lat, coordinates_lng 
      FROM properties 
      WHERE coordinates_lat IS NULL OR coordinates_lng IS NULL OR 
            (coordinates_lat BETWEEN 38.6 AND 38.7 AND coordinates_lng BETWEEN -90.3 AND -90.1)
      ORDER BY address
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ All properties already have valid coordinates');
      return;
    }
    
    console.log(`📍 Found ${result.rows.length} properties needing geocoding`);
    
    // Batch geocode addresses
    const addresses = result.rows.map(row => row.address);
    const geocodedResults = await batchGeocode(addresses);
    
    // Update database with real coordinates
    for (let i = 0; i < result.rows.length; i++) {
      const property = result.rows[i];
      const geocoded = geocodedResults[i];
      
      if (geocoded.coordinates) {
        await pool.query(`
          UPDATE properties 
          SET coordinates_lat = $1, coordinates_lng = $2, updated_at = NOW()
          WHERE id = $3
        `, [
          geocoded.coordinates.lat,
          geocoded.coordinates.lng,
          property.id
        ]);
        
        console.log(`✅ Updated ${property.address}: ${geocoded.coordinates.lat}, ${geocoded.coordinates.lng}`);
      } else {
        console.warn(`⚠️ Failed to geocode ${property.address}`);
      }
    }
    
    console.log('🎉 Property coordinate updates complete!');
    
  } catch (error) {
    console.error('❌ Error updating property coordinates:', error);
    throw error;
  }
}

module.exports = {
  geocodeAddress,
  batchGeocode,
  updatePropertyCoordinates
};