import React from 'react';
import { Property } from '../types';
import { MapPin, User, DollarSign, Calendar, AlertCircle, TrendingDown, TrendingUp, Clock, Building, FileText, Users, CheckSquare, CalendarPlus } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  outstandingTasks: number;
  onClick: () => void;
  onTransactionAction?: (action: string, property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  outstandingTasks, 
  onClick,
  onTransactionAction
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Under Contract':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-amber-100 text-amber-800';
      case 'Hold':
        return 'bg-purple-100 text-purple-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskIndicatorColor = (count: number) => {
    if (count === 0) return 'bg-green-500';
    if (count <= 2) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getPriceChangeIndicator = () => {
    if (!property.startingListPrice || !property.currentListPrice) return null;
    
    const difference = property.currentListPrice - property.startingListPrice;
    if (difference === 0) return null;
    
    return (
      <div className={`flex items-center space-x-1 text-xs ${
        difference > 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {difference > 0 ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>${Math.abs(Math.round(difference)).toLocaleString()}</span>
      </div>
    );
  };

  const getDaysOnMarket = () => {
    if (!property.listingDate) return null;
    
    const listingDate = new Date(property.listingDate);
    const today = new Date();
    const daysOnMarket = Math.floor((today.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysOnMarket;
  };

  const getUpcomingContingency = () => {
    if (!property.contingencyDates || property.status !== 'Under Contract') return null;
    
    const today = new Date();
    const contingencies = [
      { name: 'Earnest Money', date: property.contingencyDates.earnestMoney },
      { name: 'Inspection', date: property.contingencyDates.inspection },
      { name: 'Title', date: property.contingencyDates.title },
      { name: 'Appraisal', date: property.contingencyDates.appraisal },
      { name: 'Lending', date: property.contingencyDates.lending },
      { name: 'Occupancy', date: property.contingencyDates.occupancy }
    ].filter(c => c.date);

    const upcomingContingencies = contingencies
      .map(c => ({ ...c, dateObj: new Date(c.date!) }))
      .filter(c => c.dateObj >= today)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (upcomingContingencies.length === 0) return null;

    const next = upcomingContingencies[0];
    const daysUntil = Math.ceil((next.dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <div className={`flex items-center space-x-1 text-xs ${
        daysUntil <= 2 ? 'text-red-600' : daysUntil <= 5 ? 'text-amber-600' : 'text-blue-600'
      }`}>
        <Clock className="h-3 w-3" />
        <span>{next.name}: {daysUntil}d</span>
      </div>
    );
  };

  const daysOnMarket = getDaysOnMarket();

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <div 
            className={`w-3 h-3 rounded-full ${getTaskIndicatorColor(outstandingTasks)}`}
            title={`${outstandingTasks} outstanding tasks`}
          />
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
            {property.status}
          </span>
          {daysOnMarket !== null && property.status === 'Active' && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              daysOnMarket > 60 ? 'bg-red-100 text-red-800' :
              daysOnMarket > 30 ? 'bg-amber-100 text-amber-800' :
              'bg-green-100 text-green-800'
            }`}>
              {daysOnMarket} days
            </span>
          )}
        </div>
        {outstandingTasks > 0 && (
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{outstandingTasks}</span>
          </div>
        )}
      </div>

      {/* Address */}
      <div className="flex items-start space-x-2 mb-3">
        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{property.address}</h3>
      </div>

      {/* Client Name */}
      <div className="flex items-center space-x-2 mb-3">
        <Building className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600 font-medium">{property.clientName}</span>
      </div>

      {/* Agent */}
      <div className="flex items-center space-x-2 mb-3">
        <User className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600">{property.sellingAgent}</span>
      </div>

      {/* Loan/Basis Points */}
      <div className="mb-3">
        {property.loanNumber && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Loan:</span> {property.loanNumber}
          </p>
        )}
        {property.basisPoints && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Basis Points:</span> {property.basisPoints?.toLocaleString()}
          </p>
        )}
      </div>

      {/* Contingency Alert for Under Contract Properties */}
      {property.status === 'Under Contract' && getUpcomingContingency() && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800">Next Contingency:</span>
            {getUpcomingContingency()}
          </div>
        </div>
      )}

      {/* Pricing Information */}
      <div className="space-y-2 mb-3">
        {/* List Prices */}
        {(property.startingListPrice || property.currentListPrice) && (
          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">List Price</span>
              {getPriceChangeIndicator()}
            </div>
            
            {property.startingListPrice && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Starting:</span>
                <span className="font-medium text-gray-900">
                  ${Math.round(property.startingListPrice).toLocaleString()}
                </span>
              </div>
            )}
            
            {property.currentListPrice && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Current:</span>
                <span className="font-semibold text-gray-900">
                  ${Math.round(property.currentListPrice).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Contract Price */}
        {property.underContractPrice && (
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Contract:</span>
            <span className="text-sm font-medium text-gray-900">
              ${Math.round(property.underContractPrice).toLocaleString()}
            </span>
          </div>
        )}
        
        {/* Closing Date */}
        {property.closingDate && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Closing: {new Date(property.closingDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Property Type */}
      <div className="pt-3 border-t border-gray-100 mb-4">
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {property.propertyType}
          {property.isRented && ' • Rented'}
        </span>
      </div>

      {/* Transaction Coordinator Actions */}
      {onTransactionAction && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Transaction Tools
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransactionAction('documents', property);
              }}
              className="flex items-center space-x-1 px-2 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
            >
              <FileText className="h-3 w-3" />
              <span>Docs</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransactionAction('parties', property);
              }}
              className="flex items-center space-x-1 px-2 py-1.5 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
            >
              <Users className="h-3 w-3" />
              <span>Parties</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransactionAction('workflow', property);
              }}
              className="flex items-center space-x-1 px-2 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors"
            >
              <CheckSquare className="h-3 w-3" />
              <span>Workflow</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransactionAction('timeline', property);
              }}
              className="flex items-center space-x-1 px-2 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors"
            >
              <CalendarPlus className="h-3 w-3" />
              <span>Timeline</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};