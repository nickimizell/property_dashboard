import React, { useState } from 'react';
import { Property, ContingencyDates } from '../types';
import { X, Save } from 'lucide-react';

interface PropertyFormProps {
  onClose: () => void;
  onSave: (property: Omit<Property, 'id' | 'tasks' | 'createdAt' | 'updatedAt'>) => void;
  property?: Property;
}

export const PropertyForm: React.FC<PropertyFormProps> = ({ onClose, onSave, property }) => {
  const [formData, setFormData] = useState({
    address: property?.address || '',
    clientName: property?.clientName || '',
    sellingAgent: property?.sellingAgent || '',
    loanNumber: property?.loanNumber || '',
    basisPoints: property?.basisPoints || '',
    closingDate: property?.closingDate || '',
    underContractPrice: property?.underContractPrice || '',
    startingListPrice: property?.startingListPrice || '',
    currentListPrice: property?.currentListPrice || '',
    status: property?.status || 'Active',
    propertyType: property?.propertyType || 'Single Family',
    isRented: property?.isRented || false,
    notes: property?.notes || '',
    coordinates: property?.coordinates || { lat: 39.7817, lng: -89.6501 },
    listingDate: property?.listingDate || '',
    lastPriceReduction: property?.lastPriceReduction || '',
    contingencyDates: property?.contingencyDates || {
      earnestMoney: '',
      inspection: '',
      title: '',
      appraisal: '',
      lending: '',
      occupancy: ''
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const propertyData = {
      ...formData,
      basisPoints: formData.basisPoints ? Number(formData.basisPoints) : undefined,
      underContractPrice: formData.underContractPrice ? Number(formData.underContractPrice) : undefined,
      startingListPrice: formData.startingListPrice ? Number(formData.startingListPrice) : undefined,
      currentListPrice: formData.currentListPrice ? Number(formData.currentListPrice) : undefined,
      contingencyDates: (formData.status === 'Under Contract' || formData.status === 'Pending') 
        ? formData.contingencyDates 
        : undefined
    };

    onSave(propertyData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleContingencyDateChange = (field: keyof ContingencyDates, value: string) => {
    setFormData(prev => ({
      ...prev,
      contingencyDates: {
        ...prev.contingencyDates,
        [field]: value
      }
    }));
  };

  const showContingencyDates = formData.status === 'Under Contract' || formData.status === 'Pending';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {property ? 'Edit Property' : 'Add New Property'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123 Main Street, City, State, ZIP"
            />
          </div>

          {/* Client Name and Agent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Johnson Investment Group"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Agent *
              </label>
              <input
                type="text"
                name="sellingAgent"
                value={formData.sellingAgent}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Agent Name"
              />
            </div>
          </div>

          {/* Loan Number and Basis Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Number
              </label>
              <input
                type="text"
                name="loanNumber"
                value={formData.loanNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="LN-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Basis Points
              </label>
              <input
                type="number"
                name="basisPoints"
                value={formData.basisPoints}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="150"
              />
            </div>
          </div>

          {/* List Prices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starting List Price
              </label>
              <input
                type="number"
                name="startingListPrice"
                value={formData.startingListPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="299000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current List Price
              </label>
              <input
                type="number"
                name="currentListPrice"
                value={formData.currentListPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="289000"
              />
            </div>
          </div>

          {/* Contract Price and Listing Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Under Contract Price
              </label>
              <input
                type="number"
                name="underContractPrice"
                value={formData.underContractPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="285000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing Date
              </label>
              <input
                type="date"
                name="listingDate"
                value={formData.listingDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status and Property Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Active">Active</option>
                <option value="Under Contract">Under Contract</option>
                <option value="Pending">Pending</option>
                <option value="Hold">Hold</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Single Family">Single Family</option>
                <option value="Duplex">Duplex</option>
                <option value="Rental">Rental</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
          </div>

          {/* Closing Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Closing Date
            </label>
            <input
              type="date"
              name="closingDate"
              value={formData.closingDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Contingency Dates - Only show for Under Contract/Pending */}
          {showContingencyDates && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Contingency Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Earnest Money
                  </label>
                  <input
                    type="date"
                    value={formData.contingencyDates.earnestMoney}
                    onChange={(e) => handleContingencyDateChange('earnestMoney', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspection
                  </label>
                  <input
                    type="date"
                    value={formData.contingencyDates.inspection}
                    onChange={(e) => handleContingencyDateChange('inspection', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="date"
                    value={formData.contingencyDates.title}
                    onChange={(e) => handleContingencyDateChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appraisal
                  </label>
                  <input
                    type="date"
                    value={formData.contingencyDates.appraisal}
                    onChange={(e) => handleContingencyDateChange('appraisal', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lending
                  </label>
                  <input
                    type="date"
                    value={formData.contingencyDates.lending}
                    onChange={(e) => handleContingencyDateChange('lending', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occupancy
                  </label>
                  <input
                    type="date"
                    value={formData.contingencyDates.occupancy}
                    onChange={(e) => handleContingencyDateChange('occupancy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Rental Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isRented"
                checked={formData.isRented}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Currently Rented</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes about the property..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{property ? 'Update' : 'Save'} Property</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};