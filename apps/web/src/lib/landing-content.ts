import { Bot, CalendarCheck, FileText, ShieldCheck, type LucideIcon } from 'lucide-react';

// All static landing-page copy and images live here so they are easy to edit.
export const NAV_LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#experts', label: 'Experts' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#contact', label: 'Contact' },
];

export const HERO = {
  eyebrow: 'AI career platform + real experts',
  title: 'Your next role, planned with a co\u2011pilot.',
  text: 'Chat with an AI career assistant, build ATS-friendly resumes in minutes, and book 1:1 sessions with career experts – all in one place.',
  image: 'https://images.unsplash.com/photo-1590650516494-0c8e4a4dd67e?crop=entropy&cs=srgb&fm=jpg&w=1400&q=80',
};

export const STATS = [
  { value: '12k+', label: 'Resumes built' },
  { value: '40k+', label: 'AI conversations' },
  { value: '1.8k', label: 'Expert sessions' },
  { value: '4.9/5', label: 'Average rating' },
];

export const SERVICES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Bot, title: 'AI Career Assistant', text: 'Interview prep, salary negotiation and career-switch plans. Ask anything; every conversation is saved so you can pick it up later.' },
  { icon: FileText, title: 'AI Resume Builder', text: 'Structured sections, AI-written summaries and quantified bullet points. Edit freely, keep version history, export to PDF.' },
  { icon: ShieldCheck, title: 'ATS-Friendly Templates', text: 'Modern Professional and ATS Classic render the same data with clean, semantic HTML that applicant tracking systems can read.' },
  { icon: CalendarCheck, title: 'Expert Consultations', text: 'Pick a consultant and an open slot, pay securely, and get a calendar invite with a meeting link plus an email confirmation.' },
];

export const STEPS = [
  { title: 'Create your free account', text: 'Sign up as a job seeker, or as a consultant if you want to coach others.' },
  { title: 'Talk to the AI assistant', text: 'Get instant, specific advice on your goals, gaps and next steps.' },
  { title: 'Build and polish your resume', text: 'Let AI draft the content, then refine it in the editor and choose a template.' },
  { title: 'Book an expert session', text: 'Go deeper with a 60-minute 1:1 session with an experienced career coach.' },
];
export const STEPS_IMAGE = 'https://images.pexels.com/photos/12903341/pexels-photo-12903341.jpeg?auto=compress&cs=tinysrgb&w=1200';

export const EXPERTS = [
  { name: 'Riya Sharma', role: 'Engineering career coach', tags: ['Interviews', 'Negotiation'], rate: '₹2,500 / hr', image: 'https://images.unsplash.com/photo-1701096374092-bb70915fdc5c?crop=entropy&cs=srgb&fm=jpg&w=600&q=80' },
  { name: 'Arjun Mehta', role: 'Product & leadership coach', tags: ['Product', 'Leadership'], rate: '₹3,500 / hr', image: 'https://images.pexels.com/photos/37148308/pexels-photo-37148308.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { name: 'Vikram Rao', role: 'Career switch specialist', tags: ['Career switch', 'Resumes'], rate: '₹2,000 / hr', image: 'https://images.pexels.com/photos/39974547/pexels-photo-39974547.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

export const TESTIMONIALS = [
  { quote: 'The AI assistant helped me prepare answers for every round, and my resume finally got past the ATS filters. Two offers in a month.', name: 'Sneha Kulkarni', role: 'Frontend Engineer, Pune', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&w=200&q=80' },
  { quote: 'One 60-minute session with an expert changed how I negotiated. I got 22% more than the first offer.', name: 'Karan Malhotra', role: 'Product Manager, Gurugram', image: 'https://images.unsplash.com/photo-1685760259914-ee8d2c92d2e0?crop=entropy&cs=srgb&fm=jpg&w=200&q=80' },
  { quote: 'Switching from QA to development felt impossible. The roadmap from the assistant and my coach made it concrete.', name: 'Ananya Iyer', role: 'Software Developer, Bengaluru', image: 'https://images.unsplash.com/photo-1699899657680-421c2c2d5064?crop=entropy&cs=srgb&fm=jpg&w=200&q=80' },
];

// Sample contact details – replace with your real company information.
export const CONTACT = {
  company: 'CareerPilot Technologies Pvt. Ltd.',
  address: '4th Floor, Galaxy Business Park, Residency Road, Bengaluru, Karnataka 560025, India',
  email: 'hello@careerpilot.dev',
  phone: '+91 80 4567 8900',
};

export const SOCIAL_LINKS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
  { label: 'Twitter', href: 'https://x.com/' },
  { label: 'Instagram', href: 'https://www.instagram.com/' },
  { label: 'YouTube', href: 'https://www.youtube.com/' },
] as const;
