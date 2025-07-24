/**
 * Property Matching Engine
 * Matches incoming emails and documents to existing properties in the database
 */

const { Pool } = require('pg');

class PropertyMatcher {
    constructor(dbPool) {
        this.db = dbPool;
        
        // Confidence thresholds for different match types
        this.confidenceThresholds = {
            exact_address: 0.95,
            mls_number: 0.99,
            loan_number: 0.95,
            client_name_exact: 0.90,
            client_name_partial: 0.70,
            fuzzy_address: 0.60,
            combined_indicators: 0.80
        };

        // Minimum confidence for auto-matching (below this requires manual review)
        this.autoMatchThreshold = 0.75;

        console.log('🎯 Property Matcher initialized');
    }

    /**
     * Find the best property match for an email and its extracted data
     */
    async findPropertyMatch(emailData, extractedData) {
        console.log(`🔍 Finding property match for email: "${emailData.subject}"`);
        
        const matches = [];

        try {
            // 1. Try exact MLS number matching (highest confidence)
            if (extractedData.mlsNumbers && extractedData.mlsNumbers.length > 0) {
                const mlsMatches = await this.matchByMLSNumber(extractedData.mlsNumbers);
                matches.push(...mlsMatches);
            }

            // 2. Try loan number matching (high confidence)
            if (extractedData.loanNumbers && extractedData.loanNumbers.length > 0) {
                const loanMatches = await this.matchByLoanNumber(extractedData.loanNumbers);
                matches.push(...loanMatches);
            }

            // 3. Try exact address matching (high confidence)
            if (extractedData.addresses && extractedData.addresses.length > 0) {
                const addressMatches = await this.matchByExactAddress(extractedData.addresses);
                matches.push(...addressMatches);
            }

            // 4. Try client name matching (medium confidence)
            if (extractedData.clientNames && extractedData.clientNames.length > 0) {
                const clientMatches = await this.matchByClientName(extractedData.clientNames);
                matches.push(...clientMatches);
            }

            // 5. Try fuzzy address matching (lower confidence)
            if (extractedData.addresses && extractedData.addresses.length > 0) {
                const fuzzyMatches = await this.matchByFuzzyAddress(extractedData.addresses);
                matches.push(...fuzzyMatches);
            }

            // 6. Try combined indicator matching
            const combinedMatches = await this.matchByCombinedIndicators(emailData, extractedData);
            matches.push(...combinedMatches);

            // Remove duplicates and sort by confidence
            const uniqueMatches = this.deduplicateMatches(matches);
            const sortedMatches = uniqueMatches.sort((a, b) => b.confidence - a.confidence);

            const bestMatch = sortedMatches[0] || null;

            if (bestMatch) {
                console.log(`✅ Best match found: ${bestMatch.property.address} (confidence: ${(bestMatch.confidence * 100).toFixed(1)}%)`);
                
                // Log match details
                console.log(`📊 Match method: ${bestMatch.method}, Property ID: ${bestMatch.property.id}`);
                
                return {
                    property: bestMatch.property,
                    confidence: bestMatch.confidence,
                    method: bestMatch.method,
                    details: bestMatch.details,
                    requiresManualReview: bestMatch.confidence < this.autoMatchThreshold,
                    allMatches: sortedMatches.slice(0, 5) // Return top 5 for manual review
                };
            } else {
                console.log('❌ No property matches found');
                return null;
            }

        } catch (error) {
            console.error('❌ Error in property matching:', error);
            throw error;
        }
    }

    /**
     * Match by MLS number (highest confidence)
     */
    async matchByMLSNumber(mlsNumbers) {
        const matches = [];

        for (const mlsNumber of mlsNumbers) {
            try {
                // Clean MLS number (remove common prefixes/suffixes)
                const cleanMLS = this.cleanMLSNumber(mlsNumber);
                
                // Search in property notes, address, or other fields where MLS might be mentioned
                const result = await this.db.query(`
                    SELECT *, similarity(notes, $1) as sim
                    FROM properties 
                    WHERE notes ILIKE $2 
                       OR address ILIKE $2
                       OR loan_number ILIKE $2
                    ORDER BY sim DESC
                    LIMIT 3
                `, [cleanMLS, `%${cleanMLS}%`]);

                for (const property of result.rows) {
                    matches.push({
                        property: property,
                        confidence: this.confidenceThresholds.mls_number,
                        method: 'mls_number',
                        details: {
                            matchedMLS: cleanMLS,
                            foundIn: this.findMLSLocation(property, cleanMLS)
                        }
                    });
                }
            } catch (error) {
                console.error(`❌ Error matching MLS ${mlsNumber}:`, error);
            }
        }

        return matches;
    }

    /**
     * Match by loan number
     */
    async matchByLoanNumber(loanNumbers) {
        const matches = [];

        for (const loanNumber of loanNumbers) {
            try {
                const result = await this.db.query(`
                    SELECT * FROM properties 
                    WHERE loan_number = $1
                `, [loanNumber]);

                for (const property of result.rows) {
                    matches.push({
                        property: property,
                        confidence: this.confidenceThresholds.loan_number,
                        method: 'loan_number',
                        details: {
                            matchedLoanNumber: loanNumber
                        }
                    });
                }
            } catch (error) {
                console.error(`❌ Error matching loan number ${loanNumber}:`, error);
            }
        }

        return matches;
    }

    /**
     * Match by exact address
     */
    async matchByExactAddress(addresses) {
        const matches = [];

        for (const address of addresses) {
            try {
                const cleanAddress = this.normalizeAddress(address);
                
                const result = await this.db.query(`
                    SELECT * FROM properties 
                    WHERE LOWER(TRIM(address)) = LOWER(TRIM($1))
                `, [cleanAddress]);

                for (const property of result.rows) {
                    matches.push({
                        property: property,
                        confidence: this.confidenceThresholds.exact_address,
                        method: 'exact_address',
                        details: {
                            searchedAddress: address,
                            normalizedAddress: cleanAddress,
                            matchedAddress: property.address
                        }
                    });
                }
            } catch (error) {
                console.error(`❌ Error matching address ${address}:`, error);
            }
        }

        return matches;
    }

    /**
     * Match by client name
     */
    async matchByClientName(clientNames) {
        const matches = [];

        for (const clientName of clientNames) {
            try {
                // Try exact match first
                let result = await this.db.query(`
                    SELECT * FROM properties 
                    WHERE LOWER(TRIM(client_name)) = LOWER(TRIM($1))
                `, [clientName]);

                for (const property of result.rows) {
                    matches.push({
                        property: property,
                        confidence: this.confidenceThresholds.client_name_exact,
                        method: 'client_name_exact',
                        details: {
                            searchedName: clientName,
                            matchedName: property.client_name
                        }
                    });
                }

                // Try partial match if no exact match
                if (result.rows.length === 0) {
                    result = await this.db.query(`
                        SELECT *, similarity(client_name, $1) as sim
                        FROM properties 
                        WHERE similarity(client_name, $1) > 0.3
                        ORDER BY sim DESC
                        LIMIT 3
                    `, [clientName]);

                    for (const property of result.rows) {
                        const confidence = Math.min(
                            property.sim * this.confidenceThresholds.client_name_partial,
                            this.confidenceThresholds.client_name_partial
                        );

                        matches.push({
                            property: property,
                            confidence: confidence,
                            method: 'client_name_partial',
                            details: {
                                searchedName: clientName,
                                matchedName: property.client_name,
                                similarity: property.sim
                            }
                        });
                    }
                }
            } catch (error) {
                console.error(`❌ Error matching client name ${clientName}:`, error);
            }
        }

        return matches;
    }

    /**
     * Match by fuzzy address matching
     */
    async matchByFuzzyAddress(addresses) {
        const matches = [];

        for (const address of addresses) {
            try {
                const normalizedAddress = this.normalizeAddress(address);
                
                // Use PostgreSQL's similarity function for fuzzy matching
                let result;
                try {
                    result = await this.db.query(`
                        SELECT *, similarity(address, $1) as sim
                        FROM properties 
                        WHERE similarity(address, $1) > 0.3
                        ORDER BY sim DESC
                        LIMIT 5
                    `, [normalizedAddress]);
                } catch (similarityError) {
                    console.log(`⚠️ PostgreSQL similarity function not available for ${address}, using ILIKE fallback`);
                    
                    // Fallback to ILIKE matching
                    result = await this.db.query(`
                        SELECT *, 0.6 as sim
                        FROM properties 
                        WHERE UPPER(address) LIKE UPPER($1)
                           OR UPPER(address) LIKE UPPER($2)
                        ORDER BY CASE 
                            WHEN UPPER(address) = UPPER($1) THEN 1
                            ELSE 2
                        END
                        LIMIT 5
                    `, [normalizedAddress, `%${normalizedAddress}%`]);
                }

                for (const property of result.rows) {
                    const confidence = Math.min(
                        property.sim * this.confidenceThresholds.fuzzy_address,
                        this.confidenceThresholds.fuzzy_address
                    );

                    matches.push({
                        property: property,
                        confidence: confidence,
                        method: 'fuzzy_address',
                        details: {
                            searchedAddress: address,
                            normalizedAddress: normalizedAddress,
                            matchedAddress: property.address,
                            similarity: property.sim
                        }
                    });
                }
            } catch (error) {
                console.error(`❌ Error in fuzzy address matching for ${address}:`, error);
            }
        }

        return matches;
    }

    /**
     * Match by combined indicators (agent name + partial address, etc.)
     */
    async matchByCombinedIndicators(emailData, extractedData) {
        const matches = [];

        try {
            // Look for matches based on multiple weak indicators
            const conditions = [];
            const params = [];
            let paramIndex = 1;

            // Check if email is from known agent
            if (extractedData.agentNames && extractedData.agentNames.length > 0) {
                const agentConditions = extractedData.agentNames.map(agent => {
                    params.push(`%${agent}%`);
                    return `selling_agent ILIKE $${paramIndex++}`;
                });
                conditions.push(`(${agentConditions.join(' OR ')})`);
            }

            // Check for partial address matches in combination with other indicators
            if (extractedData.addresses && extractedData.addresses.length > 0) {
                for (const address of extractedData.addresses) {
                    // Extract street name/number for partial matching
                    const streetParts = this.extractAddressParts(address);
                    if (streetParts.streetName || streetParts.streetNumber) {
                        if (streetParts.streetNumber) {
                            params.push(`%${streetParts.streetNumber}%`);
                            conditions.push(`address ILIKE $${paramIndex++}`);
                        }
                        if (streetParts.streetName) {
                            params.push(`%${streetParts.streetName}%`);
                            conditions.push(`address ILIKE $${paramIndex++}`);
                        }
                    }
                }
            }

            if (conditions.length >= 2) {
                const query = `
                    SELECT * FROM properties 
                    WHERE ${conditions.join(' AND ')}
                    LIMIT 3
                `;

                const result = await this.db.query(query, params);

                for (const property of result.rows) {
                    matches.push({
                        property: property,
                        confidence: this.confidenceThresholds.combined_indicators,
                        method: 'combined_indicators',
                        details: {
                            matchedIndicators: conditions.length,
                            agentNames: extractedData.agentNames,
                            addressParts: extractedData.addresses
                        }
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error in combined indicators matching:', error);
        }

        return matches;
    }

    /**
     * Remove duplicate matches (same property from different methods)
     */
    deduplicateMatches(matches) {
        const seen = new Set();
        const unique = [];

        for (const match of matches) {
            const key = match.property.id;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(match);
            } else {
                // If we've seen this property, keep the match with higher confidence
                const existingMatch = unique.find(m => m.property.id === key);
                if (match.confidence > existingMatch.confidence) {
                    const index = unique.indexOf(existingMatch);
                    unique[index] = match;
                }
            }
        }

        return unique;
    }

    /**
     * Utility functions for text processing
     */
    cleanMLSNumber(mlsNumber) {
        return mlsNumber.replace(/[^\d]/g, ''); // Remove all non-digits
    }

    normalizeAddress(address) {
        return address
            .toLowerCase()
            .replace(/\b(street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|boulevard|blvd)\b/g, (match) => {
                const abbrevs = {
                    'street': 'st', 'avenue': 'ave', 'road': 'rd', 'lane': 'ln',
                    'drive': 'dr', 'court': 'ct', 'boulevard': 'blvd'
                };
                return abbrevs[match] || match;
            })
            .replace(/\s+/g, ' ')
            .trim();
    }

    extractAddressParts(address) {
        const match = address.match(/^(\d+)\s+(.+?)(?:\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|boulevard|blvd))?/i);
        
        return {
            streetNumber: match ? match[1] : null,
            streetName: match ? match[2] : null,
            streetType: match ? match[3] : null
        };
    }

    findMLSLocation(property, mlsNumber) {
        if (property.notes && property.notes.includes(mlsNumber)) {
            return 'notes';
        } else if (property.address && property.address.includes(mlsNumber)) {
            return 'address';
        } else if (property.loan_number && property.loan_number.includes(mlsNumber)) {
            return 'loan_number';
        }
        return 'unknown';
    }

    /**
     * Update email record with property match results
     */
    async updateEmailWithMatch(emailQueueId, matchResult) {
        try {
            if (matchResult) {
                await this.db.query(`
                    UPDATE email_processing_queue 
                    SET matched_property_id = $1,
                        match_confidence = $2,
                        match_method = $3,
                        match_details = $4,
                        manual_review_required = $5,
                        updated_at = NOW()
                    WHERE id = $6
                `, [
                    matchResult.property.id,
                    matchResult.confidence,
                    matchResult.method,
                    JSON.stringify(matchResult.details),
                    matchResult.requiresManualReview,
                    emailQueueId
                ]);

                console.log(`📊 Updated email ${emailQueueId} with property match: ${matchResult.property.address}`);
            } else {
                await this.db.query(`
                    UPDATE email_processing_queue 
                    SET match_confidence = 0,
                        match_method = 'no_match',
                        manual_review_required = true,
                        manual_review_reason = 'Property-related email but no matching property found',
                        updated_at = NOW()
                    WHERE id = $1
                `, [emailQueueId]);

                console.log(`❌ Updated email ${emailQueueId} with no match found`);
            }
        } catch (error) {
            console.error('❌ Error updating email with match:', error);
            throw error;
        }
    }

    /**
     * Get matching statistics
     */
    async getMatchingStats() {
        try {
            const result = await this.db.query(`
                SELECT 
                    COUNT(*) as total_processed,
                    COUNT(*) FILTER (WHERE matched_property_id IS NOT NULL) as matched,
                    COUNT(*) FILTER (WHERE match_confidence >= 0.75) as auto_matched,
                    COUNT(*) FILTER (WHERE manual_review_required = true) as manual_review_needed,
                    AVG(match_confidence) FILTER (WHERE matched_property_id IS NOT NULL) as avg_confidence,
                    COUNT(DISTINCT matched_property_id) as unique_properties_matched
                FROM email_processing_queue 
                WHERE is_property_related = true 
                  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            `);

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error getting matching stats:', error);
            return null;
        }
    }
}

module.exports = PropertyMatcher;