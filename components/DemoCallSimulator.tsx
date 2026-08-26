/**
 * Pulse112 Demo Call Simulator
 * Component to simulate emergency calls for hackathon demo
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Phone, Flame, Heart, Car, Shield, AlertTriangle } from 'lucide-react';
import { IncidentType, Severity } from '@/lib/types';

interface DemoScenario {
  id: string;
  title: string;
  incident_type: IncidentType;
  severity: Severity;
  description: string;
  icon: React.ReactNode;
  transcript: string;
}

const demoScenarios: DemoScenario[] = [
  {
    id: 'fire-critical',
    title: 'House Fire with Trapped Occupants',
    incident_type: 'fire',
    severity: 'critical',
    description: 'Active structure fire with people trapped inside',
    icon: <Flame className="w-5 h-5" />,
    transcript: `
Caller: Oh my god! There's a fire! My house is on fire!
AI: I understand this is very scary. I'm here to help you. What is your exact location?
Caller: 9324 Lincoln Avenue! In Delaware City! Please hurry!
AI: Thank you. Are you safe right now? Are you outside the building?
Caller: Yes, I'm outside, but my neighbors are still inside! I can see smoke coming from their windows!
AI: I have your information. Fire and medical units are being dispatched to 9324 Lincoln Avenue right now. They should arrive in 3 to 4 minutes. Do not enter the building. Stay on the line with me.
    `.trim(),
  },
  {
    id: 'medical-high',
    title: 'Cardiac Emergency',
    incident_type: 'medical_emergency',
    severity: 'critical',
    description: 'Person experiencing chest pain and difficulty breathing',
    icon: <Heart className="w-5 h-5" />,
    transcript: `
Caller: My husband is having chest pains! He can't breathe properly!
AI: I'm sending help right now. What's your exact address?
Caller: 456 Oak Street, apartment 3B.
AI: Is he conscious? Can he speak to you?
Caller: Yes, but he's in a lot of pain and sweating heavily.
AI: An ambulance is on the way. Keep him calm and seated. Don't let him lie down. Help should arrive in 4 minutes.
    `.trim(),
  },
  {
    id: 'accident-high',
    title: 'Multi-Vehicle Accident',
    incident_type: 'accident',
    severity: 'high',
    description: 'Two-car collision with injuries on highway',
    icon: <Car className="w-5 h-5" />,
    transcript: `
Caller: There's been a bad accident on Highway 101 near the Yorktown exit!
AI: What is your exact location?
Caller: Highway 101 southbound, just past Yorktown Drive exit.
AI: How many vehicles are involved?
Caller: Two cars. One person is holding their neck saying it hurts.
AI: Are the vehicles blocking traffic? Is anyone trapped?
Caller: They're in the right lane. No one's trapped but traffic is building up.
AI: Emergency services are being dispatched. Police and ambulance will arrive in approximately 5 minutes.
    `.trim(),
  },
  {
    id: 'crime-medium',
    title: 'Burglary in Progress',
    incident_type: 'crime',
    severity: 'high',
    description: 'Witness reports break-in at neighbor\'s home',
    icon: <Shield className="w-5 h-5" />,
    transcript: `
Caller: I think someone is breaking into my neighbor's house!
AI: What is the address?
Caller: 789 Maple Street. I can see someone at the back door with a flashlight.
AI: Are you in a safe location?
Caller: Yes, I'm in my own house watching from the window.
AI: Can you describe the person?
Caller: Wearing dark clothing, looks like a male, average height. They just went inside.
AI: Police are being dispatched to 789 Maple Street. Stay inside your home and do not approach. Officers should arrive in 3 minutes.
    `.trim(),
  },
  {
    id: 'safety-low',
    title: 'Noise Complaint',
    incident_type: 'public_safety',
    severity: 'low',
    description: 'Loud party disturbing neighborhood',
    icon: <AlertTriangle className="w-5 h-5" />,
    transcript: `
Caller: There's an extremely loud party next door and it's 2 AM.
AI: I understand. What's your address?
Caller: 321 Elm Street. The party is at 323 Elm Street.
AI: How long has this been going on?
Caller: About 3 hours now. Music is blasting and people are yelling in the street.
AI: I'll send an officer to address the noise complaint. They should arrive within 15-20 minutes.
    `.trim(),
  },
];

export default function DemoCallSimulator({ onCallCreated }: { onCallCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('+91 3489270190');
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateCall = async () => {
    const scenario = demoScenarios.find((s) => s.id === selectedScenario);
    if (!scenario) return;

    setIsSimulating(true);

    try {
      // Create the call with full pipeline (Deepgram transcription + AI triage)
      const response = await fetch('/api/calls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          scenario: {
            title: scenario.title,
            description: scenario.description,
            incident_type: scenario.incident_type,
            incident_subtype: scenario.title,
            severity: scenario.severity,
            transcript: scenario.transcript,
            top_emotion: 'distress',
            emotion_intensity: scenario.severity === 'critical' ? 0.87 : 
                              scenario.severity === 'high' ? 0.72 : 
                              scenario.severity === 'medium' ? 0.55 : 0.35,
            caller_condition: scenario.severity === 'critical' ? 'panicked' : 'distressed',
            persons_involved: scenario.severity === 'critical' ? 2 : 1,
            immediate_threats: scenario.severity === 'critical' ? ['active emergency', 'immediate danger'] : [],
            location: 'Rohini Sector 16, New Delhi, India',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create call');
      }

      const data = await response.json();
      console.log('✅ Call created:', data.call.id);

      // Save new call to localStorage
      try {
        const storedCalls = localStorage.getItem('kwik_emergency_calls');
        const existingCalls = storedCalls ? JSON.parse(storedCalls) : [];
        const updatedCalls = [data.call, ...existingCalls];
        localStorage.setItem('kwik_emergency_calls', JSON.stringify(updatedCalls));
        console.log('✅ Call saved to localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }

      // Success - close dialog
      setIsSimulating(false);
      setOpen(false);

      // Show success and refresh dashboard
      alert(`✅ Demo call "${scenario.title}" created successfully!\n\nCall ID: ${data.call.id}\n\nThe new call will appear on the dashboard!`);
      
      // Notify parent to reload calls
      if (onCallCreated) {
        onCallCreated();
      }

    } catch (error) {
      setIsSimulating(false);
      console.error('Demo call simulation error:', error);
      alert('❌ Failed to create demo call. Check console for details.');
    }
  };

  const selectedScenarioData = demoScenarios.find((s) => s.id === selectedScenario);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Phone className="w-4 h-4" />
          Simulate Call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Demo Call Simulator
          </DialogTitle>
          <DialogDescription>
            Create a simulated emergency call for demonstration purposes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Phone Number Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Caller Phone Number</label>
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (415) 555-0000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Phone number will be used for caller identification
            </p>
          </div>

          {/* Scenario Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Emergency Scenario</label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger>
                <SelectValue placeholder="Select a pre-configured scenario" />
              </SelectTrigger>
              <SelectContent>
                {demoScenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    <div className="flex items-center gap-2">
                      {scenario.icon}
                      <span>{scenario.title}</span>
                      <Badge
                        className={`ml-2 ${
                          scenario.severity === 'critical'
                            ? 'bg-red-500'
                            : scenario.severity === 'high'
                            ? 'bg-orange-500'
                            : scenario.severity === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      >
                        {scenario.severity}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Scenario Details */}
          {selectedScenarioData && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  {selectedScenarioData.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{selectedScenarioData.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {selectedScenarioData.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedScenarioData.incident_type.replace('_', ' ')}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        selectedScenarioData.severity === 'critical'
                          ? 'bg-red-500 text-white'
                          : selectedScenarioData.severity === 'high'
                          ? 'bg-orange-500 text-white'
                          : selectedScenarioData.severity === 'medium'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-green-500 text-white'
                      }`}
                    >
                      {selectedScenarioData.severity} severity
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Transcript Preview */}
              <div className="mt-3">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                  Transcript Preview:
                </label>
                <div className="bg-white dark:bg-gray-800 rounded p-3 text-xs font-mono max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {selectedScenarioData.transcript}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Simulation Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What happens when you simulate?
            </h4>
            <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
              <li>✓ New call appears in emergency queue</li>
              <li>✓ Deepgram transcribes voice in real-time</li>
              <li>✓ AI extracts incident details from transcript</li>
              <li>✓ Severity and recommendations generated</li>
              <li>✓ Call appears on map with emotion data</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleSimulateCall}
              disabled={!selectedScenario || !phoneNumber || isSimulating}
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Simulating Call...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Start Simulation
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSimulating}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

