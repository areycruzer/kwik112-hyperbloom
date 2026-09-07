export const VOICE_STATION_HREF = '/dashboard?startCall=1#voice-station';

export function shouldAutoLaunchVoiceStation(search: string, hash: string): boolean {
  const params = new URLSearchParams(search);
  const requestedByQuery = params.get('startCall') === '1';
  const requestedByHash = hash.replace(/^#/, '').toLowerCase() === 'voice-station';

  return requestedByQuery || requestedByHash;
}
