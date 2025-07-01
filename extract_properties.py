#!/usr/bin/env python3
import pandas as pd
import json
from pathlib import Path
import sys

def extract_excel_data(excel_file_path):
    """Extract all tabs from Excel file and convert to structured data"""
    
    print(f"📊 Reading Excel file: {excel_file_path}")
    
    try:
        # Read all sheets from Excel file
        excel_data = pd.read_excel(excel_file_path, sheet_name=None, engine='openpyxl')
        
        print(f"📋 Found {len(excel_data)} tabs:")
        for sheet_name in excel_data.keys():
            print(f"   - {sheet_name} ({len(excel_data[sheet_name])} rows)")
        
        # Process each sheet
        all_properties = []
        
        for sheet_name, df in excel_data.items():
            print(f"\n🔍 Processing tab: {sheet_name}")
            print(f"Columns: {list(df.columns)}")
            print(f"First few rows:")
            print(df.head())
            
            # Convert to CSV for inspection
            csv_filename = f"properties_{sheet_name.lower().replace(' ', '_')}.csv"
            df.to_csv(csv_filename, index=False)
            print(f"💾 Saved as: {csv_filename}")
            
            # Try to standardize the data structure
            properties_from_sheet = process_sheet_data(df, sheet_name)
            all_properties.extend(properties_from_sheet)
        
        # Save consolidated data
        if all_properties:
            with open('all_properties.json', 'w') as f:
                json.dump(all_properties, f, indent=2, default=str)
            print(f"\n✅ Consolidated {len(all_properties)} properties to all_properties.json")
        
        return all_properties
        
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")
        return None

def process_sheet_data(df, sheet_name):
    """Process individual sheet data and standardize format"""
    properties = []
    
    # Clean up DataFrame
    df = df.dropna(how='all')  # Remove completely empty rows
    df = df.fillna('')  # Fill NaN with empty strings
    
    print(f"📊 Processing {len(df)} rows from {sheet_name}")
    
    for index, row in df.iterrows():
        try:
            # Try to map common column names
            property_data = {
                'source_sheet': sheet_name,
                'row_number': index + 1,
                'raw_data': row.to_dict()
            }
            
            # Try to identify common real estate fields
            row_dict = row.to_dict()
            
            # Look for address field
            address_fields = ['address', 'property_address', 'street_address', 'location', 'property']
            for field in address_fields:
                for col in row_dict.keys():
                    if field.lower() in str(col).lower():
                        property_data['address'] = str(row_dict[col]).strip()
                        break
                if 'address' in property_data:
                    break
            
            # Look for client/seller field
            client_fields = ['client', 'seller', 'owner', 'client_name']
            for field in client_fields:
                for col in row_dict.keys():
                    if field.lower() in str(col).lower():
                        property_data['client_name'] = str(row_dict[col]).strip()
                        break
                if 'client_name' in property_data:
                    break
            
            # Look for agent field
            agent_fields = ['agent', 'listing_agent', 'selling_agent', 'realtor']
            for field in agent_fields:
                for col in row_dict.keys():
                    if field.lower() in str(col).lower():
                        property_data['selling_agent'] = str(row_dict[col]).strip()
                        break
                if 'selling_agent' in property_data:
                    break
            
            # Look for price field
            price_fields = ['price', 'list_price', 'listing_price', 'asking_price', 'amount']
            for field in price_fields:
                for col in row_dict.keys():
                    if field.lower() in str(col).lower():
                        price_val = str(row_dict[col]).replace('$', '').replace(',', '').strip()
                        try:
                            property_data['list_price'] = float(price_val) if price_val else None
                        except:
                            property_data['list_price'] = price_val
                        break
                if 'list_price' in property_data:
                    break
            
            # Look for status field
            status_fields = ['status', 'listing_status', 'property_status']
            for field in status_fields:
                for col in row_dict.keys():
                    if field.lower() in str(col).lower():
                        property_data['status'] = str(row_dict[col]).strip()
                        break
                if 'status' in property_data:
                    break
            
            # Determine workflow type based on sheet name or data
            if 'investor' in sheet_name.lower():
                property_data['workflow_type'] = 'Investor'
            else:
                property_data['workflow_type'] = 'Conventional'
            
            # Set default status based on sheet name
            if 'status' not in property_data or not property_data['status']:
                if 'active' in sheet_name.lower():
                    property_data['status'] = 'Active'
                elif 'contract' in sheet_name.lower():
                    property_data['status'] = 'Under Contract'
                elif 'pending' in sheet_name.lower():
                    property_data['status'] = 'Pending'
                elif 'closed' in sheet_name.lower():
                    property_data['status'] = 'Closed'
                else:
                    property_data['status'] = 'Active'
            
            properties.append(property_data)
            
        except Exception as e:
            print(f"⚠️ Error processing row {index + 1}: {e}")
            continue
    
    print(f"✅ Processed {len(properties)} properties from {sheet_name}")
    return properties

if __name__ == "__main__":
    excel_file = "Listed_properties/Trident Properties.xlsx"
    
    if not Path(excel_file).exists():
        print(f"❌ File not found: {excel_file}")
        sys.exit(1)
    
    properties = extract_excel_data(excel_file)
    
    if properties:
        print(f"\n🎉 Successfully extracted {len(properties)} properties!")
        print("\n📋 Summary by sheet:")
        sheets = {}
        for prop in properties:
            sheet = prop['source_sheet']
            if sheet not in sheets:
                sheets[sheet] = 0
            sheets[sheet] += 1
        
        for sheet, count in sheets.items():
            print(f"   - {sheet}: {count} properties")
    else:
        print("❌ No properties extracted")