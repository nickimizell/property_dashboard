#!/usr/bin/env python3
import pandas as pd
import json
import re
from datetime import datetime
import uuid

def parse_trident_properties():
    """Parse the main List of Properties tab into our property format"""
    
    print("🏠 Parsing Trident Properties data...")
    
    # Read the main properties list
    df = pd.read_excel("Listed_properties/Trident Properties.xlsx", sheet_name="List of Properties", header=1)
    
    print(f"📊 Found {len(df)} properties in main list")
    print(f"Columns: {list(df.columns)}")
    
    properties = []
    tasks = []
    
    # Map the column names
    column_map = {
        'Basis Points/Loan number': 'loan_info',
        'Status': 'status',
        'Address': 'address',
        'Closing': 'closing_date',
        'UC $': 'under_contract_price',
        'Single/Multi': 'property_type_raw',
        'Current List': 'current_list_price',
        'Starting List Price': 'starting_list_price',
        'Listing Date': 'listing_date',
        'Rented': 'is_rented',
        'Rent': 'rent_amount'
    }
    
    for index, row in df.iterrows():
        try:
            # Skip empty rows
            if pd.isna(row.get('Address')) or not str(row.get('Address')).strip():
                continue
            
            # Generate property ID
            property_id = str(uuid.uuid4())
            
            # Parse address
            address = str(row['Address']).strip()
            if not address or address.lower() == 'nan':
                continue
            
            # Parse status
            status = str(row.get('Status', 'Active')).strip()
            if status.lower() == 'pre':
                status = 'Hold'  # Pre-listing is essentially on hold
            elif status.lower() == 'uc' or 'contract' in status.lower():
                status = 'Under Contract'
            elif status.lower() == 'nan' or not status:
                status = 'Active'
            
            # Parse loan info and basis points
            loan_info = str(row.get('Basis Points/Loan number', '')).strip()
            loan_number = None
            basis_points = None
            
            if loan_info and loan_info.lower() != 'nan':
                # Extract loan number
                loan_match = re.search(r'loan #?(\d+)', loan_info, re.IGNORECASE)
                if loan_match:
                    loan_number = f"LN-{loan_match.group(1)}"
                
                # Extract basis points/cost
                basis_match = re.search(r'basis.*?[\$]?([\d,]+)', loan_info, re.IGNORECASE)
                if basis_match:
                    try:
                        basis_points = int(float(basis_match.group(1).replace(',', '')))
                    except:
                        pass
            
            # Parse property type
            prop_type_raw = str(row.get('Single/Multi', 'Single')).strip().lower()
            if 'single' in prop_type_raw:
                property_type = 'Single Family'
            elif 'duplex' in prop_type_raw or '2 family' in prop_type_raw:
                property_type = 'Duplex'
            elif 'family' in prop_type_raw or 'multi' in prop_type_raw:
                property_type = 'Commercial'  # Multi-family
            else:
                property_type = 'Single Family'
            
            # Determine workflow type (assume Investor for multi-family, Conventional for single)
            workflow_type = 'Investor' if property_type in ['Duplex', 'Commercial'] else 'Conventional'
            
            # Parse prices
            current_price = parse_price(row.get('Current List'))
            starting_price = parse_price(row.get('Starting List Price'))
            under_contract_price = parse_price(row.get('UC $'))
            
            # Parse dates
            listing_date = parse_date(row.get('Listing Date'))
            closing_date = parse_date(row.get('Closing'))
            
            # Parse rental info
            is_rented = str(row.get('Rented', '')).strip().lower()
            is_rented = is_rented in ['y', 'yes', 'true', '1']
            
            # Geocoding (rough estimate for St. Louis area)
            coordinates = get_stl_coordinates(address)
            
            # Create property object
            property_obj = {
                'id': property_id,
                'address': address,
                'clientName': 'Trident Properties',  # Default client
                'sellingAgent': 'Trident Team',  # Default agent
                'loanNumber': loan_number,
                'basisPoints': basis_points,
                'closingDate': closing_date,
                'underContractPrice': under_contract_price,
                'startingListPrice': starting_price,
                'currentListPrice': current_price or starting_price,
                'status': status,
                'propertyType': property_type,
                'workflowType': workflow_type,
                'isRented': is_rented,
                'notes': f"Imported from Trident Properties spreadsheet. Original loan info: {loan_info}",
                'coordinates': coordinates,
                'listingDate': listing_date,
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat()
            }
            
            properties.append(property_obj)
            
            # Generate basic tasks based on status
            property_tasks = generate_tasks_for_property(property_obj)
            tasks.extend(property_tasks)
            
            print(f"✅ {address} - {status} - {property_type} ({workflow_type})")
            
        except Exception as e:
            print(f"❌ Error processing row {index}: {e}")
            continue
    
    print(f"\n🎉 Successfully parsed {len(properties)} properties and generated {len(tasks)} tasks!")
    
    # Save the data
    with open('trident_properties.json', 'w') as f:
        json.dump({'properties': properties, 'tasks': tasks}, f, indent=2, default=str)
    
    print("💾 Saved to trident_properties.json")
    
    # Print summary
    status_counts = {}
    for prop in properties:
        status = prop['status']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\n📊 Property Status Summary:")
    for status, count in status_counts.items():
        print(f"   - {status}: {count} properties")
    
    return properties, tasks

def parse_price(price_value):
    """Parse price from various formats"""
    if pd.isna(price_value) or not str(price_value).strip():
        return None
    
    price_str = str(price_value).replace('$', '').replace(',', '').strip()
    
    # Handle 'K' notation
    if price_str.lower().endswith('k'):
        try:
            return int(float(price_str[:-1]) * 1000)
        except:
            return None
    
    try:
        return int(float(price_str))
    except:
        return None

def parse_date(date_value):
    """Parse date from various formats"""
    if pd.isna(date_value):
        return None
    
    if isinstance(date_value, datetime):
        return date_value.strftime('%Y-%m-%d')
    
    date_str = str(date_value).strip()
    if not date_str or date_str.lower() == 'nan':
        return None
    
    # Try to parse common date formats
    for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', '%Y/%m/%d']:
        try:
            parsed_date = datetime.strptime(date_str.split()[0], fmt)
            return parsed_date.strftime('%Y-%m-%d')
        except:
            continue
    
    return None

def get_stl_coordinates(address):
    """Get approximate coordinates for St. Louis area addresses"""
    # Default to St. Louis area coordinates with slight variation
    base_lat = 38.6270
    base_lng = -90.1994
    
    # Add some variation based on address hash
    hash_val = hash(address) % 1000
    lat_offset = (hash_val % 100) * 0.001 - 0.05
    lng_offset = ((hash_val // 100) % 100) * 0.001 - 0.05
    
    return {
        'lat': round(base_lat + lat_offset, 6),
        'lng': round(base_lng + lng_offset, 6)
    }

def generate_tasks_for_property(property_obj):
    """Generate basic tasks based on property status"""
    tasks = []
    property_id = property_obj['id']
    
    # Generate a few key tasks based on status
    if property_obj['status'] == 'Hold':
        tasks.append({
            'id': f"{property_id}_task_1",
            'title': 'Complete Pre-Listing Preparation',
            'description': 'Property is on hold - complete all pre-listing requirements',
            'dueDate': (datetime.now().strftime('%Y-%m-%d')),
            'priority': 'High',
            'status': 'Pending',
            'category': 'Listing Prep',
            'propertyId': property_id,
            'taskType': 'listing-prep',
            'isAutoGenerated': True
        })
    elif property_obj['status'] == 'Active':
        tasks.append({
            'id': f"{property_id}_task_2",
            'title': 'Monitor Active Listing Performance',
            'description': 'Track showing activity and market response',
            'dueDate': (datetime.now().strftime('%Y-%m-%d')),
            'priority': 'Medium',
            'status': 'Pending',
            'category': 'Listing Prep',
            'propertyId': property_id,
            'taskType': 'listing-prep',
            'isAutoGenerated': True
        })
    elif property_obj['status'] == 'Under Contract':
        tasks.append({
            'id': f"{property_id}_task_3",
            'title': 'Manage Contract Contingencies',
            'description': 'Track inspection, appraisal, and financing deadlines',
            'dueDate': (datetime.now().strftime('%Y-%m-%d')),
            'priority': 'Urgent',
            'status': 'Pending',
            'category': 'Under Contract',
            'propertyId': property_id,
            'taskType': 'under-contract',
            'isAutoGenerated': True
        })
    
    return tasks

if __name__ == "__main__":
    properties, tasks = parse_trident_properties()