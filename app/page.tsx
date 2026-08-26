/**
 * Pulse112 Landing Page
 * Redirects to dashboard for hackathon demo
 */

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
