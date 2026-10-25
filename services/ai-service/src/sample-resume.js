// Sample data used by the live template preview on the resumes page.
module.exports = {
  personal: {
    fullName: 'Ananya Iyer',
    title: 'Senior Full-Stack Engineer',
    email: 'ananya.iyer@example.com',
    phone: '+91 98450 12345',
    location: 'Bengaluru, India',
    links: [
      { label: 'LinkedIn', url: 'https://linkedin.com/in/ananya-iyer' },
      { label: 'GitHub', url: 'https://github.com/ananya-iyer' },
    ],
  },
  summary:
    '<p>Full-stack engineer with <strong>6 years</strong> of experience building high-traffic MERN applications. Led payment and search platforms serving 2M+ monthly users, with a focus on reliability, performance and mentoring.</p>',
  experience: [
    {
      company: 'Finlytics',
      title: 'Senior Software Engineer',
      location: 'Bengaluru',
      startDate: 'Jan 2022',
      current: true,
      highlights: [
        'Re-architected checkout into services, cutting p95 latency from 900ms to 220ms',
        'Introduced idempotent webhook processing, eliminating duplicate charges',
        'Mentored 5 engineers; ran the frontend guild',
      ],
    },
    {
      company: 'ShopKart',
      title: 'Software Engineer',
      location: 'Pune',
      startDate: 'Jul 2019',
      endDate: 'Dec 2021',
      current: false,
      highlights: ['Built a Redis-backed search cache that reduced MongoDB load by 60%', 'Shipped a React design system used by 4 teams'],
    },
  ],
  education: [{ institution: 'VIT Vellore', degree: 'B.Tech', field: 'Computer Science', startDate: '2015', endDate: '2019', grade: '8.9 CGPA' }],
  skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'Redis', 'Docker', 'AWS'],
  projects: [
    { name: 'OpenSlots', description: 'Open-source booking engine with timezone-aware availability.', url: 'https://github.com/ananya-iyer/openslots', technologies: ['Node.js', 'MongoDB'] },
  ],
  certifications: [{ name: 'AWS Certified Developer – Associate', issuer: 'Amazon Web Services', date: '2023' }],
  achievements: ['Speaker at React India 2024', 'Winner, Finlytics internal hackathon 2023'],
};
