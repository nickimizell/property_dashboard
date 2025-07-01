export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Listing Prep' | 'Under Contract' | 'Closing Prep';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  estimatedDays: number; // Days after property creation or status change
  dependencies?: string[]; // Task IDs that must be completed first
  requiredFor?: 'MLS_LISTING' | 'CONTRACT' | 'CLOSING'; // Key milestones
}

export const CONVENTIONAL_SELLER_TASKS: TaskTemplate[] = [
  // LISTING PREP (17 tasks)
  {
    id: 'conv_1',
    title: 'Execute Listing Agreement',
    description: 'Have the agent and seller both sign the agreed upon Listing Agreement and input into IntelliAgent',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'conv_2',
    title: 'Start New IntelliAgent File',
    description: 'Agent has to go into the software IntelliAgent and start a new file',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['conv_1']
  },
  {
    id: 'conv_3',
    title: 'Obtain Disclosures',
    description: 'Sellers disclosure, lead based paint, septic, pool, etc. to be added to MLS listing',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 3
  },
  {
    id: 'conv_4',
    title: 'Check Property Clean and Staged',
    description: 'Needs to be done before photos can be scheduled',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 2
  },
  {
    id: 'conv_5',
    title: 'Add Lockbox',
    description: 'Install Lockbox or Supra for agent access',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    dependencies: ['conv_4']
  },
  {
    id: 'conv_6',
    title: 'Schedule Listing Photos',
    description: 'Email/call photographer and set up appointment with calendar invite',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 2,
    dependencies: ['conv_4']
  },
  {
    id: 'conv_7',
    title: 'Install Yard Sign',
    description: 'Must be done same day as MLS Coming Soon entry',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    requiredFor: 'MLS_LISTING'
  },
  {
    id: 'conv_8',
    title: 'List Property in MLS as Coming Soon',
    description: 'Enter in MARIS system - loads to Zillow, Realtor.com, Homes.com, etc.',
    category: 'Listing Prep',
    priority: 'Urgent',
    estimatedDays: 1,
    dependencies: ['conv_6', 'conv_7'],
    requiredFor: 'MLS_LISTING'
  },
  {
    id: 'conv_9',
    title: 'Schedule Open Houses',
    description: 'Coordinate with seller on day and time for open house',
    category: 'Listing Prep',
    priority: 'Low',
    estimatedDays: 1
  },
  {
    id: 'conv_10',
    title: 'Walk Property Before Photos',
    description: 'Ensure house is photo-ready, create punch list if needed',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['conv_4']
  },
  {
    id: 'conv_11',
    title: 'Create Marketing Email',
    description: 'Email for CRM database announcing new listing',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    dependencies: ['conv_8']
  },
  {
    id: 'conv_12',
    title: 'Create In-House Flyer',
    description: 'Print flyers for open house and showings',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 2
  },
  {
    id: 'conv_13',
    title: 'Create Postcard',
    description: 'Mail to neighborhood notifying of home for sale',
    category: 'Listing Prep',
    priority: 'Low',
    estimatedDays: 3
  },
  {
    id: 'conv_14',
    title: 'Create Social Media Post',
    description: 'Facebook/Instagram post for agent followers',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    dependencies: ['conv_8']
  },
  {
    id: 'conv_15',
    title: 'Prep for Open House',
    description: 'Gather materials: flyers, sign-in sheet, treats, etc.',
    category: 'Listing Prep',
    priority: 'Low',
    estimatedDays: 1,
    dependencies: ['conv_9', 'conv_12']
  },
  {
    id: 'conv_16',
    title: 'Final Walk Before Going Active',
    description: 'Final walkthrough to ensure ready for showings',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['conv_8']
  },

  // UNDER CONTRACT (17 tasks)
  {
    id: 'conv_17',
    title: 'Change MLS to Active Under Contract',
    description: 'Update MARIS system status to notify public of accepted offer',
    category: 'Under Contract',
    priority: 'Urgent',
    estimatedDays: 0, // Same day as contract
    requiredFor: 'CONTRACT'
  },
  {
    id: 'conv_18',
    title: 'Review All Documents for Accuracy',
    description: 'Check offer contract and all riders for completeness',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'conv_19',
    title: 'Add Documents to IntelliAgent',
    description: 'Upload new documents for broker approval',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['conv_18']
  },
  {
    id: 'conv_20',
    title: 'Send Documents to Title Company',
    description: 'Sales Contract and Broker Compensation Agreement Rider',
    category: 'Under Contract',
    priority: 'Urgent',
    estimatedDays: 1,
    dependencies: ['conv_18']
  },
  {
    id: 'conv_21',
    title: 'Order Required Documents/Warranties/Inspections',
    description: 'Obtain documents required by contract',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 3
  },
  {
    id: 'conv_22',
    title: 'Schedule Occupancy Inspection',
    description: 'Municipal inspection - seller schedules and obtains certificate',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 7
  },
  {
    id: 'conv_23',
    title: 'Confirm Receipt of Earnest Money',
    description: 'Get proof from buyer agent or software notification',
    category: 'Under Contract',
    priority: 'Urgent',
    estimatedDays: 2
  },
  {
    id: 'conv_24',
    title: 'Confirm Date and Time of Inspection',
    description: 'Buyer agent schedules via ShowingTime',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 5
  },
  {
    id: 'conv_25',
    title: 'Receive and Review Inspection Notice',
    description: 'Review inspection report and repair requests from buyer',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['conv_24']
  },
  {
    id: 'conv_26',
    title: 'Execute Resolution to Inspection Notice',
    description: 'Negotiate repair resolution or contract continuation',
    category: 'Under Contract',
    priority: 'Urgent',
    estimatedDays: 3,
    dependencies: ['conv_25']
  },
  {
    id: 'conv_27',
    title: 'Distribute Repair Receipts and Documentation',
    description: 'Provide lien waivers and work receipts if repairs completed',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 2,
    dependencies: ['conv_26']
  },
  {
    id: 'conv_28',
    title: 'Submit All Documents into IntelliAgent',
    description: 'Ensure broker approval of all transaction documents',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'conv_29',
    title: 'Verify Appraisal has been Ordered',
    description: 'Confirm with buyer agent that lender ordered appraisal',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 7
  },
  {
    id: 'conv_30',
    title: 'Verify Appraisal has Passed',
    description: 'Confirm no repair requests from appraisal',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['conv_29']
  },
  {
    id: 'conv_31',
    title: 'Verify All Title Work is Complete',
    description: 'Contact title company to confirm completion',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'conv_32',
    title: 'Confirm Clear to Close from Lender',
    description: 'Verify lender completed underwriting and buyer ready to close',
    category: 'Under Contract',
    priority: 'Urgent',
    estimatedDays: 1
  },
  {
    id: 'conv_33',
    title: 'Change Status to Pending',
    description: 'Update MLS status once all contingencies completed',
    category: 'Under Contract',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['conv_32']
  },

  // CLOSING PREP (6 tasks)
  {
    id: 'conv_34',
    title: 'Submit File in IntelliAgent',
    description: 'Final submission with all approved documents for closing',
    category: 'Closing Prep',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['conv_33']
  },
  {
    id: 'conv_35',
    title: 'Confirm Utilities Scheduled',
    description: 'Verify seller scheduled utility disconnection',
    category: 'Closing Prep',
    priority: 'Medium',
    estimatedDays: 1
  },
  {
    id: 'conv_36',
    title: 'Confirm Closing Times',
    description: 'Schedule with seller and coordinate with buyer agent',
    category: 'Closing Prep',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'conv_37',
    title: 'Confirm Final Walkthrough',
    description: 'Buyer agent schedules through ShowingTime',
    category: 'Closing Prep',
    priority: 'Medium',
    estimatedDays: 1
  },
  {
    id: 'conv_38',
    title: 'Receive and Review Closing Documents',
    description: 'Review final closing numbers from title company',
    category: 'Closing Prep',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'conv_39',
    title: 'Confirm Closing and Funding',
    description: 'Verify buyer signed and title company received funding',
    category: 'Closing Prep',
    priority: 'Urgent',
    estimatedDays: 0,
    requiredFor: 'CLOSING'
  },
  {
    id: 'conv_40',
    title: 'Change Status to Closed in MLS',
    description: 'Update MARIS MLS system to closed status',
    category: 'Closing Prep',
    priority: 'High',
    estimatedDays: 0,
    dependencies: ['conv_39']
  },
  {
    id: 'conv_41',
    title: 'Upload Final Closing Documents',
    description: 'Add final documents to IntelliAgent',
    category: 'Closing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    dependencies: ['conv_39']
  }
];

export const INVESTOR_SELLER_TASKS: TaskTemplate[] = [
  // LISTING PREP (18 tasks - includes "Obtain Keys" and "Ask about NOIS")
  {
    id: 'inv_1',
    title: 'Execute Listing Agreement',
    description: 'Have the agent and seller both sign the agreed upon Listing Agreement and input into IntelliAgent',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'inv_2',
    title: 'Start New IntelliAgent File',
    description: 'Agent has to go into the software IntelliAgent and start a new file',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['inv_1']
  },
  {
    id: 'inv_3',
    title: 'Obtain Keys',
    description: 'Agent needs keys to put into lockbox for showings',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'inv_4',
    title: 'Obtain Disclosures',
    description: 'Sellers disclosure, lead based paint, septic, pool, etc. to be added to MLS listing',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 3
  },
  {
    id: 'inv_5',
    title: 'Check Property Clean and Staged',
    description: 'Needs to be done before photos can be scheduled',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 2
  },
  {
    id: 'inv_6',
    title: 'Add Lockbox',
    description: 'Install Lockbox or Supra for agent access',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    dependencies: ['inv_3', 'inv_5']
  },
  {
    id: 'inv_7',
    title: 'Schedule Listing Photos',
    description: 'Email/call photographer and set up appointment with calendar invite',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 2,
    dependencies: ['inv_5']
  },
  {
    id: 'inv_8',
    title: 'Install Yard Sign',
    description: 'Must be done same day as MLS Coming Soon entry',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    requiredFor: 'MLS_LISTING'
  },
  {
    id: 'inv_9',
    title: 'List Property in MLS as Coming Soon',
    description: 'Enter in MARIS system - loads to Zillow, Realtor.com, Homes.com, etc.',
    category: 'Listing Prep',
    priority: 'Urgent',
    estimatedDays: 1,
    dependencies: ['inv_7', 'inv_8'],
    requiredFor: 'MLS_LISTING'
  },
  {
    id: 'inv_10',
    title: 'Schedule Open Houses',
    description: 'Coordinate with seller on day and time for open house',
    category: 'Listing Prep',
    priority: 'Low',
    estimatedDays: 1
  },
  {
    id: 'inv_11',
    title: 'Walk Property Before Photos',
    description: 'Ensure house is photo-ready, create punch list if needed',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['inv_5']
  },
  {
    id: 'inv_12',
    title: 'Ask about NOIS',
    description: 'Notice that title company can file - must happen 90 days before sale',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1
  },
  {
    id: 'inv_13',
    title: 'Create Marketing Email',
    description: 'Email for CRM database announcing new listing',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    dependencies: ['inv_9']
  },
  {
    id: 'inv_14',
    title: 'Create In-House Flyer',
    description: 'Print flyers for open house and showings',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 2
  },
  {
    id: 'inv_15',
    title: 'Create Postcard',
    description: 'Mail to neighborhood notifying of home for sale',
    category: 'Listing Prep',
    priority: 'Low',
    estimatedDays: 3
  },
  {
    id: 'inv_16',
    title: 'Create Social Media Post',
    description: 'Facebook/Instagram post for agent followers',
    category: 'Listing Prep',
    priority: 'Medium',
    estimatedDays: 1,
    dependencies: ['inv_9']
  },
  {
    id: 'inv_17',
    title: 'Prep for Open House',
    description: 'Gather materials: flyers, sign-in sheet, treats, etc.',
    category: 'Listing Prep',
    priority: 'Low',
    estimatedDays: 1,
    dependencies: ['inv_10', 'inv_14']
  },
  {
    id: 'inv_18',
    title: 'Final Walk Before Going Active',
    description: 'Final walkthrough to ensure ready for showings',
    category: 'Listing Prep',
    priority: 'High',
    estimatedDays: 1,
    dependencies: ['inv_9']
  },

  // UNDER CONTRACT (17 tasks - same as conventional)
  // ... (would include all conv_17 through conv_33 with inv_ prefixes)

  // CLOSING PREP (6 tasks - same as conventional)
  // ... (would include all conv_34 through conv_41 with inv_ prefixes)
];

export function getTaskTemplate(propertyType: 'Conventional' | 'Investor'): TaskTemplate[] {
  return propertyType === 'Conventional' ? CONVENTIONAL_SELLER_TASKS : INVESTOR_SELLER_TASKS;
}