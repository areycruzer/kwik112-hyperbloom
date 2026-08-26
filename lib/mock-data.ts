/**
 * Pulse112 Mock Data
 * Sample emergency calls for demo and development
 */

import { EmergencyCall, TranscriptSegment } from './types';

/**
 * Mock emergency calls focusing on Delhi NCR coordinates
 * Provides deterministic incidents for map pin placement
 */
export const mockCalls: EmergencyCall[] = [
  {
    id: 'delhi-1',
    caller_number: '+919876543210',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'fire',
    incident_subtype: 'apartment fire',
    severity: 'critical',
    severity_score: 95,
    caller_location: {
      address: 'Plot 92, Pocket C, Sector 16, Rohini, Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.7196,
      longitude: 77.1186,
      confidence: 0.92
    },
    top_emotion: 'distress',
    emotion_intensity: 0.87,
    caller_condition: 'panicked',
    ai_summary: 'High-rise apartment fire with two residents trapped on the fourth floor. Heavy smoke visible across Sector 16, Rohini.',
    ai_confidence: 0.94,
    persons_involved: 2,
    immediate_threats: ['active flames', 'trapped occupants', 'heavy smoke'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    ai_recommendation: {
      action_type: 'dispatch_multiple',
      primary_unit: 'Fire Engine 7',
      support_units: ['Ladder Truck 3', 'Medic 12', 'Battalion Chief 2'],
      priority_code: 'Code 3',
      special_instructions: 'Active structure fire with trapped occupants. Request immediate response. Stage EMS for potential victims.',
      rationale: 'Critical life safety situation requiring immediate fire suppression and rescue operations.',
      alternative_actions: ['Request mutual aid if Engine 7 unavailable'],
      confidence: 0.96,
      approval_required: false,
      estimated_response_time: '3-4 minutes'
    }
  },
  {
    id: 'delhi-2',
    caller_number: '+919812345678',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'accident',
    incident_subtype: 'multiple vehicle collision',
    severity: 'high',
    severity_score: 82,
    caller_location: {
      address: 'Outer Ring Road, Pitampura Metro Crossing, Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.7049,
      longitude: 77.1324,
      confidence: 0.89
    },
    top_emotion: 'concern',
    emotion_intensity: 0.75,
    caller_condition: 'distressed',
    ai_summary: 'Three-vehicle pileup blocking Outer Ring Road. One passenger unconscious, traffic backing up rapidly.',
    ai_confidence: 0.9,
    persons_involved: 4,
    immediate_threats: ['blocked roadway', 'potential fuel leak'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'delhi-3',
    caller_number: '+919711223344',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'medical_emergency',
    incident_subtype: 'cardiac arrest',
    severity: 'critical',
    severity_score: 91,
    caller_location: {
      address: 'E-5, Shalimar Bagh West, Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.7124,
      longitude: 77.1621,
      confidence: 0.86
    },
    top_emotion: 'panic',
    emotion_intensity: 0.88,
    caller_condition: 'distressed',
    ai_summary: 'Elderly male collapsed during morning walk. Bystander initiated CPR near Shalimar Bagh Community Park.',
    ai_confidence: 0.93,
    persons_involved: 1,
    immediate_threats: ['cardiac arrest', 'crowd forming'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  },
  {
    id: 'delhi-4',
    caller_number: '+919900112233',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'crime',
    incident_subtype: 'armed robbery',
    severity: 'high',
    severity_score: 78,
    caller_location: {
      address: 'Rithala Metro Station, Exit Gate 2, Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.7210,
      longitude: 77.1074,
      confidence: 0.84
    },
    top_emotion: 'fear',
    emotion_intensity: 0.81,
    caller_condition: 'distressed',
    ai_summary: 'Caller witnessed armed robbery outside Rithala metro station. Suspects fleeing towards Bhagwan Mahavir Marg.',
    ai_confidence: 0.88,
    persons_involved: 3,
    immediate_threats: ['armed suspects', 'crowd panic'],
    priority_code: 'Code 2',
    created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  },
  {
    id: 'delhi-5',
    caller_number: '+919922334455',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'public_safety',
    incident_subtype: 'gas leak',
    severity: 'medium',
    severity_score: 64,
    caller_location: {
      address: 'Pocket 4 Market, Sector 24, Rohini, Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.7302,
      longitude: 77.1061,
      confidence: 0.88
    },
    top_emotion: 'anxiety',
    emotion_intensity: 0.69,
    caller_condition: 'distressed',
    ai_summary: 'Strong smell of LPG near food stalls in Pocket 4 Market. Nearby shops being evacuated.',
    ai_confidence: 0.86,
    persons_involved: 10,
    immediate_threats: ['flammable vapors', 'crowd congestion'],
    priority_code: 'Code 2',
    created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'delhi-6',
    caller_number: '+919845678901',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'medical_emergency',
    incident_subtype: 'breathing difficulty',
    severity: 'high',
    severity_score: 76,
    caller_location: {
      address: 'Connaught Place, Block A, Central Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      confidence: 0.91
    },
    top_emotion: 'panic',
    emotion_intensity: 0.82,
    caller_condition: 'panicked',
    ai_summary: 'Young woman experiencing severe asthma attack in crowded shopping area. Unable to locate inhaler.',
    ai_confidence: 0.89,
    persons_involved: 1,
    immediate_threats: ['respiratory distress', 'crowd interference'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  },
  {
    id: 'delhi-7',
    caller_number: '+919765432109',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'accident',
    incident_subtype: 'pedestrian hit',
    severity: 'critical',
    severity_score: 88,
    caller_location: {
      address: 'NH-44, Near Chhatarpur Temple, South Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.5065,
      longitude: 77.1750,
      confidence: 0.87
    },
    top_emotion: 'distress',
    emotion_intensity: 0.91,
    caller_condition: 'panicked',
    ai_summary: 'Pedestrian struck by speeding vehicle near Chhatarpur Temple. Victim bleeding heavily and unconscious.',
    ai_confidence: 0.92,
    persons_involved: 1,
    immediate_threats: ['severe bleeding', 'high-speed traffic', 'head injury'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'mumbai-1',
    caller_number: '+919823456789',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'fire',
    incident_subtype: 'commercial building fire',
    severity: 'critical',
    severity_score: 93,
    caller_location: {
      address: 'Crawford Market, Near Jama Masjid, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 18.9476,
      longitude: 72.8343,
      confidence: 0.90
    },
    top_emotion: 'panic',
    emotion_intensity: 0.89,
    caller_condition: 'panicked',
    ai_summary: 'Major fire outbreak in textile shop at Crawford Market. Multiple shop owners trapped, heavy smoke spreading rapidly.',
    ai_confidence: 0.95,
    persons_involved: 8,
    immediate_threats: ['active flames', 'trapped occupants', 'structural collapse risk', 'toxic smoke'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  },
  {
    id: 'bangalore-1',
    caller_number: '+919880123456',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'accident',
    incident_subtype: 'bus accident',
    severity: 'critical',
    severity_score: 89,
    caller_location: {
      address: 'Silk Board Junction, Hosur Road, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      latitude: 12.9172,
      longitude: 77.6229,
      confidence: 0.88
    },
    top_emotion: 'distress',
    emotion_intensity: 0.86,
    caller_condition: 'distressed',
    ai_summary: 'BMTC bus overturned at Silk Board Junction. Multiple passengers injured, children crying inside vehicle.',
    ai_confidence: 0.91,
    persons_involved: 35,
    immediate_threats: ['overturned vehicle', 'trapped passengers', 'fuel leak', 'traffic chaos'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  },
  {
    id: 'kolkata-1',
    caller_number: '+919830567890',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'public_safety',
    incident_subtype: 'building collapse',
    severity: 'critical',
    severity_score: 97,
    caller_location: {
      address: 'Poddar Court, Bow Barracks, Central Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      latitude: 22.5726,
      longitude: 88.3639,
      confidence: 0.85
    },
    top_emotion: 'panic',
    emotion_intensity: 0.94,
    caller_condition: 'panicked',
    ai_summary: 'Partial collapse of old residential building in Bow Barracks. Multiple families trapped under debris, screams heard.',
    ai_confidence: 0.93,
    persons_involved: 15,
    immediate_threats: ['structural collapse', 'trapped victims', 'further collapse risk', 'dust inhalation'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 1000).toISOString()
  },
  {
    id: 'chennai-1',
    caller_number: '+919840234567',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'medical_emergency',
    incident_subtype: 'heatstroke',
    severity: 'high',
    severity_score: 79,
    caller_location: {
      address: 'Marina Beach, Near Lighthouse, Chennai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      latitude: 13.0499,
      longitude: 80.2824,
      confidence: 0.89
    },
    top_emotion: 'concern',
    emotion_intensity: 0.74,
    caller_condition: 'distressed',
    ai_summary: 'Tourist collapsed on Marina Beach due to heatstroke. High body temperature, disoriented and vomiting.',
    ai_confidence: 0.88,
    persons_involved: 1,
    immediate_threats: ['heat exhaustion', 'dehydration', 'crowd gathering'],
    priority_code: 'Code 2',
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  },
  {
    id: 'hyderabad-1',
    caller_number: '+919949876543',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'crime',
    incident_subtype: 'chain snatching',
    severity: 'medium',
    severity_score: 58,
    caller_location: {
      address: 'Hitech City Main Road, Near IKEA, Hyderabad',
      city: 'Hyderabad',
      state: 'Telangana',
      latitude: 17.4474,
      longitude: 78.3684,
      confidence: 0.86
    },
    top_emotion: 'fear',
    emotion_intensity: 0.68,
    caller_condition: 'distressed',
    ai_summary: 'Two men on motorcycle snatched gold chain from elderly woman near IKEA junction. Suspects heading towards Gachibowli.',
    ai_confidence: 0.84,
    persons_involved: 3,
    immediate_threats: ['armed suspects on vehicle', 'injury to victim'],
    priority_code: 'Code 2',
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 60 * 1000).toISOString()
  },
  {
    id: 'pune-1',
    caller_number: '+919922567890',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'accident',
    incident_subtype: 'two-wheeler accident',
    severity: 'high',
    severity_score: 73,
    caller_location: {
      address: 'Fergusson College Road, Near Goodluck Cafe, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      latitude: 18.5204,
      longitude: 73.8567,
      confidence: 0.87
    },
    top_emotion: 'concern',
    emotion_intensity: 0.71,
    caller_condition: 'distressed',
    ai_summary: 'Motorcycle collision with auto-rickshaw. Rider thrown off vehicle, visible head injury, bleeding from leg.',
    ai_confidence: 0.86,
    persons_involved: 2,
    immediate_threats: ['head trauma', 'active bleeding', 'traffic obstruction'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'delhi-8',
    caller_number: '+919811234567',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'public_safety',
    incident_subtype: 'electric hazard',
    severity: 'high',
    severity_score: 81,
    caller_location: {
      address: 'Sarojini Nagar Market, Block C, South Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.5744,
      longitude: 77.1932,
      confidence: 0.90
    },
    top_emotion: 'anxiety',
    emotion_intensity: 0.78,
    caller_condition: 'distressed',
    ai_summary: 'Live electric wire fallen across main market street after transformer explosion. Sparking wire blocking pedestrian path.',
    ai_confidence: 0.89,
    persons_involved: 50,
    immediate_threats: ['live electrical wire', 'electrocution risk', 'dense crowd', 'fire hazard'],
    priority_code: 'Code 2',
    created_at: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 1000).toISOString()
  },
  {
    id: 'ahmedabad-1',
    caller_number: '+919879123456',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'medical_emergency',
    incident_subtype: 'allergic reaction',
    severity: 'critical',
    severity_score: 85,
    caller_location: {
      address: 'Law Garden Market, Near Food Stalls, Ahmedabad',
      city: 'Ahmedabad',
      state: 'Gujarat',
      latitude: 23.0258,
      longitude: 72.5698,
      confidence: 0.88
    },
    top_emotion: 'panic',
    emotion_intensity: 0.85,
    caller_condition: 'panicked',
    ai_summary: 'Child experiencing severe allergic reaction to food. Face swelling rapidly, difficulty breathing, turning pale.',
    ai_confidence: 0.91,
    persons_involved: 1,
    immediate_threats: ['anaphylaxis', 'airway obstruction', 'respiratory failure'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'jaipur-1',
    caller_number: '+919829345678',
    status: 'active',
    call_status: 'in-progress',
    incident_type: 'fire',
    incident_subtype: 'market fire',
    severity: 'high',
    severity_score: 80,
    caller_location: {
      address: 'Johari Bazaar, Near Hawa Mahal, Jaipur',
      city: 'Jaipur',
      state: 'Rajasthan',
      latitude: 26.9239,
      longitude: 75.8267,
      confidence: 0.89
    },
    top_emotion: 'distress',
    emotion_intensity: 0.83,
    caller_condition: 'panicked',
    ai_summary: 'Fire started in jewelry shop spreading to adjacent stores. Narrow lanes making evacuation difficult, tourists trapped.',
    ai_confidence: 0.87,
    persons_involved: 20,
    immediate_threats: ['spreading fire', 'narrow escape routes', 'trapped shoppers', 'valuable inventory'],
    priority_code: 'Code 3',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString()
  }
];

/**
 * Mock transcript for demo call
 */
export const mockTranscript: TranscriptSegment[] = [
  {
    id: 't1',
    call_id: 'delhi-1',
    speaker: 'assistant',
    text: 'This is emergency services. What is your emergency?',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    segment_order: 1
  },
  {
    id: 't2',
    call_id: 'delhi-1',
    speaker: 'user',
    text: 'Oh my god! There is fire on the fourth floor in Sector 16 Rohini!',
    emotions: {
      distress: 0.92,
      fear: 0.88,
      panic: 0.85,
      anxiety: 0.78
    },
    top_emotion: 'distress',
    emotion_intensity: 0.92,
    timestamp: new Date(Date.now() - 119 * 1000).toISOString(),
    segment_order: 2
  },
  {
    id: 't3',
    call_id: '1',
    speaker: 'assistant',
    text: 'I understand this is very scary. I\'m here to help you. What is your exact location?',
    timestamp: new Date(Date.now() - 115 * 1000).toISOString(),
    segment_order: 3
  },
  {
    id: 't4',
    call_id: 'delhi-1',
    speaker: 'user',
    text: 'It is Plot 92 Pocket C Sector 16 Rohini, New Delhi! Please hurry!',
    emotions: {
      distress: 0.89,
      fear: 0.82,
      urgency: 0.90,
      panic: 0.80
    },
    top_emotion: 'urgency',
    emotion_intensity: 0.90,
    timestamp: new Date(Date.now() - 110 * 1000).toISOString(),
    segment_order: 4
  },
  {
    id: 't5',
    call_id: '1',
    speaker: 'assistant',
    text: 'Thank you. Are you safe right now? Are you outside the building?',
    timestamp: new Date(Date.now() - 105 * 1000).toISOString(),
    segment_order: 5
  },
  {
    id: 't6',
    call_id: 'delhi-1',
    speaker: 'user',
    text: 'Yes, we are outside but two neighbours are trapped inside with smoke everywhere!',
    emotions: {
      distress: 0.87,
      fear: 0.85,
      concern: 0.83,
      anxiety: 0.75
    },
    top_emotion: 'distress',
    emotion_intensity: 0.87,
    timestamp: new Date(Date.now() - 100 * 1000).toISOString(),
    segment_order: 6
  },
  {
    id: 't7',
    call_id: 'delhi-1',
    speaker: 'assistant',
    text: 'Units are heading to Plot 92 Pocket C Sector 16 Rohini right now. Stay outside and keep everyone away from the smoke.',
    timestamp: new Date(Date.now() - 95 * 1000).toISOString(),
    segment_order: 7
  }
];

/**
 * Get formatted time elapsed string
 */
export function getTimeElapsed(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hr ago';
  return `${hours} hrs ago`;
}

/**
 * Get severity color class
 */
export function getSeverityColor(severity?: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500 text-white';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-black';
    case 'low':
      return 'bg-green-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

/**
 * Get emotion emoji
 */
export function getEmotionEmoji(emotion?: string): string {
  switch (emotion?.toLowerCase()) {
    case 'distress':
    case 'panic':
      return '😰';
    case 'fear':
      return '😨';
    case 'anxiety':
    case 'concern':
      return '😟';
    case 'anger':
    case 'frustration':
      return '😠';
    case 'calm':
      return '😌';
    default:
      return '😐';
  }
}